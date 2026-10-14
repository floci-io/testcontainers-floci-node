import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { GenericContainer, Wait } from 'testcontainers';
import * as common from 'oci-common';
import { ObjectStorageClient } from 'oci-objectstorage';
import { FlociOciContainer, StartedFlociOciContainer } from '../../src';
import { OCI_TEST_IMAGE } from './images';

/** Reads an SDK response body, which is a web stream or a Node stream depending on the runtime. */
async function text(body: unknown): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString();
}

describe('Floci OCI (integration)', () => {
  let floci: StartedFlociOciContainer;
  let configDir: string;
  let client: ObjectStorageClient;

  beforeAll(async () => {
    floci = await new FlociOciContainer(OCI_TEST_IMAGE).start();

    // An OCI config file profile and its key file, the way the SDKs and the CLI are usually set up.
    configDir = mkdtempSync(join(tmpdir(), 'floci-oci-'));
    const keyFile = join(configDir, 'floci_key.pem');
    writeFileSync(keyFile, floci.getPrivateKeyPem(), { mode: 0o600 });
    writeFileSync(join(configDir, 'config'), floci.getConfigFileContents(keyFile, 'FLOCI'), { mode: 0o600 });

    client = new ObjectStorageClient({
      authenticationDetailsProvider: new common.ConfigFileAuthenticationDetailsProvider(join(configDir, 'config'), 'FLOCI'),
    });
    client.endpoint = floci.getEndpoint();
  });

  /** A client built from the credentials in memory, signing as `tenancyId`. */
  const inMemoryClient = (tenancyId: string): ObjectStorageClient => {
    const c = new ObjectStorageClient({
      authenticationDetailsProvider: new common.SimpleAuthenticationDetailsProvider(
        tenancyId,
        floci.getUserId(),
        floci.getFingerprint(),
        floci.getPrivateKeyPem(),
        null,
        common.Region.fromRegionId(floci.getRegion()),
      ),
    });
    c.endpoint = floci.getEndpoint();
    return c;
  };

  afterAll(async () => {
    if (configDir) {
      rmSync(configDir, { recursive: true, force: true });
    }
    if (floci) {
      await floci.stop();
    }
  });

  it('starts and answers on its health path', async () => {
    const res = await fetch(`${floci.getEndpoint()}/_floci-oci/health`);
    expect(res.status).toBe(200);
    expect(floci.getMappedPort(FlociOciContainer.PORT)).toBeGreaterThan(0);
  });

  it('reports the namespace the container exposes, to a client set up from the config file', async () => {
    expect((await client.getNamespace({})).value).toBe(floci.getNamespace());
  });

  it('round-trips an object with the OCI SDK', async () => {
    const namespaceName = floci.getNamespace();
    await client.createBucket({
      namespaceName,
      createBucketDetails: { name: 'tc-objects', compartmentId: floci.getTenancyId() },
    });
    await client.putObject({
      namespaceName,
      bucketName: 'tc-objects',
      objectName: 'hello.txt',
      putObjectBody: 'hello floci',
      contentLength: 'hello floci'.length,
    });

    const object = await client.getObject({ namespaceName, bucketName: 'tc-objects', objectName: 'hello.txt' });
    expect(await text(object.value)).toBe('hello floci');
  });

  it('signs requests the emulator can read the tenancy from', async () => {
    // The emulator keeps each tenancy's resources apart and takes the tenancy from the signature;
    // a signature it could not parse would fall back to the default tenancy and see its buckets.
    const namespaceName = floci.getNamespace();
    const mine = inMemoryClient(floci.getTenancyId());
    const other = inMemoryClient('ocid1.tenancy.oc1..flociothertenancy');
    await mine.createBucket({
      namespaceName,
      createBucketDetails: { name: 'tc-tenancy', compartmentId: floci.getTenancyId() },
    });

    const names = async (c: ObjectStorageClient, compartmentId: string) =>
      (await c.listBuckets({ namespaceName, compartmentId })).items.map((b) => b.name);
    expect(await names(mine, floci.getTenancyId())).toContain('tc-tenancy');
    expect(await names(other, floci.getTenancyId())).toEqual([]);
    expect(await names(other, 'ocid1.tenancy.oc1..flociothertenancy')).toEqual([]);
  });

  it('accepts the in-memory credentials, and wipes state on reset()', async () => {
    const inMemory = inMemoryClient(floci.getTenancyId());
    const namespaceName = floci.getNamespace();
    const compartmentId = floci.getTenancyId();
    await inMemory.createBucket({ namespaceName, createBucketDetails: { name: 'before-reset', compartmentId } });
    expect((await inMemory.listBuckets({ namespaceName, compartmentId })).items.map((b) => b.name)).toContain('before-reset');

    await floci.reset();

    expect((await inMemory.listBuckets({ namespaceName, compartmentId })).items).toEqual([]);
    await inMemory.createBucket({ namespaceName, createBucketDetails: { name: 'after-reset', compartmentId } });
  });

  // Known bug in floci-oci 0.4.2: with signatures required it also answers 401 on the paths it
  // documents as exempt (/health, /_floci-oci/...), so a FlociOciContainer set up that way never
  // becomes ready and reset() fails. Not worked around in the library; when the emulator is fixed
  // this test starts passing, which fails the run and says to remove the marker.
  it.failing('answers its health path while signatures are required', async () => {
    const raw = await new GenericContainer(OCI_TEST_IMAGE)
      .withExposedPorts(FlociOciContainer.PORT)
      .withEnvironment({ FLOCI_OCI_AUTH_REQUIRE_SIGNATURE: 'true', FLOCI_OCI_TLS_HTTPS_PORT: '0' })
      .withWaitStrategy(Wait.forLogMessage(/Listening on/))
      .start();
    try {
      const res = await fetch(`http://${raw.getHost()}:${raw.getMappedPort(FlociOciContainer.PORT)}/_floci-oci/health`);
      expect(res.status).toBe(200);
    } finally {
      await raw.stop();
    }
  });

  it('gives each start its own resource namespace', async () => {
    const other = await new FlociOciContainer(OCI_TEST_IMAGE).start();
    try {
      expect(floci.getResourceNamespace()).toMatch(/^tc-[0-9a-f]{8}$/);
      expect(other.getResourceNamespace()).toMatch(/^tc-[0-9a-f]{8}$/);
      expect(other.getResourceNamespace()).not.toBe(floci.getResourceNamespace());
      const env = await other.exec(['printenv', 'FLOCI_OCI_DOCKER_RESOURCE_NAMESPACE']);
      expect(env.output.trim()).toBe(other.getResourceNamespace());
    } finally {
      await other.stop();
    }
  });
});

import { FlociOciContainer, StartedFlociOciContainer, oci } from '../../src';
import { httpsGetOnce } from './https';
import { OCI_TEST_IMAGE } from './images';

describe('Floci OCI with TLS (integration)', () => {
  let floci: StartedFlociOciContainer;
  let firstRequest: Promise<number>;

  beforeAll(async () => {
    floci = await new FlociOciContainer(OCI_TEST_IMAGE).withTlsConfig(new oci.TlsConfig(true)).start();
    // The emulator accepts connections before its HTTPS backend listens; start() must have waited
    // for it, so the very first HTTPS request, sent at once and never retried, has to succeed.
    // The emulator serves its self-signed certificate nowhere, so it is not checked here.
    firstRequest = httpsGetOnce(`${floci.getHttpsEndpoint()}/_floci-oci/health`);
    firstRequest.catch(() => undefined);
  });

  afterAll(async () => {
    if (floci) {
      await floci.stop();
    }
  });

  it('serves HTTPS as soon as start() returns', async () => {
    expect(await firstRequest).toBe(200);
  });

  it('serves the API over HTTPS, and still plain HTTP', async () => {
    expect(await httpsGetOnce(`${floci.getHttpsEndpoint()}/n`)).toBe(200);
    expect((await fetch(`${floci.getEndpoint()}/_floci-oci/health`)).status).toBe(200);
  });
});

import {
  AWS,
  AthenaConfig,
  CodeBuildConfig,
  Ec2Config,
  EcrConfig,
  EcsConfig,
  EksConfig,
  ElastiCacheConfig,
  FlociBaseContainer,
  FlociContainer,
  LambdaConfig,
  NeptuneConfig,
  MskConfig,
  OpenSearchConfig,
  RdsConfig,
  S3Config,
  dockerSocketRequired,
} from '../../src';
import * as services from '../../src/config/services';
import * as awsServices from '../../src/aws/config/services';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { StartedFlociBaseContainer } from '../../src/core';

/** A container with every service that spawns sibling containers disabled. */
const withoutSocketServices = () =>
  new FlociContainer()
    .withAthenaConfig(new AthenaConfig(false))
    .withCodeBuildConfig(new CodeBuildConfig(false))
    .withEc2Config(new Ec2Config(false))
    .withEcrConfig(new EcrConfig(false))
    .withEcsConfig(new EcsConfig(false))
    .withEksConfig(new EksConfig(false))
    .withElastiCacheConfig(new ElastiCacheConfig(false))
    .withLambdaConfig(new LambdaConfig(false))
    .withMskConfig(new MskConfig(false))
    .withNeptuneConfig(new NeptuneConfig(false))
    .withOpenSearchConfig(new OpenSearchConfig(false))
    .withRdsConfig(new RdsConfig(false));

describe('shared core', () => {
  it('builds the AWS container on the core with the AWS descriptor', () => {
    expect(new FlociContainer()).toBeInstanceOf(FlociBaseContainer);
    expect(AWS.port).toBe(FlociContainer.PORT);
  });

  it('keeps the old deep import paths as aliases', () => {
    expect(services.S3Config).toBe(awsServices.S3Config);
    expect(new services.S3Config()).toBeInstanceOf(S3Config);
  });

  it('gives each container a unique, overridable resource namespace', () => {
    const a = new FlociContainer();
    const b = new FlociContainer();
    expect(a.getResourceNamespace()).toMatch(/^tc-[0-9a-f]{8}$/);
    expect(a.getResourceNamespace()).not.toBe(b.getResourceNamespace());
    expect(a.withResourceNamespace('ci-42').getResourceNamespace()).toBe('ci-42');
  });
});

describe('Docker socket detection', () => {
  it('mounts it by default, since container-backed services are enabled by default', () => {
    expect(new FlociContainer().getDockerSocketMount()).toBe('/var/run/docker.sock');
  });

  it('skips it when no container-backed service is enabled', () => {
    expect(withoutSocketServices().getDockerSocketMount()).toBeUndefined();
  });

  it.each(AWS.socketServices.map((s) => s.token))('needs it for %s', (token) => {
    const env = { [`FLOCI_SERVICES_${token}_ENABLED`]: 'true' };
    expect(dockerSocketRequired({ ...AWS, socketServices: AWS.socketServices.filter((s) => s.token === token) }, env)).toBe(true);
  });

  it.each(AWS.socketServices.filter((s) => s.mockable).map((s) => s.token))('does not need it for mocked %s', (token) => {
    const c = withoutSocketServices()
      .withEnv(`FLOCI_SERVICES_${token}_ENABLED`, 'true')
      .withEnv(`FLOCI_SERVICES_${token}_MOCK`, 'true');
    expect(c.getDockerSocketMount()).toBeUndefined();
  });

  it('reads the final env, including raw overrides', () => {
    const c = withoutSocketServices().withEnv('FLOCI_SERVICES_LAMBDA_ENABLED', 'true');
    expect(c.getDockerSocketMount()).toBe('/var/run/docker.sock');
  });

  it('lets the explicit overrides win both ways', () => {
    expect(new FlociContainer().withoutDockerSocket().getDockerSocketMount()).toBeUndefined();
    expect(withoutSocketServices().withDockerSocket('/run/user/1000/docker.sock').getDockerSocketMount())
      .toBe('/run/user/1000/docker.sock');
  });

  describe('at start', () => {
    afterEach(() => jest.restoreAllMocks());

    const mountsAtStart = async (container: FlociContainer) => {
      const mounts = jest.spyOn(GenericContainer.prototype, 'withBindMounts');
      jest.spyOn(GenericContainer.prototype, 'start').mockResolvedValue({} as StartedTestContainer);
      await container.start();
      return mounts.mock.calls[0][0];
    };

    it('does not mount the socket when nothing needs it', async () => {
      expect(await mountsAtStart(withoutSocketServices())).not.toContainEqual(
        expect.objectContaining({ target: '/var/run/docker.sock' }),
      );
    });
  });
});

describe('reset()', () => {
  afterEach(() => jest.restoreAllMocks());

  const started = (descriptor = AWS) =>
    new StartedFlociBaseContainer(
      { getHost: () => 'localhost', getMappedPort: () => 32768 } as unknown as StartedTestContainer,
      descriptor,
    );

  it('POSTs to the cloud reset path on the emulator endpoint', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    await started().reset();
    expect(fetch).toHaveBeenCalledWith('http://localhost:32768/_floci/state/reset', { method: 'POST' });
  });

  it('fails when the emulator rejects the reset', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 400 }));
    await expect(started().reset()).rejects.toThrow('state reset failed with HTTP 400');
  });

  it('fails for a cloud without a reset path, without calling the emulator', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch');
    await expect(started({ ...AWS, resetPath: undefined }).reset()).rejects.toThrow('has no state reset');
    expect(fetch).not.toHaveBeenCalled();
  });
});

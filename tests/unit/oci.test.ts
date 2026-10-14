import { createPrivateKey } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import {
  FlociBaseContainer,
  FlociOciContainer,
  OCI,
  StartedFlociOciContainer,
  dockerSocketRequired,
  networkEnv,
  oci,
  resourceNamespaceEnv,
} from '../../src';

const SOCKET = '/var/run/docker.sock';
const TENANCY = 'ocid1.tenancy.oc1..flocilocaltenancy0000000000000000000000000000000000000000';
const USER = 'ocid1.user.oc1..flocilocaluser0000000000000000000000000000000000000000000000';
const FINGERPRINT = 'aa:bb:cc:dd:ee:ff:00:11:22:33:44:55:66:77:88:99';

/** Every emulator service: token, and the mock switch's default where the service has one. */
const SERVICES: ReadonlyArray<readonly [token: string, mockByDefault?: boolean]> = [
  ['FUNCTIONS', false], ['IDENTITY'], ['KMS'], ['OBJECTSTORAGE'], ['OKE', false], ['QUEUE'], ['STREAMING'], ['VAULT'],
];
const SOCKET_TOKENS = ['FUNCTIONS', 'OKE'];

const env = (c: FlociOciContainer) => (c as unknown as { envVars: Record<string, string> }).envVars;

/** A container with every service that needs the socket by default mocked. */
const withoutSocketServices = () =>
  new FlociOciContainer()
    .withFunctionsConfig(new oci.FunctionsConfig(true, true))
    .withOkeConfig(new oci.OkeConfig(true, true));

describe('OCI descriptor', () => {
  it('describes the floci-oci emulator', () => {
    expect(OCI).toMatchObject({
      name: 'oci',
      defaultImage: 'floci/floci-oci:latest',
      port: 4599,
      envPrefix: 'FLOCI_OCI_',
      healthPath: '/_floci-oci/health',
      resetPath: '/_floci-oci/state/reset',
      logLevelEnv: 'QUARKUS_LOG_CATEGORY__IO_FLOCI_OCI__LEVEL',
    });
    expect(OCI.mockSetting).toBeUndefined();
    expect(networkEnv(OCI)).toBe('FLOCI_OCI_SERVICES_DOCKER_NETWORK');
    expect(resourceNamespaceEnv(OCI)).toBe('FLOCI_OCI_DOCKER_RESOURCE_NAMESPACE');
  });

  it('pins its test image once, in .github/docker-images.txt', () => {
    const pins = readFileSync(join(__dirname, '..', '..', '.github', 'docker-images.txt'), 'utf8');
    expect(pins.split('\n').filter((line) => line.startsWith('floci/floci-oci:'))).toHaveLength(1);
  });
});

describe('FlociOciContainer', () => {
  it('is built on the shared core and exported from the entry point and the oci namespace', () => {
    expect(new FlociOciContainer()).toBeInstanceOf(FlociBaseContainer);
    expect(oci.FlociOciContainer).toBe(FlociOciContainer);
    expect(FlociOciContainer.PORT).toBe(OCI.port);
  });

  it('sets the defaults every OCI container needs, which the caller can override', () => {
    const c = new FlociOciContainer();
    expect(env(c)).toMatchObject({
      FLOCI_OCI_TLS_HTTPS_PORT: '0',
      FLOCI_OCI_TLS_ENABLED: 'false',
      QUARKUS_LOG_CATEGORY__IO_FLOCI_OCI__LEVEL: 'WARN',
    });
    expect(c.withEnv('FLOCI_OCI_TLS_HTTPS_PORT', '8443')).toBe(c);
    expect(env(c).FLOCI_OCI_TLS_HTTPS_PORT).toBe('8443');
  });

  it('uses the emulator identities unless others are set', () => {
    const c = new FlociOciContainer();
    expect([c.getRegion(), c.getTenancyId(), c.getNamespace()]).toEqual(['us-ashburn-1', TENANCY, 'floci-local']);
    expect(FlociOciContainer.DEFAULT_REALM).toBe('oc1');
    expect(Object.keys(env(c)).filter((key) => key.startsWith('FLOCI_OCI_DEFAULT_'))).toEqual([]);

    expect(c.withRegion('eu-frankfurt-1').withTenancyId('ocid1.tenancy.oc1..mine').withNamespace('my-ns')).toBe(c);
    expect(env(c)).toMatchObject({
      FLOCI_OCI_DEFAULT_REGION: 'eu-frankfurt-1',
      FLOCI_OCI_DEFAULT_TENANCY_ID: 'ocid1.tenancy.oc1..mine',
      FLOCI_OCI_DEFAULT_NAMESPACE: 'my-ns',
    });
    expect([c.getRegion(), c.getTenancyId(), c.getNamespace()]).toEqual(['eu-frankfurt-1', 'ocid1.tenancy.oc1..mine', 'my-ns']);
  });

  it('gives each container a unique, overridable resource namespace', () => {
    const a = new FlociOciContainer();
    expect(a.getResourceNamespace()).toMatch(/^tc-[0-9a-f]{8}$/);
    expect(env(a).FLOCI_OCI_DOCKER_RESOURCE_NAMESPACE).toBe(a.getResourceNamespace());
    expect(a.getResourceNamespace()).not.toBe(new FlociOciContainer().getResourceNamespace());
    expect(a.withResourceNamespace('ci-42').getResourceNamespace()).toBe('ci-42');
  });

  it('names the dedicated network and the log level with the OCI keys', () => {
    const c = new FlociOciContainer().withDedicatedNetwork().withLogLevel('DEBUG');
    expect(env(c).FLOCI_OCI_SERVICES_DOCKER_NETWORK).toBe(c.getDedicatedNetworkName());
    expect(env(c).QUARKUS_LOG_CATEGORY__IO_FLOCI_OCI__LEVEL).toBe('DEBUG');
  });

  it('has one config per emulator service', () => {
    expect(new FlociOciContainer().getServiceConfigs().map((cfg) => cfg.token).sort())
      .toEqual(SERVICES.map(([token]) => token).sort());
  });

  it.each(SERVICES.map(([token, mockByDefault]) => ({ token, mockByDefault })))(
    'enables $token by default, with its mock default',
    ({ token, mockByDefault }) => {
      const e = env(new FlociOciContainer());
      expect(e[`FLOCI_OCI_SERVICES_${token}_ENABLED`]).toBe('true');
      expect(e[`FLOCI_OCI_SERVICES_${token}_MOCK`]).toBe(mockByDefault === undefined ? undefined : String(mockByDefault));
    },
  );
});

describe('OCI service configs', () => {
  const written = (cfg: oci.ServiceConfig) => {
    const out: Record<string, string> = {};
    cfg.applyEnvVarsTo({ withEnv: (k, v) => (out[k] = v), withExposedPort: () => undefined });
    return out;
  };

  it('writes only ENABLED for a disabled service', () => {
    expect(written(new oci.ObjectStorageConfig(false))).toEqual({ FLOCI_OCI_SERVICES_OBJECTSTORAGE_ENABLED: 'false' });
    expect(written(new oci.OkeConfig(false, true))).toEqual({ FLOCI_OCI_SERVICES_OKE_ENABLED: 'false' });
  });

  it('writes the mock switch of an enabled service', () => {
    expect(written(new oci.FunctionsConfig())).toEqual({
      FLOCI_OCI_SERVICES_FUNCTIONS_ENABLED: 'true',
      FLOCI_OCI_SERVICES_FUNCTIONS_MOCK: 'false',
    });
    expect(written(new oci.FunctionsConfig(true, true)).FLOCI_OCI_SERVICES_FUNCTIONS_MOCK).toBe('true');
    expect(written(new oci.QueueConfig())).toEqual({ FLOCI_OCI_SERVICES_QUEUE_ENABLED: 'true' });
  });

  it('writes TLS settings only when TLS is enabled, with no extra HTTPS port by default', () => {
    expect(written(new oci.TlsConfig())).toEqual({ FLOCI_OCI_TLS_ENABLED: 'false' });
    expect(written(new oci.TlsConfig(true))).toEqual({
      FLOCI_OCI_TLS_ENABLED: 'true',
      FLOCI_OCI_TLS_SELF_SIGNED: 'true',
      FLOCI_OCI_TLS_HTTPS_PORT: '0',
    });
    expect(written(new oci.TlsConfig(true, false, '/certs/tls.crt', '/certs/tls.key', 8443))).toEqual({
      FLOCI_OCI_TLS_ENABLED: 'true',
      FLOCI_OCI_TLS_SELF_SIGNED: 'false',
      FLOCI_OCI_TLS_CERT_PATH: '/certs/tls.crt',
      FLOCI_OCI_TLS_KEY_PATH: '/certs/tls.key',
      FLOCI_OCI_TLS_HTTPS_PORT: '8443',
    });
  });

  it('applies configs through the container, returning it for chaining', () => {
    const c = new FlociOciContainer();
    const cfg = new oci.QueueConfig(false);
    expect(c.withQueueConfig(cfg)).toBe(c);
    expect(c.getQueueConfig()).toBe(cfg);
    expect(env(c).FLOCI_OCI_SERVICES_QUEUE_ENABLED).toBe('false');
    expect(c.withTlsConfig(new oci.TlsConfig(true)).getTlsConfig().enabled).toBe(true);
    expect(env(c).FLOCI_OCI_TLS_ENABLED).toBe('true');
  });

  it('tolerates repeated application and drops what an earlier config set', () => {
    const c = new FlociOciContainer()
      .withOkeConfig(new oci.OkeConfig(true, true))
      .withOkeConfig(new oci.OkeConfig(true, true));
    expect(env(c).FLOCI_OCI_SERVICES_OKE_MOCK).toBe('true');

    c.withOkeConfig(new oci.OkeConfig(false));
    expect(env(c).FLOCI_OCI_SERVICES_OKE_ENABLED).toBe('false');
    expect(env(c).FLOCI_OCI_SERVICES_OKE_MOCK).toBeUndefined();
  });

  it('falls back to the descriptor default when a config that wrote the key is replaced', () => {
    const c = new FlociOciContainer().withTlsConfig(new oci.TlsConfig(true)).withTlsConfig(new oci.TlsConfig(false));
    expect(env(c).FLOCI_OCI_TLS_HTTPS_PORT).toBe('0');
    // TLS switched on with raw env later must not start on the emulator's 443 default.
    expect(env(c.withEnv('FLOCI_OCI_TLS_ENABLED', 'true')).FLOCI_OCI_TLS_HTTPS_PORT).toBe('0');

    const custom = new FlociOciContainer()
      .withTlsConfig(new oci.TlsConfig(true, true, undefined, undefined, 8443))
      .withTlsConfig(new oci.TlsConfig(false));
    expect(env(custom).FLOCI_OCI_TLS_HTTPS_PORT).toBe('0');
  });

  it('keeps a caller override of a defaulted key when its config is replaced', () => {
    const c = new FlociOciContainer()
      .withTlsConfig(new oci.TlsConfig(true))
      .withEnv('FLOCI_OCI_TLS_HTTPS_PORT', '8443')
      .withTlsConfig(new oci.TlsConfig(false));
    expect(env(c).FLOCI_OCI_TLS_HTTPS_PORT).toBe('8443');
  });

  it('still removes a config-only key, which has no descriptor default', () => {
    const c = new FlociOciContainer().withTlsConfig(new oci.TlsConfig(true)).withTlsConfig(new oci.TlsConfig(false));
    expect(env(c).FLOCI_OCI_TLS_SELF_SIGNED).toBeUndefined();
    expect(env(c).FLOCI_OCI_TLS_ENABLED).toBe('false');
  });

  it('keeps a setting the caller set with withEnv after the config', () => {
    const c = new FlociOciContainer()
      .withOkeConfig(new oci.OkeConfig(true, false))
      .withEnv('FLOCI_OCI_SERVICES_OKE_MOCK', 'true')
      .withOkeConfig(new oci.OkeConfig(false));
    expect(env(c).FLOCI_OCI_SERVICES_OKE_MOCK).toBe('true');
  });
});

describe('OCI Docker socket detection', () => {
  it('mounts it by default, since container-backed services are enabled by default', () => {
    expect(new FlociOciContainer().getDockerSocketMount()).toBe(SOCKET);
  });

  it('needs it by default for exactly the container-backed services', () => {
    const byDefault = new FlociOciContainer().getServiceConfigs().filter((cfg) => cfg.requiresDockerSocket());
    expect(byDefault.map((cfg) => cfg.token).sort()).toEqual(SOCKET_TOKENS);
  });

  it('skips it when every container-backed service is mocked or disabled', () => {
    expect(withoutSocketServices().getDockerSocketMount()).toBeUndefined();
    const disabled = new FlociOciContainer()
      .withFunctionsConfig(new oci.FunctionsConfig(false))
      .withOkeConfig(new oci.OkeConfig(false));
    expect(disabled.getDockerSocketMount()).toBeUndefined();
  });

  it.each(SOCKET_TOKENS)('needs it for %s unless mocked or disabled', (token) => {
    const only = { ...OCI, socketServices: OCI.socketServices.filter((s) => s.token === token) };
    expect(dockerSocketRequired(only, {})).toBe(true);
    expect(dockerSocketRequired(only, { [`FLOCI_OCI_SERVICES_${token}_MOCK`]: 'true' })).toBe(false);
    expect(dockerSocketRequired(only, { [`FLOCI_OCI_SERVICES_${token}_ENABLED`]: 'false' })).toBe(false);
  });

  it('lets the explicit overrides win both ways', () => {
    expect(new FlociOciContainer().withoutDockerSocket().getDockerSocketMount()).toBeUndefined();
    expect(withoutSocketServices().withDockerSocket('/run/user/1000/docker.sock').getDockerSocketMount())
      .toBe('/run/user/1000/docker.sock');
  });

  describe('socket table', () => {
    const variants: oci.OciServiceConfig[] = [true, false].flatMap((enabled) => [true, false].flatMap((mock) => [
      new oci.FunctionsConfig(enabled, mock), new oci.OkeConfig(enabled, mock),
    ]));

    it('covers every config that declares a socket need', () => {
      const declaring = new FlociOciContainer().getServiceConfigs()
        .filter((cfg) => cfg.requiresDockerSocket !== oci.OciServiceConfig.prototype.requiresDockerSocket)
        .map((cfg) => cfg.token);
      expect(declaring.sort()).toEqual(OCI.socketServices.map((s) => s.token).sort());
    });

    it('agrees with requiresDockerSocket() of every config, from the env the config writes', () => {
      for (const cfg of variants) {
        const out: Record<string, string> = {};
        cfg.applyEnvVarsTo({ withEnv: (k, v) => (out[k] = v), withExposedPort: () => undefined });
        const only = { ...OCI, socketServices: OCI.socketServices.filter((s) => s.token === cfg.token) };
        expect([cfg.token, JSON.stringify(out), dockerSocketRequired(only, out)])
          .toEqual([cfg.token, JSON.stringify(out), cfg.requiresDockerSocket()]);
      }
    });
  });

  it('mounts the socket at start only when something needs it', async () => {
    const mounts = jest.spyOn(GenericContainer.prototype, 'withBindMounts');
    jest.spyOn(GenericContainer.prototype, 'start').mockResolvedValue({} as StartedTestContainer);
    await withoutSocketServices().start();
    await new FlociOciContainer().start();
    expect(mounts.mock.calls[0][0]).toEqual([]);
    expect(mounts.mock.calls[1][0]).toEqual([{ source: SOCKET, target: SOCKET, mode: 'rw' }]);
    jest.restoreAllMocks();
  });
});

describe('StartedFlociOciContainer', () => {
  afterEach(() => jest.restoreAllMocks());

  const started = (opts: { region?: string; tenancyId?: string; namespace?: string } = {}) =>
    new StartedFlociOciContainer(
      { getHost: () => 'localhost', getMappedPort: () => 32768 } as unknown as StartedTestContainer,
      { resourceNamespace: 'tc-0a1b2c3d', ...opts },
    );

  it('exposes the endpoints and the identities', () => {
    const c = started();
    expect(c.getEndpoint()).toBe('http://localhost:32768');
    expect(c.getHttpsEndpoint()).toBe('https://localhost:32768');
    expect(c.getRegion()).toBe('us-ashburn-1');
    expect(c.getTenancyId()).toBe(TENANCY);
    expect(c.getNamespace()).toBe('floci-local');
    expect(c.getUserId()).toBe(USER);
    expect(c.getFingerprint()).toBe(FINGERPRINT);
    expect(c.getResourceNamespace()).toBe('tc-0a1b2c3d');
  });

  it('passes the configured identities from the builder to the started container', async () => {
    jest.spyOn(GenericContainer.prototype, 'start').mockResolvedValue({} as StartedTestContainer);
    const c = await new FlociOciContainer()
      .withRegion('eu-frankfurt-1')
      .withTenancyId('ocid1.tenancy.oc1..mine')
      .withNamespace('my-ns')
      .start();
    expect([c.getRegion(), c.getTenancyId(), c.getNamespace()]).toEqual(['eu-frankfurt-1', 'ocid1.tenancy.oc1..mine', 'my-ns']);
  });

  it('generates one throwaway RSA key per container', () => {
    const c = started();
    const pem = c.getPrivateKeyPem();
    expect(pem).toMatch(/^-----BEGIN RSA PRIVATE KEY-----\n[\s\S]+\n-----END RSA PRIVATE KEY-----\n$/);
    const key = createPrivateKey(pem);
    expect(key.asymmetricKeyType).toBe('rsa');
    expect(key.asymmetricKeyDetails?.modulusLength).toBe(2048);
    expect(c.getPrivateKeyPem()).toBe(pem);
    expect(started().getPrivateKeyPem()).not.toBe(pem);
  });

  it('hands out a private key supplied to the builder instead of generating one', async () => {
    jest.spyOn(GenericContainer.prototype, 'start').mockResolvedValue({} as StartedTestContainer);
    const c = new FlociOciContainer();
    expect(c.withPrivateKeyPem('-----BEGIN RSA PRIVATE KEY-----\nmine\n')).toBe(c);
    expect((await c.start()).getPrivateKeyPem()).toBe('-----BEGIN RSA PRIVATE KEY-----\nmine\n');
    expect(() => new FlociOciContainer().withPrivateKeyPem(' ')).toThrow('must not be empty');
  });

  it('builds an OCI config file profile', () => {
    expect(started().getConfigFileContents('/home/me/.oci/floci_key.pem')).toBe(
      `[DEFAULT]\nuser=${USER}\nfingerprint=${FINGERPRINT}\ntenancy=${TENANCY}\nregion=us-ashburn-1\n` +
        'key_file=/home/me/.oci/floci_key.pem\n',
    );
    expect(started({ region: 'eu-frankfurt-1', tenancyId: 'ocid1.tenancy.oc1..mine' }).getConfigFileContents('k.pem', 'FLOCI'))
      .toBe(`[FLOCI]\nuser=${USER}\nfingerprint=${FINGERPRINT}\ntenancy=ocid1.tenancy.oc1..mine\nregion=eu-frankfurt-1\nkey_file=k.pem\n`);
  });

  it('waits for HTTPS health too once TLS is enabled', async () => {
    const wait = jest.spyOn(GenericContainer.prototype, 'withWaitStrategy');
    jest.spyOn(GenericContainer.prototype, 'start').mockResolvedValue({} as StartedTestContainer);
    const probes = async (c: FlociOciContainer) => {
      wait.mockClear();
      await c.start();
      const strategy = wait.mock.calls[0][0] as unknown as { waitStrategies?: unknown[] };
      return (strategy.waitStrategies ?? [strategy]).map((p) => {
        const probe = p as { protocol: string; path: string; port: number };
        return `${probe.protocol}:${probe.port}${probe.path}`;
      });
    };
    expect(await probes(new FlociOciContainer())).toEqual(['http:4599/_floci-oci/health']);
    expect(await probes(new FlociOciContainer().withTlsConfig(new oci.TlsConfig(true))))
      .toEqual(['http:4599/_floci-oci/health', 'https:4599/_floci-oci/health']);
  });

  it('resets state with POST /_floci-oci/state/reset', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"status":"OK"}'));
    await started().reset();
    expect(fetch).toHaveBeenCalledWith('http://localhost:32768/_floci-oci/state/reset', { method: 'POST' });
  });
});

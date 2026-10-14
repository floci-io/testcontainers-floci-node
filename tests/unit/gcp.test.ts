import { readFileSync } from 'fs';
import { join } from 'path';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import {
  FlociBaseContainer,
  FlociGcpContainer,
  GCP,
  StartedFlociGcpContainer,
  dockerSocketRequired,
  gcp,
  networkEnv,
  resourceNamespaceEnv,
} from '../../src';

const SOCKET = '/var/run/docker.sock';

/** Every emulator service: token, and the mock switch's default where the service has one. */
const SERVICES: ReadonlyArray<readonly [token: string, mockByDefault?: boolean]> = [
  ['BIGQUERY', false], ['CLOUDFUNCTIONS'], ['CLOUDRUN', false], ['CLOUDSQL', false], ['CLOUDTASKS'], ['COMPUTE'],
  ['DATASTORE'], ['EVENTARC'], ['FIREBASEAUTH'], ['FIRESTORE'], ['GCS'], ['GKE', false], ['IAM'],
  ['IAMCREDENTIALS'], ['KAFKA', false], ['KMS'], ['LOGGING'], ['MONITORING'], ['PUBSUB'], ['RESOURCEMANAGER'],
  ['SCHEDULER'], ['SECRETMANAGER'], ['SERVICEUSAGE'], ['STS'],
];
const SOCKET_TOKENS = ['BIGQUERY', 'CLOUDRUN', 'CLOUDSQL', 'GKE', 'KAFKA'];

const env = (c: FlociGcpContainer) => (c as unknown as { envVars: Record<string, string> }).envVars;

/** A container with every service that needs the socket by default mocked. */
const withoutSocketServices = () =>
  new FlociGcpContainer()
    .withBigQueryConfig(new gcp.BigQueryConfig(true, true))
    .withCloudRunConfig(new gcp.CloudRunConfig(true, true))
    .withCloudSqlConfig(new gcp.CloudSqlConfig(true, true))
    .withGkeConfig(new gcp.GkeConfig(true, true))
    .withKafkaConfig(new gcp.KafkaConfig(true, true));

describe('GCP descriptor', () => {
  it('describes the floci-gcp emulator', () => {
    expect(GCP).toMatchObject({
      name: 'gcp',
      defaultImage: 'floci/floci-gcp:latest',
      port: 4588,
      envPrefix: 'FLOCI_GCP_',
      healthPath: '/_floci-gcp/health',
      resetPath: '/_floci-gcp/state/reset',
      logLevelEnv: 'QUARKUS_LOG_CATEGORY__IO_FLOCI_GCP__LEVEL',
    });
    expect(GCP.mockSetting).toBeUndefined();
    expect(networkEnv(GCP)).toBe('FLOCI_GCP_SERVICES_DOCKER_NETWORK');
    expect(resourceNamespaceEnv(GCP)).toBe('FLOCI_GCP_DOCKER_RESOURCE_NAMESPACE');
  });

  it('pins its test image once, in .github/docker-images.txt', () => {
    const pins = readFileSync(join(__dirname, '..', '..', '.github', 'docker-images.txt'), 'utf8');
    expect(pins.split('\n').filter((line) => line.startsWith('floci/floci-gcp:'))).toHaveLength(1);
  });
});

describe('FlociGcpContainer', () => {
  it('is built on the shared core and exported from the entry point and the gcp namespace', () => {
    expect(new FlociGcpContainer()).toBeInstanceOf(FlociBaseContainer);
    expect(gcp.FlociGcpContainer).toBe(FlociGcpContainer);
    expect(FlociGcpContainer.PORT).toBe(GCP.port);
  });

  it('sets the defaults every GCP container needs, which the caller can override', () => {
    const c = new FlociGcpContainer();
    expect(env(c)).toMatchObject({
      FLOCI_GCP_TLS_HTTPS_PORT: '0',
      FLOCI_GCP_TLS_ENABLED: 'false',
      QUARKUS_LOG_CATEGORY__IO_FLOCI_GCP__LEVEL: 'WARN',
    });
    // The emulator's default, `host`, already advertises a host-reachable cluster endpoint.
    expect(env(c).FLOCI_GCP_SERVICES_GKE_ENDPOINT_MODE).toBeUndefined();
    expect(c.withEnv('FLOCI_GCP_TLS_HTTPS_PORT', '8443')).toBe(c);
    expect(env(c).FLOCI_GCP_TLS_HTTPS_PORT).toBe('8443');
  });

  it('uses the project floci-local unless another is set', () => {
    const c = new FlociGcpContainer();
    expect(c.getProjectId()).toBe('floci-local');
    expect(env(c).FLOCI_GCP_DEFAULT_PROJECT_ID).toBeUndefined();
    expect(c.withProjectId('my-project')).toBe(c);
    expect(env(c).FLOCI_GCP_DEFAULT_PROJECT_ID).toBe('my-project');
    expect(c.getProjectId()).toBe('my-project');
  });

  it('gives each container a unique, overridable resource namespace', () => {
    const a = new FlociGcpContainer();
    expect(a.getResourceNamespace()).toMatch(/^tc-[0-9a-f]{8}$/);
    expect(env(a).FLOCI_GCP_DOCKER_RESOURCE_NAMESPACE).toBe(a.getResourceNamespace());
    expect(a.getResourceNamespace()).not.toBe(new FlociGcpContainer().getResourceNamespace());
    expect(a.withResourceNamespace('ci-42').getResourceNamespace()).toBe('ci-42');
  });

  it('names the dedicated network and the log level with the GCP keys', () => {
    const c = new FlociGcpContainer().withDedicatedNetwork().withLogLevel('DEBUG');
    expect(env(c).FLOCI_GCP_SERVICES_DOCKER_NETWORK).toBe(c.getDedicatedNetworkName());
    expect(env(c).QUARKUS_LOG_CATEGORY__IO_FLOCI_GCP__LEVEL).toBe('DEBUG');
  });

  it('has one config per emulator service', () => {
    expect(new FlociGcpContainer().getServiceConfigs().map((cfg) => cfg.token).sort())
      .toEqual(SERVICES.map(([token]) => token).sort());
  });

  it.each(SERVICES.map(([token, mockByDefault]) => ({ token, mockByDefault })))(
    'enables $token by default, with its mock default',
    ({ token, mockByDefault }) => {
      const e = env(new FlociGcpContainer());
      expect(e[`FLOCI_GCP_SERVICES_${token}_ENABLED`]).toBe('true');
      expect(e[`FLOCI_GCP_SERVICES_${token}_MOCK`]).toBe(mockByDefault === undefined ? undefined : String(mockByDefault));
    },
  );
});

describe('GCP service configs', () => {
  const written = (cfg: gcp.ServiceConfig) => {
    const out: Record<string, string> = {};
    cfg.applyEnvVarsTo({ withEnv: (k, v) => (out[k] = v), withExposedPort: () => undefined });
    return out;
  };

  it('writes only ENABLED for a disabled service', () => {
    expect(written(new gcp.GcsConfig(false))).toEqual({ FLOCI_GCP_SERVICES_GCS_ENABLED: 'false' });
    expect(written(new gcp.GkeConfig(false, true))).toEqual({ FLOCI_GCP_SERVICES_GKE_ENABLED: 'false' });
  });

  it('writes the mock switch of an enabled service', () => {
    expect(written(new gcp.CloudSqlConfig())).toEqual({
      FLOCI_GCP_SERVICES_CLOUDSQL_ENABLED: 'true',
      FLOCI_GCP_SERVICES_CLOUDSQL_MOCK: 'false',
    });
    expect(written(new gcp.CloudSqlConfig(true, true)).FLOCI_GCP_SERVICES_CLOUDSQL_MOCK).toBe('true');
    expect(written(new gcp.PubSubConfig())).toEqual({ FLOCI_GCP_SERVICES_PUBSUB_ENABLED: 'true' });
    expect(written(new gcp.CloudFunctionsConfig())).toEqual({ FLOCI_GCP_SERVICES_CLOUDFUNCTIONS_ENABLED: 'true' });
  });

  it('writes TLS settings only when TLS is enabled, with no extra HTTPS port by default', () => {
    expect(written(new gcp.TlsConfig())).toEqual({ FLOCI_GCP_TLS_ENABLED: 'false' });
    expect(written(new gcp.TlsConfig(true))).toEqual({
      FLOCI_GCP_TLS_ENABLED: 'true',
      FLOCI_GCP_TLS_SELF_SIGNED: 'true',
      FLOCI_GCP_TLS_HTTPS_PORT: '0',
    });
    expect(written(new gcp.TlsConfig(true, false, '/certs/tls.crt', '/certs/tls.key', 8443))).toEqual({
      FLOCI_GCP_TLS_ENABLED: 'true',
      FLOCI_GCP_TLS_SELF_SIGNED: 'false',
      FLOCI_GCP_TLS_CERT_PATH: '/certs/tls.crt',
      FLOCI_GCP_TLS_KEY_PATH: '/certs/tls.key',
      FLOCI_GCP_TLS_HTTPS_PORT: '8443',
    });
  });

  it('applies configs through the container, returning it for chaining', () => {
    const c = new FlociGcpContainer();
    const cfg = new gcp.PubSubConfig(false);
    expect(c.withPubSubConfig(cfg)).toBe(c);
    expect(c.getPubSubConfig()).toBe(cfg);
    expect(env(c).FLOCI_GCP_SERVICES_PUBSUB_ENABLED).toBe('false');
    expect(c.withTlsConfig(new gcp.TlsConfig(true)).getTlsConfig().enabled).toBe(true);
    expect(env(c).FLOCI_GCP_TLS_ENABLED).toBe('true');
  });

  it('tolerates repeated application and drops what an earlier config set', () => {
    const c = new FlociGcpContainer()
      .withKafkaConfig(new gcp.KafkaConfig(true, true))
      .withKafkaConfig(new gcp.KafkaConfig(true, true));
    expect(env(c).FLOCI_GCP_SERVICES_KAFKA_MOCK).toBe('true');

    c.withKafkaConfig(new gcp.KafkaConfig(false));
    expect(env(c).FLOCI_GCP_SERVICES_KAFKA_ENABLED).toBe('false');
    expect(env(c).FLOCI_GCP_SERVICES_KAFKA_MOCK).toBeUndefined();
  });

  it('falls back to the descriptor default when a config that wrote the key is replaced', () => {
    const c = new FlociGcpContainer().withTlsConfig(new gcp.TlsConfig(true)).withTlsConfig(new gcp.TlsConfig(false));
    expect(env(c).FLOCI_GCP_TLS_HTTPS_PORT).toBe('0');
    // TLS switched on with raw env later must not start on the emulator's 443 default.
    expect(env(c.withEnv('FLOCI_GCP_TLS_ENABLED', 'true')).FLOCI_GCP_TLS_HTTPS_PORT).toBe('0');

    const custom = new FlociGcpContainer()
      .withTlsConfig(new gcp.TlsConfig(true, true, undefined, undefined, 8443))
      .withTlsConfig(new gcp.TlsConfig(false));
    expect(env(custom).FLOCI_GCP_TLS_HTTPS_PORT).toBe('0');
  });

  it('keeps a caller override of a defaulted key when its config is replaced', () => {
    const c = new FlociGcpContainer()
      .withTlsConfig(new gcp.TlsConfig(true))
      .withEnv('FLOCI_GCP_TLS_HTTPS_PORT', '8443')
      .withTlsConfig(new gcp.TlsConfig(false));
    expect(env(c).FLOCI_GCP_TLS_HTTPS_PORT).toBe('8443');
  });

  it('still removes a config-only key, which has no descriptor default', () => {
    const c = new FlociGcpContainer().withTlsConfig(new gcp.TlsConfig(true)).withTlsConfig(new gcp.TlsConfig(false));
    expect(env(c).FLOCI_GCP_TLS_SELF_SIGNED).toBeUndefined();
    expect(env(c).FLOCI_GCP_TLS_ENABLED).toBe('false');
  });

  it('keeps a setting the caller set with withEnv after the config', () => {
    const c = new FlociGcpContainer()
      .withGkeConfig(new gcp.GkeConfig(true, false))
      .withEnv('FLOCI_GCP_SERVICES_GKE_MOCK', 'true')
      .withGkeConfig(new gcp.GkeConfig(false));
    expect(env(c).FLOCI_GCP_SERVICES_GKE_MOCK).toBe('true');
  });
});

describe('GCP Docker socket detection', () => {
  it('mounts it by default, since container-backed services are enabled by default', () => {
    expect(new FlociGcpContainer().getDockerSocketMount()).toBe(SOCKET);
  });

  it('needs it by default for exactly the container-backed services', () => {
    const byDefault = new FlociGcpContainer().getServiceConfigs().filter((cfg) => cfg.requiresDockerSocket());
    expect(byDefault.map((cfg) => cfg.token).sort()).toEqual(SOCKET_TOKENS);
  });

  it('skips it when every container-backed service is mocked or disabled', () => {
    expect(withoutSocketServices().getDockerSocketMount()).toBeUndefined();
    const disabled = new FlociGcpContainer();
    for (const svc of GCP.socketServices) {
      disabled.withEnv(`FLOCI_GCP_SERVICES_${svc.token}_ENABLED`, 'false');
    }
    expect(disabled.getDockerSocketMount()).toBeUndefined();
  });

  it.each(SOCKET_TOKENS)('needs it for %s unless mocked or disabled', (token) => {
    const only = { ...GCP, socketServices: GCP.socketServices.filter((s) => s.token === token) };
    expect(dockerSocketRequired(only, {})).toBe(true);
    expect(dockerSocketRequired(only, { [`FLOCI_GCP_SERVICES_${token}_MOCK`]: 'true' })).toBe(false);
    expect(dockerSocketRequired(only, { [`FLOCI_GCP_SERVICES_${token}_ENABLED`]: 'false' })).toBe(false);
  });

  it('reads the GCP mock switch, MOCK, not MOCKED', () => {
    const c = new FlociGcpContainer();
    for (const token of SOCKET_TOKENS) {
      c.withEnv(`FLOCI_GCP_SERVICES_${token}_MOCKED`, 'true');
    }
    expect(c.getDockerSocketMount()).toBe(SOCKET);
  });

  it('does not need it for Cloud Functions, which runs no containers', () => {
    expect(new gcp.CloudFunctionsConfig().requiresDockerSocket()).toBe(false);
    expect(GCP.socketServices.map((s) => s.token)).not.toContain('CLOUDFUNCTIONS');
  });

  it('does not need it for BigQuery pointed at a DuckDB sidecar that already runs', () => {
    const c = new FlociGcpContainer()
      .withCloudRunConfig(new gcp.CloudRunConfig(true, true))
      .withCloudSqlConfig(new gcp.CloudSqlConfig(true, true))
      .withGkeConfig(new gcp.GkeConfig(true, true))
      .withKafkaConfig(new gcp.KafkaConfig(true, true));
    expect(c.getDockerSocketMount()).toBe(SOCKET);
    expect(c.withEnv('FLOCI_GCP_SERVICES_BIGQUERY_DUCK_URL', 'http://duck:3000').getDockerSocketMount()).toBeUndefined();
  });

  it('lets the explicit overrides win both ways', () => {
    expect(new FlociGcpContainer().withoutDockerSocket().getDockerSocketMount()).toBeUndefined();
    expect(withoutSocketServices().withDockerSocket('/run/user/1000/docker.sock').getDockerSocketMount())
      .toBe('/run/user/1000/docker.sock');
  });

  describe('socket table', () => {
    /** Each mockable service in every state that matters to the socket, as a config. */
    const variants: gcp.GcpServiceConfig[] = [true, false].flatMap((enabled) => [true, false].flatMap((mock) => [
      new gcp.BigQueryConfig(enabled, mock), new gcp.CloudRunConfig(enabled, mock), new gcp.CloudSqlConfig(enabled, mock),
      new gcp.GkeConfig(enabled, mock), new gcp.KafkaConfig(enabled, mock),
    ]));

    it('covers every config that declares a socket need', () => {
      const declaring = new FlociGcpContainer().getServiceConfigs()
        .filter((cfg) => cfg.requiresDockerSocket !== gcp.GcpServiceConfig.prototype.requiresDockerSocket)
        .map((cfg) => cfg.token);
      expect(declaring.sort()).toEqual(GCP.socketServices.map((s) => s.token).sort());
      expect(Array.from(new Set(variants.map((cfg) => cfg.token))).sort()).toEqual(declaring);
    });

    it('agrees with requiresDockerSocket() of every config, from the env the config writes', () => {
      for (const cfg of variants) {
        const out: Record<string, string> = {};
        cfg.applyEnvVarsTo({ withEnv: (k, v) => (out[k] = v), withExposedPort: () => undefined });
        const only = { ...GCP, socketServices: GCP.socketServices.filter((s) => s.token === cfg.token) };
        expect([cfg.token, JSON.stringify(out), dockerSocketRequired(only, out)])
          .toEqual([cfg.token, JSON.stringify(out), cfg.requiresDockerSocket()]);
      }
    });

    it('has no service that is mocked by default', () => {
      expect(GCP.socketServices.filter((s) => s.mockedByDefault)).toEqual([]);
      expect(new FlociGcpContainer().getServiceConfigs()
        .filter((cfg) => cfg instanceof gcp.GcpMockableServiceConfig && cfg.mock)).toEqual([]);
    });
  });

  it('mounts the socket at start only when something needs it', async () => {
    const mounts = jest.spyOn(GenericContainer.prototype, 'withBindMounts');
    jest.spyOn(GenericContainer.prototype, 'start').mockResolvedValue({} as StartedTestContainer);
    await withoutSocketServices().start();
    await new FlociGcpContainer().start();
    expect(mounts.mock.calls[0][0]).toEqual([]);
    expect(mounts.mock.calls[1][0]).toEqual([{ source: SOCKET, target: SOCKET, mode: 'rw' }]);
    jest.restoreAllMocks();
  });
});

describe('StartedFlociGcpContainer', () => {
  afterEach(() => jest.restoreAllMocks());

  const started = (projectId?: string) =>
    new StartedFlociGcpContainer(
      { getHost: () => 'localhost', getMappedPort: () => 32768 } as unknown as StartedTestContainer,
      { resourceNamespace: 'tc-0a1b2c3d', projectId },
    );

  it('exposes the endpoints and the project', () => {
    const c = started();
    expect(c.getEndpoint()).toBe('http://localhost:32768');
    expect(c.getHttpsEndpoint()).toBe('https://localhost:32768');
    expect(c.getProjectId()).toBe('floci-local');
    expect(c.getResourceNamespace()).toBe('tc-0a1b2c3d');
    expect(started('my-project').getProjectId()).toBe('my-project');
  });

  it('builds the variables Google SDKs read', () => {
    expect(started('my-project').getEmulatorEnv()).toEqual({
      PUBSUB_EMULATOR_HOST: 'localhost:32768',
      FIRESTORE_EMULATOR_HOST: 'localhost:32768',
      DATASTORE_EMULATOR_HOST: 'localhost:32768',
      SECRET_MANAGER_EMULATOR_HOST: 'localhost:32768',
      FIREBASE_AUTH_EMULATOR_HOST: 'localhost:32768',
      LOGGING_EMULATOR_HOST: 'localhost:32768',
      KMS_EMULATOR_HOST: 'localhost:32768',
      STORAGE_EMULATOR_HOST: 'http://localhost:32768',
      STORAGE_EMULATOR_HOST_GRPC: 'localhost:32768',
      GOOGLE_CLOUD_PROJECT: 'my-project',
    });
  });

  it('passes the configured project from the builder to the started container', async () => {
    jest.spyOn(GenericContainer.prototype, 'start').mockResolvedValue({} as StartedTestContainer);
    expect((await new FlociGcpContainer().withProjectId('my-project').start()).getProjectId()).toBe('my-project');
    expect((await new FlociGcpContainer().start()).getProjectId()).toBe('floci-local');
  });

  it('waits for HTTPS health too once TLS is enabled', async () => {
    const wait = jest.spyOn(GenericContainer.prototype, 'withWaitStrategy');
    jest.spyOn(GenericContainer.prototype, 'start').mockResolvedValue({} as StartedTestContainer);
    const probes = async (c: FlociGcpContainer) => {
      wait.mockClear();
      await c.start();
      const strategy = wait.mock.calls[0][0] as unknown as { waitStrategies?: unknown[] };
      return (strategy.waitStrategies ?? [strategy]).map((p) => {
        const probe = p as { protocol: string; path: string; port: number };
        return `${probe.protocol}:${probe.port}${probe.path}`;
      });
    };
    expect(await probes(new FlociGcpContainer())).toEqual(['http:4588/_floci-gcp/health']);
    expect(await probes(new FlociGcpContainer().withTlsConfig(new gcp.TlsConfig(true))))
      .toEqual(['http:4588/_floci-gcp/health', 'https:4588/_floci-gcp/health']);
  });

  it('resets state with POST /_floci-gcp/state/reset', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"status":"OK"}'));
    await started().reset();
    expect(fetch).toHaveBeenCalledWith('http://localhost:32768/_floci-gcp/state/reset', { method: 'POST' });
  });

  it('fetches the TLS certificate, and fails when TLS is off', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('-----BEGIN CERTIFICATE-----'));
    await expect(started().getTlsCertificate()).resolves.toBe('-----BEGIN CERTIFICATE-----');
    expect(fetch).toHaveBeenCalledWith('http://localhost:32768/_floci-gcp/tls-cert');
    fetch.mockResolvedValue(new Response('TLS is not enabled', { status: 404 }));
    await expect(started().getTlsCertificate()).rejects.toThrow('TLS certificate not available (HTTP 404)');
  });
});

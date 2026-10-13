import { readFileSync } from 'fs';
import { join } from 'path';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import {
  AZ,
  FlociAzContainer,
  FlociBaseContainer,
  StartedFlociAzContainer,
  az,
  dockerSocketRequired,
  networkEnv,
  resourceNamespaceEnv,
} from '../../src';

const SOCKET = '/var/run/docker.sock';

/** Every emulator service: token, and the mock switch's default where the service has one. */
const SERVICES: ReadonlyArray<readonly [token: string, mockedByDefault?: boolean]> = [
  ['ACI', true], ['ACR', false], ['AKS', false], ['APIM'], ['APP_CONFIG'], ['ARM'], ['BLOB'],
  ['CONTAINER_APPS', true], ['COSMOS', false], ['EMAIL'], ['ENTRA'], ['EVENT_GRID'], ['EVENT_HUB', false],
  ['FUNCTIONS', false], ['GRAPH'], ['KEY_VAULT'], ['MANAGED_IDENTITY'], ['MARIA_DB', false], ['MONITOR'],
  ['MYSQL', false], ['NETWORK'], ['POLICY'], ['POSTGRES', false], ['QUEUE'], ['REDIS', false],
  ['SERVICE_BUS', true], ['SIGNALR'], ['SQL'], ['TABLE'], ['VM', true],
];

const env = (c: FlociAzContainer) => (c as unknown as { envVars: Record<string, string> }).envVars;

/** A container with every service that needs the socket by default mocked. */
const withoutSocketServices = () =>
  new FlociAzContainer()
    .withAcrConfig(new az.AcrConfig(true, true))
    .withAksConfig(new az.AksConfig(true, true))
    .withEventHubConfig(new az.EventHubConfig(true, true))
    .withFunctionsConfig(new az.FunctionsConfig(true, true))
    .withMariaDbConfig(new az.MariaDbConfig(true, true))
    .withMySqlConfig(new az.MySqlConfig(true, true))
    .withPostgresConfig(new az.PostgresConfig(true, true))
    .withRedisConfig(new az.RedisConfig(true, true));

describe('AZ descriptor', () => {
  it('describes the floci-az emulator', () => {
    expect(AZ).toMatchObject({
      name: 'az',
      defaultImage: 'floci/floci-az:latest',
      port: 4577,
      envPrefix: 'FLOCI_AZ_',
      healthPath: '/_floci/health',
      resetPath: '/_admin/reset',
      logLevelEnv: 'QUARKUS_LOG_CATEGORY__IO_FLOCI_AZ__LEVEL',
      mockSetting: 'MOCKED',
    });
    expect(networkEnv(AZ)).toBe('FLOCI_AZ_SERVICES_DOCKER_NETWORK');
    expect(resourceNamespaceEnv(AZ)).toBe('FLOCI_AZ_DOCKER_RESOURCE_NAMESPACE');
  });

  it('pins its test image once, in .github/docker-images.txt', () => {
    const pins = readFileSync(join(__dirname, '..', '..', '.github', 'docker-images.txt'), 'utf8');
    expect(pins.split('\n').filter((line) => line.startsWith('floci/floci-az:'))).toHaveLength(1);
  });
});

describe('FlociAzContainer', () => {
  it('is built on the shared core and exported from the entry point and the az namespace', () => {
    expect(new FlociAzContainer()).toBeInstanceOf(FlociBaseContainer);
    expect(az.FlociAzContainer).toBe(FlociAzContainer);
    expect(FlociAzContainer.PORT).toBe(AZ.port);
  });

  it('sets the defaults every Azure container needs, which the caller can override', () => {
    const c = new FlociAzContainer();
    expect(env(c)).toMatchObject({
      FLOCI_AZ_DOCKER_ENDPOINT_MODE: 'published',
      FLOCI_AZ_TLS_HTTPS_PORT: '0',
      FLOCI_AZ_TLS_ENABLED: 'false',
      QUARKUS_LOG_CATEGORY__IO_FLOCI_AZ__LEVEL: 'WARN',
    });
    expect(c.withEnv('FLOCI_AZ_DOCKER_ENDPOINT_MODE', 'auto')).toBe(c);
    expect(env(c).FLOCI_AZ_DOCKER_ENDPOINT_MODE).toBe('auto');
  });

  it('gives each container a unique, overridable resource namespace', () => {
    const a = new FlociAzContainer();
    expect(a.getResourceNamespace()).toMatch(/^tc-[0-9a-f]{8}$/);
    expect(env(a).FLOCI_AZ_DOCKER_RESOURCE_NAMESPACE).toBe(a.getResourceNamespace());
    expect(a.getResourceNamespace()).not.toBe(new FlociAzContainer().getResourceNamespace());
    expect(a.withResourceNamespace('ci-42').getResourceNamespace()).toBe('ci-42');
  });

  it('names the dedicated network and the log level with the Azure keys', () => {
    const c = new FlociAzContainer().withDedicatedNetwork().withLogLevel('DEBUG');
    expect(env(c).FLOCI_AZ_SERVICES_DOCKER_NETWORK).toBe(c.getDedicatedNetworkName());
    expect(env(c).QUARKUS_LOG_CATEGORY__IO_FLOCI_AZ__LEVEL).toBe('DEBUG');
  });

  it('has one config per emulator service', () => {
    expect(new FlociAzContainer().getServiceConfigs().map((cfg) => cfg.token).sort())
      .toEqual(SERVICES.map(([token]) => token).sort());
  });

  it.each(SERVICES.map(([token, mockedByDefault]) => ({ token, mockedByDefault })))(
    'enables $token by default, with its mock default',
    ({ token, mockedByDefault }) => {
    const e = env(new FlociAzContainer());
    expect(e[`FLOCI_AZ_SERVICES_${token}_ENABLED`]).toBe('true');
    expect(e[`FLOCI_AZ_SERVICES_${token}_MOCKED`]).toBe(mockedByDefault === undefined ? undefined : String(mockedByDefault));
    },
  );
});

describe('Azure service configs', () => {
  const written = (cfg: az.ServiceConfig) => {
    const out: Record<string, string> = {};
    cfg.applyEnvVarsTo({ withEnv: (k, v) => (out[k] = v), withExposedPort: () => undefined });
    return out;
  };

  it('writes only ENABLED for a disabled service', () => {
    expect(written(new az.BlobConfig(false))).toEqual({ FLOCI_AZ_SERVICES_BLOB_ENABLED: 'false' });
    expect(written(new az.AcrConfig(false, true))).toEqual({ FLOCI_AZ_SERVICES_ACR_ENABLED: 'false' });
    expect(written(new az.CosmosConfig(false))).toEqual({ FLOCI_AZ_SERVICES_COSMOS_ENABLED: 'false' });
    expect(written(new az.SqlConfig(false, 'managed'))).toEqual({ FLOCI_AZ_SERVICES_SQL_ENABLED: 'false' });
  });

  it('writes the mock switch of an enabled service', () => {
    expect(written(new az.ServiceBusConfig())).toEqual({
      FLOCI_AZ_SERVICES_SERVICE_BUS_ENABLED: 'true',
      FLOCI_AZ_SERVICES_SERVICE_BUS_MOCKED: 'true',
    });
    expect(written(new az.ServiceBusConfig(true, false)).FLOCI_AZ_SERVICES_SERVICE_BUS_MOCKED).toBe('false');
    expect(written(new az.KeyVaultConfig())).toEqual({ FLOCI_AZ_SERVICES_KEY_VAULT_ENABLED: 'true' });
  });

  it('writes the Cosmos engine settings', () => {
    expect(written(new az.CosmosConfig())).toEqual({
      FLOCI_AZ_SERVICES_COSMOS_ENABLED: 'true',
      FLOCI_AZ_SERVICES_COSMOS_MOCKED: 'false',
      FLOCI_AZ_SERVICES_COSMOS_ENGINES_STARTUP: 'on-demand',
      FLOCI_AZ_SERVICES_COSMOS_ENGINES_MONGODB_ENABLED: 'false',
      FLOCI_AZ_SERVICES_COSMOS_ENGINES_POSTGRESQL_ENABLED: 'false',
      FLOCI_AZ_SERVICES_COSMOS_ENGINES_CASSANDRA_ENABLED: 'false',
      FLOCI_AZ_SERVICES_COSMOS_ENGINES_GREMLIN_ENABLED: 'false',
    });
    expect(written(new az.CosmosConfig(true, false, 'eager', { gremlin: true }))).toMatchObject({
      FLOCI_AZ_SERVICES_COSMOS_ENGINES_STARTUP: 'eager',
      FLOCI_AZ_SERVICES_COSMOS_ENGINES_GREMLIN_ENABLED: 'true',
    });
  });

  it('writes the SQL data plane provider only when one is chosen', () => {
    expect(written(new az.SqlConfig())).toEqual({
      FLOCI_AZ_SERVICES_SQL_ENABLED: 'true',
      FLOCI_AZ_SERVICES_SQL_ACCEPT_EULA: 'N',
    });
    expect(written(new az.SqlConfig(true, 'managed', 'Y'))).toEqual({
      FLOCI_AZ_SERVICES_SQL_ENABLED: 'true',
      FLOCI_AZ_SERVICES_SQL_ACCEPT_EULA: 'Y',
      FLOCI_AZ_SERVICES_SQL_DATA_PLANE_PROVIDER: 'managed',
    });
  });

  it('writes TLS settings only when TLS is enabled, with no extra HTTPS port by default', () => {
    expect(written(new az.TlsConfig())).toEqual({ FLOCI_AZ_TLS_ENABLED: 'false' });
    expect(written(new az.TlsConfig(true))).toEqual({
      FLOCI_AZ_TLS_ENABLED: 'true',
      FLOCI_AZ_TLS_SELF_SIGNED: 'true',
      FLOCI_AZ_TLS_HTTPS_PORT: '0',
    });
    expect(written(new az.TlsConfig(true, false, '/certs/tls.crt', '/certs/tls.key', 8443))).toEqual({
      FLOCI_AZ_TLS_ENABLED: 'true',
      FLOCI_AZ_TLS_SELF_SIGNED: 'false',
      FLOCI_AZ_TLS_CERT_PATH: '/certs/tls.crt',
      FLOCI_AZ_TLS_KEY_PATH: '/certs/tls.key',
      FLOCI_AZ_TLS_HTTPS_PORT: '8443',
    });
  });

  it('applies configs through the container, returning it for chaining', () => {
    const c = new FlociAzContainer();
    const cfg = new az.QueueConfig(false);
    expect(c.withQueueConfig(cfg)).toBe(c);
    expect(c.getQueueConfig()).toBe(cfg);
    expect(env(c).FLOCI_AZ_SERVICES_QUEUE_ENABLED).toBe('false');
    expect(c.withTlsConfig(new az.TlsConfig(true)).getTlsConfig().enabled).toBe(true);
    expect(env(c).FLOCI_AZ_TLS_ENABLED).toBe('true');
  });

  it('tolerates repeated application and drops what an earlier config set', () => {
    const c = new FlociAzContainer()
      .withServiceBusConfig(new az.ServiceBusConfig(true, false))
      .withServiceBusConfig(new az.ServiceBusConfig(true, false))
      .withSqlConfig(new az.SqlConfig(true, 'managed'))
      .withSqlConfig(new az.SqlConfig());
    expect(env(c).FLOCI_AZ_SERVICES_SERVICE_BUS_MOCKED).toBe('false');
    expect(env(c).FLOCI_AZ_SERVICES_SQL_DATA_PLANE_PROVIDER).toBeUndefined();

    c.withServiceBusConfig(new az.ServiceBusConfig(false));
    expect(env(c).FLOCI_AZ_SERVICES_SERVICE_BUS_ENABLED).toBe('false');
    expect(env(c).FLOCI_AZ_SERVICES_SERVICE_BUS_MOCKED).toBeUndefined();
  });

  it('keeps a setting the caller set with withEnv after the config', () => {
    const c = new FlociAzContainer()
      .withSqlConfig(new az.SqlConfig(true, 'managed'))
      .withEnv('FLOCI_AZ_SERVICES_SQL_DATA_PLANE_PROVIDER', 'external')
      .withSqlConfig(new az.SqlConfig());
    expect(env(c).FLOCI_AZ_SERVICES_SQL_DATA_PLANE_PROVIDER).toBe('external');
  });
});

describe('Azure Docker socket detection', () => {
  it('mounts it by default, since container-backed services are enabled by default', () => {
    expect(new FlociAzContainer().getDockerSocketMount()).toBe(SOCKET);
  });

  it('needs it by default for exactly the unmocked container-backed services', () => {
    const byDefault = new FlociAzContainer().getServiceConfigs().filter((cfg) => cfg.requiresDockerSocket());
    expect(byDefault.map((cfg) => cfg.token).sort())
      .toEqual(['ACR', 'AKS', 'EVENT_HUB', 'FUNCTIONS', 'MARIA_DB', 'MYSQL', 'POSTGRES', 'REDIS']);
  });

  it('skips it when every container-backed service is mocked or disabled', () => {
    expect(withoutSocketServices().getDockerSocketMount()).toBeUndefined();
    const disabled = new FlociAzContainer();
    for (const svc of AZ.socketServices) {
      disabled.withEnv(`FLOCI_AZ_SERVICES_${svc.token}_ENABLED`, 'false');
    }
    expect(disabled.getDockerSocketMount()).toBeUndefined();
  });

  it.each(['ACI', 'CONTAINER_APPS', 'SERVICE_BUS', 'VM'])('needs it for %s only once its default mock is off', (token) => {
    const only = { ...AZ, socketServices: AZ.socketServices.filter((s) => s.token === token) };
    expect(dockerSocketRequired(only, {})).toBe(false);
    expect(dockerSocketRequired(only, { [`FLOCI_AZ_SERVICES_${token}_MOCKED`]: 'true' })).toBe(false);
    expect(dockerSocketRequired(only, { [`FLOCI_AZ_SERVICES_${token}_MOCKED`]: 'false' })).toBe(true);
    expect(dockerSocketRequired(only, {
      [`FLOCI_AZ_SERVICES_${token}_MOCKED`]: 'false',
      [`FLOCI_AZ_SERVICES_${token}_ENABLED`]: 'false',
    })).toBe(false);
  });

  it.each(['ACR', 'AKS', 'EVENT_HUB', 'FUNCTIONS', 'MARIA_DB', 'MYSQL', 'POSTGRES', 'REDIS'])(
    'needs it for %s unless mocked or disabled',
    (token) => {
      const only = { ...AZ, socketServices: AZ.socketServices.filter((s) => s.token === token) };
      expect(dockerSocketRequired(only, {})).toBe(true);
      expect(dockerSocketRequired(only, { [`FLOCI_AZ_SERVICES_${token}_MOCKED`]: 'true' })).toBe(false);
      expect(dockerSocketRequired(only, { [`FLOCI_AZ_SERVICES_${token}_ENABLED`]: 'false' })).toBe(false);
    },
  );

  it('reads the Azure mock switch, MOCKED, not MOCK', () => {
    const c = withoutSocketServices().withEnv('FLOCI_AZ_SERVICES_VM_MOCK', 'false');
    expect(c.getDockerSocketMount()).toBeUndefined();
    expect(c.withEnv('FLOCI_AZ_SERVICES_VM_MOCKED', 'false').getDockerSocketMount()).toBe(SOCKET);
  });

  it('needs it for Cosmos only with a container-backed engine, unmocked and not disabled', () => {
    const mount = (cfg: az.CosmosConfig) => withoutSocketServices().withCosmosConfig(cfg).getDockerSocketMount();
    expect(mount(new az.CosmosConfig())).toBeUndefined();
    expect(mount(new az.CosmosConfig(true, false, 'on-demand', { mongodb: true }))).toBe(SOCKET);
    expect(mount(new az.CosmosConfig(true, false, 'eager', { cassandra: true }))).toBe(SOCKET);
    expect(mount(new az.CosmosConfig(true, false, 'disabled', { mongodb: true }))).toBeUndefined();
    expect(mount(new az.CosmosConfig(true, true, 'on-demand', { mongodb: true }))).toBeUndefined();
    expect(mount(new az.CosmosConfig(false, false, 'on-demand', { mongodb: true }))).toBeUndefined();
  });

  it('needs it for SQL only with the managed data plane', () => {
    const mount = (cfg: az.SqlConfig) => withoutSocketServices().withSqlConfig(cfg).getDockerSocketMount();
    expect(mount(new az.SqlConfig())).toBeUndefined();
    expect(mount(new az.SqlConfig(true, 'managed'))).toBe(SOCKET);
    expect(mount(new az.SqlConfig(true, undefined, 'Y'))).toBe(SOCKET);
    expect(mount(new az.SqlConfig(true, 'none', 'Y'))).toBeUndefined();
    expect(mount(new az.SqlConfig(true, 'external', 'Y'))).toBeUndefined();
    expect(mount(new az.SqlConfig(false, 'managed'))).toBeUndefined();
  });

  it('follows the emulator for the deprecated SQL MOCKED switch set as raw env', () => {
    expect(withoutSocketServices().withEnv('FLOCI_AZ_SERVICES_SQL_MOCKED', 'false').getDockerSocketMount()).toBe(SOCKET);
    expect(
      withoutSocketServices()
        .withSqlConfig(new az.SqlConfig(true, undefined, 'Y'))
        .withEnv('FLOCI_AZ_SERVICES_SQL_MOCKED', 'true')
        .getDockerSocketMount(),
    ).toBeUndefined();
  });

  it('lets the explicit overrides win both ways', () => {
    expect(new FlociAzContainer().withoutDockerSocket().getDockerSocketMount()).toBeUndefined();
    expect(withoutSocketServices().withDockerSocket('/run/user/1000/docker.sock').getDockerSocketMount())
      .toBe('/run/user/1000/docker.sock');
  });

  describe('socket table', () => {
    /** Each service in every state that matters to the socket, as a config. */
    const variants: az.AzServiceConfig[] = [
      ...[true, false].flatMap((enabled) => [true, false].flatMap((mocked) => [
        new az.AciConfig(enabled, mocked), new az.AcrConfig(enabled, mocked), new az.AksConfig(enabled, mocked),
        new az.ContainerAppsConfig(enabled, mocked), new az.EventHubConfig(enabled, mocked),
        new az.FunctionsConfig(enabled, mocked), new az.MariaDbConfig(enabled, mocked),
        new az.MySqlConfig(enabled, mocked), new az.PostgresConfig(enabled, mocked),
        new az.RedisConfig(enabled, mocked), new az.ServiceBusConfig(enabled, mocked), new az.VmConfig(enabled, mocked),
        ...(['on-demand', 'eager', 'disabled'] as const).flatMap((startup) => [
          new az.CosmosConfig(enabled, mocked, startup),
          new az.CosmosConfig(enabled, mocked, startup, { mongodb: true }),
          new az.CosmosConfig(enabled, mocked, startup, { postgresql: true }),
          new az.CosmosConfig(enabled, mocked, startup, { cassandra: true }),
          new az.CosmosConfig(enabled, mocked, startup, { gremlin: true }),
        ]),
      ])),
      ...[true, false].flatMap((enabled) => ['N', 'Y'].flatMap((eula) =>
        ([undefined, 'none', 'managed', 'external'] as const).map((p) => new az.SqlConfig(enabled, p, eula)))),
    ];

    it('lists exactly the services whose config can need the socket', () => {
      const fromConfigs = new Set(variants.filter((cfg) => cfg.requiresDockerSocket()).map((cfg) => cfg.token));
      expect(AZ.socketServices.map((s) => s.token).sort()).toEqual(Array.from(fromConfigs).sort());
      expect(variants.map((cfg) => cfg.token)).toEqual(expect.arrayContaining(Array.from(fromConfigs)));
    });

    it('covers every config that declares a socket need', () => {
      const declaring = new FlociAzContainer().getServiceConfigs()
        .filter((cfg) => cfg.requiresDockerSocket !== az.AzServiceConfig.prototype.requiresDockerSocket)
        .map((cfg) => cfg.token);
      expect(declaring.sort()).toEqual(AZ.socketServices.map((s) => s.token).sort());
    });

    it('agrees with requiresDockerSocket() of every config, from the env the config writes', () => {
      for (const cfg of variants) {
        const out: Record<string, string> = {};
        cfg.applyEnvVarsTo({ withEnv: (k, v) => (out[k] = v), withExposedPort: () => undefined });
        const only = { ...AZ, socketServices: AZ.socketServices.filter((s) => s.token === cfg.token) };
        expect([cfg.token, JSON.stringify(out), dockerSocketRequired(only, out)])
          .toEqual([cfg.token, JSON.stringify(out), cfg.requiresDockerSocket()]);
      }
    });

    it('marks as mocked by default exactly the configs that default to mocked', () => {
      const mockedDefaults = new FlociAzContainer().getServiceConfigs()
        .filter((cfg) => cfg instanceof az.AzMockableServiceConfig && cfg.mocked)
        .map((cfg) => cfg.token);
      expect(AZ.socketServices.filter((s) => s.mockedByDefault).map((s) => s.token).sort()).toEqual(mockedDefaults.sort());
    });
  });

  it('mounts the socket at start only when something needs it', async () => {
    const mounts = jest.spyOn(GenericContainer.prototype, 'withBindMounts');
    jest.spyOn(GenericContainer.prototype, 'start').mockResolvedValue({} as StartedTestContainer);
    await withoutSocketServices().start();
    await new FlociAzContainer().start();
    expect(mounts.mock.calls[0][0]).toEqual([]);
    expect(mounts.mock.calls[1][0]).toEqual([{ source: SOCKET, target: SOCKET, mode: 'rw' }]);
    jest.restoreAllMocks();
  });
});

describe('StartedFlociAzContainer', () => {
  afterEach(() => jest.restoreAllMocks());

  const started = () =>
    new StartedFlociAzContainer(
      { getHost: () => 'localhost', getMappedPort: () => 32768 } as unknown as StartedTestContainer,
      { resourceNamespace: 'tc-0a1b2c3d' },
    );
  const KEY = 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==';

  it('exposes endpoints, the storage account and the fixed identities', () => {
    const c = started();
    expect(c.getEndpoint()).toBe('http://localhost:32768');
    expect(c.getHttpsEndpoint()).toBe('https://localhost:32768');
    expect(c.getSubscriptionId()).toBe('00000000-0000-0000-0000-000000000001');
    expect(c.getTenantId()).toBe('00000000-0000-0000-0000-000000000002');
    expect(c.getAccountName()).toBe('devstoreaccount1');
    expect(c.getAccountKey()).toBe(KEY);
    expect(c.getBlobEndpoint()).toBe('http://localhost:32768/devstoreaccount1');
    expect(c.getQueueEndpoint()).toBe('http://localhost:32768/devstoreaccount1-queue');
    expect(c.getTableEndpoint()).toBe('http://localhost:32768/devstoreaccount1-table');
    expect(c.getResourceNamespace()).toBe('tc-0a1b2c3d');
  });

  it('builds the storage connection string', () => {
    expect(started().getStorageConnectionString()).toBe(
      `DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=${KEY}` +
        ';BlobEndpoint=http://localhost:32768/devstoreaccount1' +
        ';QueueEndpoint=http://localhost:32768/devstoreaccount1-queue' +
        ';TableEndpoint=http://localhost:32768/devstoreaccount1-table;',
    );
  });

  it('resets state with POST /_admin/reset', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    await started().reset();
    expect(fetch).toHaveBeenCalledWith('http://localhost:32768/_admin/reset', { method: 'POST' });
  });

  it('fetches the TLS certificate, and fails when TLS is off', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('-----BEGIN CERTIFICATE-----'));
    await expect(started().getTlsCertificate()).resolves.toBe('-----BEGIN CERTIFICATE-----');
    expect(fetch).toHaveBeenCalledWith('http://localhost:32768/_floci/tls-cert');
    fetch.mockResolvedValue(new Response('TLS is not enabled', { status: 404 }));
    await expect(started().getTlsCertificate()).rejects.toThrow('TLS certificate not available (HTTP 404)');
  });
});

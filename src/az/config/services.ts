import type { FlociContainerTarget, ServiceConfig } from '../../core';

export type { FlociContainerTarget, ServiceConfig };

const PREFIX = 'FLOCI_AZ_SERVICES_';

/**
 * An Azure service of the emulator: `FLOCI_AZ_SERVICES_<token>_ENABLED` is always written, every
 * other setting only while the service is enabled.
 */
export abstract class AzServiceConfig implements ServiceConfig {
  protected constructor(
    /** The emulator's SCREAMING_SNAKE name of the service, e.g. `KEY_VAULT`. */
    readonly token: string,
    readonly enabled: boolean,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv(`${PREFIX}${this.token}_ENABLED`, String(this.enabled));
    if (this.enabled) {
      this.applySettingsTo((setting, value) => c.withEnv(`${PREFIX}${this.token}_${setting}`, value));
    }
  }

  /** Writes the settings besides `ENABLED`; called only while the service is enabled. */
  protected applySettingsTo(_set: (setting: string, value: string) => void): void {}

  applyExposedPortsTo(_c: FlociContainerTarget): void {}

  /** Whether the service, as configured, spawns sibling containers and so needs the Docker socket. */
  requiresDockerSocket(): boolean {
    return false;
  }
}

/** An Azure service with a mock switch (`…_MOCKED`); it spawns containers only while not mocked. */
export abstract class AzMockableServiceConfig extends AzServiceConfig {
  protected constructor(
    token: string,
    enabled: boolean,
    readonly mocked: boolean,
  ) {
    super(token, enabled);
  }

  protected applySettingsTo(set: (setting: string, value: string) => void): void {
    set('MOCKED', String(this.mocked));
  }

  requiresDockerSocket(): boolean {
    return this.enabled && !this.mocked;
  }
}

/** Container Instances. Mocked by default. */
export class AciConfig extends AzMockableServiceConfig {
  constructor(enabled: boolean = true, mocked: boolean = true) {
    super('ACI', enabled, mocked);
  }
}

/** Container Registry. */
export class AcrConfig extends AzMockableServiceConfig {
  constructor(enabled: boolean = true, mocked: boolean = false) {
    super('ACR', enabled, mocked);
  }
}

/** Kubernetes Service. */
export class AksConfig extends AzMockableServiceConfig {
  constructor(enabled: boolean = true, mocked: boolean = false) {
    super('AKS', enabled, mocked);
  }
}

/** API Management. */
export class ApimConfig extends AzServiceConfig {
  constructor(enabled: boolean = true) {
    super('APIM', enabled);
  }
}

/** App Configuration. */
export class AppConfigConfig extends AzServiceConfig {
  constructor(enabled: boolean = true) {
    super('APP_CONFIG', enabled);
  }
}

/** Resource Manager. */
export class ArmConfig extends AzServiceConfig {
  constructor(enabled: boolean = true) {
    super('ARM', enabled);
  }
}

/** Blob Storage. */
export class BlobConfig extends AzServiceConfig {
  constructor(enabled: boolean = true) {
    super('BLOB', enabled);
  }
}

/** Container Apps. Mocked by default. */
export class ContainerAppsConfig extends AzMockableServiceConfig {
  constructor(enabled: boolean = true, mocked: boolean = true) {
    super('CONTAINER_APPS', enabled, mocked);
  }
}

/** When the emulator starts the Cosmos DB engines. */
export type CosmosEngineStartup = 'on-demand' | 'eager' | 'disabled';

/** The Cosmos DB API engines the emulator runs in sibling containers; all disabled by default. */
export interface CosmosContainerEngines {
  readonly mongodb?: boolean;
  readonly postgresql?: boolean;
  readonly cassandra?: boolean;
  readonly gremlin?: boolean;
}

/**
 * Cosmos DB. The NoSQL and Table APIs run in-process; MongoDB, PostgreSQL, Cassandra and Gremlin
 * are backed by sibling containers, so the Docker socket is needed only while one of them is
 * enabled, the service is not mocked and `engineStartup` is not `disabled`.
 */
export class CosmosConfig extends AzMockableServiceConfig {
  /** The engines backed by sibling containers, as their `ENGINES_<NAME>_ENABLED` tokens. */
  static readonly CONTAINER_ENGINES = ['MONGODB', 'POSTGRESQL', 'CASSANDRA', 'GREMLIN'] as const;

  constructor(
    enabled: boolean = true,
    mocked: boolean = false,
    readonly engineStartup: CosmosEngineStartup = 'on-demand',
    readonly engines: CosmosContainerEngines = {},
  ) {
    super('COSMOS', enabled, mocked);
  }

  protected applySettingsTo(set: (setting: string, value: string) => void): void {
    super.applySettingsTo(set);
    set('ENGINES_STARTUP', this.engineStartup);
    set('ENGINES_MONGODB_ENABLED', String(this.engines.mongodb ?? false));
    set('ENGINES_POSTGRESQL_ENABLED', String(this.engines.postgresql ?? false));
    set('ENGINES_CASSANDRA_ENABLED', String(this.engines.cassandra ?? false));
    set('ENGINES_GREMLIN_ENABLED', String(this.engines.gremlin ?? false));
  }

  requiresDockerSocket(): boolean {
    const e = this.engines;
    return (
      super.requiresDockerSocket() &&
      this.engineStartup !== 'disabled' &&
      Boolean(e.mongodb || e.postgresql || e.cassandra || e.gremlin)
    );
  }
}

/** Communication Services Email. */
export class EmailConfig extends AzServiceConfig {
  constructor(enabled: boolean = true) {
    super('EMAIL', enabled);
  }
}

/** Microsoft Entra ID. */
export class EntraConfig extends AzServiceConfig {
  constructor(enabled: boolean = true) {
    super('ENTRA', enabled);
  }
}

/** Event Grid. */
export class EventGridConfig extends AzServiceConfig {
  constructor(enabled: boolean = true) {
    super('EVENT_GRID', enabled);
  }
}

/** Event Hubs. */
export class EventHubConfig extends AzMockableServiceConfig {
  constructor(enabled: boolean = true, mocked: boolean = false) {
    super('EVENT_HUB', enabled, mocked);
  }
}

/** Functions. */
export class FunctionsConfig extends AzMockableServiceConfig {
  constructor(enabled: boolean = true, mocked: boolean = false) {
    super('FUNCTIONS', enabled, mocked);
  }
}

/** Microsoft Graph. */
export class GraphConfig extends AzServiceConfig {
  constructor(enabled: boolean = true) {
    super('GRAPH', enabled);
  }
}

/** Key Vault. */
export class KeyVaultConfig extends AzServiceConfig {
  constructor(enabled: boolean = true) {
    super('KEY_VAULT', enabled);
  }
}

/** Managed Identity. */
export class ManagedIdentityConfig extends AzServiceConfig {
  constructor(enabled: boolean = true) {
    super('MANAGED_IDENTITY', enabled);
  }
}

/** Database for MariaDB. */
export class MariaDbConfig extends AzMockableServiceConfig {
  constructor(enabled: boolean = true, mocked: boolean = false) {
    super('MARIA_DB', enabled, mocked);
  }
}

/** Monitor. */
export class MonitorConfig extends AzServiceConfig {
  constructor(enabled: boolean = true) {
    super('MONITOR', enabled);
  }
}

/** Database for MySQL. */
export class MySqlConfig extends AzMockableServiceConfig {
  constructor(enabled: boolean = true, mocked: boolean = false) {
    super('MYSQL', enabled, mocked);
  }
}

/** Virtual networks. */
export class NetworkConfig extends AzServiceConfig {
  constructor(enabled: boolean = true) {
    super('NETWORK', enabled);
  }
}

/** Policy. */
export class PolicyConfig extends AzServiceConfig {
  constructor(enabled: boolean = true) {
    super('POLICY', enabled);
  }
}

/** Database for PostgreSQL. */
export class PostgresConfig extends AzMockableServiceConfig {
  constructor(enabled: boolean = true, mocked: boolean = false) {
    super('POSTGRES', enabled, mocked);
  }
}

/** Queue Storage. */
export class QueueConfig extends AzServiceConfig {
  constructor(enabled: boolean = true) {
    super('QUEUE', enabled);
  }
}

/** Cache for Redis. */
export class RedisConfig extends AzMockableServiceConfig {
  constructor(enabled: boolean = true, mocked: boolean = false) {
    super('REDIS', enabled, mocked);
  }
}

/** Service Bus. Mocked by default. */
export class ServiceBusConfig extends AzMockableServiceConfig {
  constructor(enabled: boolean = true, mocked: boolean = true) {
    super('SERVICE_BUS', enabled, mocked);
  }
}

/** SignalR Service. */
export class SignalRConfig extends AzServiceConfig {
  constructor(enabled: boolean = true) {
    super('SIGNALR', enabled);
  }
}

/** Where Azure SQL databases live: nowhere (control plane only), a SQL Server sibling container, or an external server. */
export type SqlDataPlaneProvider = 'none' | 'managed' | 'external';

/**
 * Azure SQL Database. It runs SQL Server in sibling containers, and so needs the Docker socket,
 * only while the effective data plane provider is `managed`: the configured `dataPlaneProvider`,
 * or `managed` when it is unset and the SQL Server EULA is accepted (`acceptEula` is `Y`).
 */
export class SqlConfig extends AzServiceConfig {
  constructor(
    enabled: boolean = true,
    readonly dataPlaneProvider?: SqlDataPlaneProvider,
    readonly acceptEula: string = 'N',
  ) {
    super('SQL', enabled);
  }

  protected applySettingsTo(set: (setting: string, value: string) => void): void {
    set('ACCEPT_EULA', this.acceptEula);
    if (this.dataPlaneProvider) {
      set('DATA_PLANE_PROVIDER', this.dataPlaneProvider);
    }
  }

  /** The provider the emulator ends up using. */
  getEffectiveDataPlaneProvider(): SqlDataPlaneProvider {
    return this.dataPlaneProvider ?? (this.acceptEula.toUpperCase() === 'Y' ? 'managed' : 'none');
  }

  requiresDockerSocket(): boolean {
    return this.enabled && this.getEffectiveDataPlaneProvider() === 'managed';
  }
}

/** Table Storage. */
export class TableConfig extends AzServiceConfig {
  constructor(enabled: boolean = true) {
    super('TABLE', enabled);
  }
}

/** Virtual Machines. Mocked by default. */
export class VmConfig extends AzMockableServiceConfig {
  constructor(enabled: boolean = true, mocked: boolean = true) {
    super('VM', enabled, mocked);
  }
}

import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { FlociBaseContainer, StartedFlociBaseContainer } from '../core';
import type { CloudDescriptor, ServiceSettingReader } from '../core';
import {
  AzServiceConfig,
  AciConfig,
  AcrConfig,
  AksConfig,
  ApimConfig,
  AppConfigConfig,
  ArmConfig,
  BlobConfig,
  ContainerAppsConfig,
  CosmosConfig,
  EmailConfig,
  EntraConfig,
  EventGridConfig,
  EventHubConfig,
  FunctionsConfig,
  GraphConfig,
  KeyVaultConfig,
  ManagedIdentityConfig,
  MariaDbConfig,
  MonitorConfig,
  MySqlConfig,
  NetworkConfig,
  PolicyConfig,
  PostgresConfig,
  QueueConfig,
  RedisConfig,
  ServiceBusConfig,
  SignalRConfig,
  SqlConfig,
  TableConfig,
  VmConfig,
} from './config/services';
import { TlsConfig } from './config/TlsConfig';

const DEFAULT_IMAGE = 'floci/floci-az:latest';
const TLS_CERT_PATH = '/_floci/tls-cert';

/** Cosmos DB spawns a container only for these engines, and never while startup is `disabled`. */
const cosmosSpawnsContainers = (setting: ServiceSettingReader): boolean =>
  (setting('ENGINES_STARTUP') ?? 'on-demand').toLowerCase() !== 'disabled' &&
  CosmosConfig.CONTAINER_ENGINES.some((engine) => (setting(`ENGINES_${engine}_ENABLED`) ?? '').toLowerCase() === 'true');

/**
 * Azure SQL runs SQL Server containers only with the `managed` data plane provider. Unset, the
 * emulator falls back to the deprecated `MOCKED` switch, then to whether the EULA is accepted.
 */
const sqlSpawnsContainers = (setting: ServiceSettingReader): boolean => {
  const provider = setting('DATA_PLANE_PROVIDER');
  if (provider) {
    return provider.toLowerCase() === 'managed';
  }
  const mocked = setting('MOCKED');
  if (mocked !== undefined) {
    return mocked.toLowerCase() !== 'true';
  }
  return (setting('ACCEPT_EULA') ?? 'N').toUpperCase() === 'Y';
};

/** The Azure emulator (`floci/floci-az`) as data, for the shared core. */
export const AZ: CloudDescriptor = {
  name: 'az',
  defaultImage: DEFAULT_IMAGE,
  port: 4577,
  envPrefix: 'FLOCI_AZ_',
  healthPath: '/_floci/health',
  resetPath: '/_admin/reset',
  logLevelEnv: 'QUARKUS_LOG_CATEGORY__IO_FLOCI_AZ__LEVEL',
  mockSetting: 'MOCKED',
  // Services that spawn sibling containers, mirroring requiresDockerSocket() in the Java module.
  socketServices: [
    { token: 'ACI', mockedByDefault: true },
    { token: 'ACR', mockable: true },
    { token: 'AKS', mockable: true },
    { token: 'CONTAINER_APPS', mockedByDefault: true },
    { token: 'COSMOS', mockable: true, spawnsContainers: cosmosSpawnsContainers },
    { token: 'EVENT_HUB', mockable: true },
    { token: 'FUNCTIONS', mockable: true },
    { token: 'MARIA_DB', mockable: true },
    { token: 'MYSQL', mockable: true },
    { token: 'POSTGRES', mockable: true },
    { token: 'REDIS', mockable: true },
    { token: 'SERVICE_BUS', mockedByDefault: true },
    { token: 'SQL', spawnsContainers: sqlSpawnsContainers },
    { token: 'VM', mockedByDefault: true },
  ],
  defaultEnv: {
    // The host and port the emulator reports for its sidecars must be reachable from the test process.
    FLOCI_AZ_DOCKER_ENDPOINT_MODE: 'published',
    // The extra HTTPS listener defaults to 443, which an unprivileged container cannot bind.
    FLOCI_AZ_TLS_HTTPS_PORT: '0',
  },
};

/**
 * Testcontainers module for Floci Azure — a free, open-source local Azure emulator.
 *
 * @example
 * ```ts
 * const floci = await new FlociAzContainer().start();
 * const blobs = BlobServiceClient.fromConnectionString(floci.getStorageConnectionString());
 * await floci.stop();
 * ```
 */
export class FlociAzContainer extends FlociBaseContainer {
  static readonly PORT = 4577;
  static readonly DEFAULT_SUBSCRIPTION_ID = '00000000-0000-0000-0000-000000000001';
  static readonly DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000002';
  static readonly DEFAULT_ACCOUNT_NAME = 'devstoreaccount1';
  /** The well-known Azurite development key of `devstoreaccount1`. */
  static readonly DEFAULT_ACCOUNT_KEY =
    'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==';

  private readonly serviceConfigs = new Map<string, AzServiceConfig>();
  private tlsConfig = new TlsConfig();

  constructor(image = DEFAULT_IMAGE) {
    super(AZ, image);
    const defaults: AzServiceConfig[] = [
      new AciConfig(),
      new AcrConfig(),
      new AksConfig(),
      new ApimConfig(),
      new AppConfigConfig(),
      new ArmConfig(),
      new BlobConfig(),
      new ContainerAppsConfig(),
      new CosmosConfig(),
      new EmailConfig(),
      new EntraConfig(),
      new EventGridConfig(),
      new EventHubConfig(),
      new FunctionsConfig(),
      new GraphConfig(),
      new KeyVaultConfig(),
      new ManagedIdentityConfig(),
      new MariaDbConfig(),
      new MonitorConfig(),
      new MySqlConfig(),
      new NetworkConfig(),
      new PolicyConfig(),
      new PostgresConfig(),
      new QueueConfig(),
      new RedisConfig(),
      new ServiceBusConfig(),
      new SignalRConfig(),
      new SqlConfig(),
      new TableConfig(),
      new VmConfig(),
    ];
    for (const cfg of defaults) {
      this.serviceConfigs.set(cfg.token, cfg);
      cfg.applyEnvVarsTo(this);
    }
    this.tlsConfig.applyEnvVarsTo(this);
  }

  /** Every service config as it is now, one per emulator service. */
  getServiceConfigs(): readonly AzServiceConfig[] {
    return Array.from(this.serviceConfigs.values());
  }

  withTlsConfig(config: TlsConfig): this {
    this.replaceConfigEnv(this.tlsConfig, config);
    this.tlsConfig = config;
    return this;
  }

  getTlsConfig(): TlsConfig { return this.tlsConfig; }

  withAciConfig(config: AciConfig): this { return this.setServiceConfig(config); }

  getAciConfig(): AciConfig { return this.serviceConfig(AciConfig); }

  withAcrConfig(config: AcrConfig): this { return this.setServiceConfig(config); }

  getAcrConfig(): AcrConfig { return this.serviceConfig(AcrConfig); }

  withAksConfig(config: AksConfig): this { return this.setServiceConfig(config); }

  getAksConfig(): AksConfig { return this.serviceConfig(AksConfig); }

  withApimConfig(config: ApimConfig): this { return this.setServiceConfig(config); }

  getApimConfig(): ApimConfig { return this.serviceConfig(ApimConfig); }

  withAppConfigConfig(config: AppConfigConfig): this { return this.setServiceConfig(config); }

  getAppConfigConfig(): AppConfigConfig { return this.serviceConfig(AppConfigConfig); }

  withArmConfig(config: ArmConfig): this { return this.setServiceConfig(config); }

  getArmConfig(): ArmConfig { return this.serviceConfig(ArmConfig); }

  withBlobConfig(config: BlobConfig): this { return this.setServiceConfig(config); }

  getBlobConfig(): BlobConfig { return this.serviceConfig(BlobConfig); }

  withContainerAppsConfig(config: ContainerAppsConfig): this { return this.setServiceConfig(config); }

  getContainerAppsConfig(): ContainerAppsConfig { return this.serviceConfig(ContainerAppsConfig); }

  withCosmosConfig(config: CosmosConfig): this { return this.setServiceConfig(config); }

  getCosmosConfig(): CosmosConfig { return this.serviceConfig(CosmosConfig); }

  withEmailConfig(config: EmailConfig): this { return this.setServiceConfig(config); }

  getEmailConfig(): EmailConfig { return this.serviceConfig(EmailConfig); }

  withEntraConfig(config: EntraConfig): this { return this.setServiceConfig(config); }

  getEntraConfig(): EntraConfig { return this.serviceConfig(EntraConfig); }

  withEventGridConfig(config: EventGridConfig): this { return this.setServiceConfig(config); }

  getEventGridConfig(): EventGridConfig { return this.serviceConfig(EventGridConfig); }

  withEventHubConfig(config: EventHubConfig): this { return this.setServiceConfig(config); }

  getEventHubConfig(): EventHubConfig { return this.serviceConfig(EventHubConfig); }

  withFunctionsConfig(config: FunctionsConfig): this { return this.setServiceConfig(config); }

  getFunctionsConfig(): FunctionsConfig { return this.serviceConfig(FunctionsConfig); }

  withGraphConfig(config: GraphConfig): this { return this.setServiceConfig(config); }

  getGraphConfig(): GraphConfig { return this.serviceConfig(GraphConfig); }

  withKeyVaultConfig(config: KeyVaultConfig): this { return this.setServiceConfig(config); }

  getKeyVaultConfig(): KeyVaultConfig { return this.serviceConfig(KeyVaultConfig); }

  withManagedIdentityConfig(config: ManagedIdentityConfig): this { return this.setServiceConfig(config); }

  getManagedIdentityConfig(): ManagedIdentityConfig { return this.serviceConfig(ManagedIdentityConfig); }

  withMariaDbConfig(config: MariaDbConfig): this { return this.setServiceConfig(config); }

  getMariaDbConfig(): MariaDbConfig { return this.serviceConfig(MariaDbConfig); }

  withMonitorConfig(config: MonitorConfig): this { return this.setServiceConfig(config); }

  getMonitorConfig(): MonitorConfig { return this.serviceConfig(MonitorConfig); }

  withMySqlConfig(config: MySqlConfig): this { return this.setServiceConfig(config); }

  getMySqlConfig(): MySqlConfig { return this.serviceConfig(MySqlConfig); }

  withNetworkConfig(config: NetworkConfig): this { return this.setServiceConfig(config); }

  getNetworkConfig(): NetworkConfig { return this.serviceConfig(NetworkConfig); }

  withPolicyConfig(config: PolicyConfig): this { return this.setServiceConfig(config); }

  getPolicyConfig(): PolicyConfig { return this.serviceConfig(PolicyConfig); }

  withPostgresConfig(config: PostgresConfig): this { return this.setServiceConfig(config); }

  getPostgresConfig(): PostgresConfig { return this.serviceConfig(PostgresConfig); }

  withQueueConfig(config: QueueConfig): this { return this.setServiceConfig(config); }

  getQueueConfig(): QueueConfig { return this.serviceConfig(QueueConfig); }

  withRedisConfig(config: RedisConfig): this { return this.setServiceConfig(config); }

  getRedisConfig(): RedisConfig { return this.serviceConfig(RedisConfig); }

  withServiceBusConfig(config: ServiceBusConfig): this { return this.setServiceConfig(config); }

  getServiceBusConfig(): ServiceBusConfig { return this.serviceConfig(ServiceBusConfig); }

  withSignalRConfig(config: SignalRConfig): this { return this.setServiceConfig(config); }

  getSignalRConfig(): SignalRConfig { return this.serviceConfig(SignalRConfig); }

  withSqlConfig(config: SqlConfig): this { return this.setServiceConfig(config); }

  getSqlConfig(): SqlConfig { return this.serviceConfig(SqlConfig); }

  withTableConfig(config: TableConfig): this { return this.setServiceConfig(config); }

  getTableConfig(): TableConfig { return this.serviceConfig(TableConfig); }

  withVmConfig(config: VmConfig): this { return this.setServiceConfig(config); }

  getVmConfig(): VmConfig { return this.serviceConfig(VmConfig); }

  async start(): Promise<StartedFlociAzContainer> {
    const { container, network } = await this.startContainer();
    return new StartedFlociAzContainer(container, {
      dedicatedNetworkName: this.dedicatedNetworkName,
      network,
      resourceNamespace: this.getResourceNamespace(),
    });
  }

  private setServiceConfig(next: AzServiceConfig): this {
    this.replaceConfigEnv(this.serviceConfigs.get(next.token), next);
    this.serviceConfigs.set(next.token, next);
    return this;
  }

  private serviceConfig<T extends AzServiceConfig>(type: new () => T): T {
    for (const cfg of this.serviceConfigs.values()) {
      if (cfg instanceof type) {
        return cfg;
      }
    }
    throw new Error(`no ${type.name} registered`);
  }
}

/** A running Floci Azure emulator: endpoints, the storage account and the fixed identities. */
export class StartedFlociAzContainer extends StartedFlociBaseContainer {
  constructor(
    container: StartedTestContainer,
    opts: { dedicatedNetworkName?: string; network?: StartedNetwork; resourceNamespace?: string } = {},
  ) {
    super(container, AZ, opts.network, opts.dedicatedNetworkName, opts.resourceNamespace);
  }

  /** `https://host:port` on the emulator port, which serves HTTPS too once TLS is enabled. */
  getHttpsEndpoint(): string {
    return `https://${this.container.getHost()}:${this.container.getMappedPort(FlociAzContainer.PORT)}`;
  }

  /** The PEM certificate to trust for {@link getHttpsEndpoint}; fails unless TLS is enabled. */
  async getTlsCertificate(): Promise<string> {
    const res = await fetch(this.getEndpoint() + TLS_CERT_PATH);
    const body = await res.text();
    if (res.status !== 200) {
      throw new Error(`TLS certificate not available (HTTP ${res.status}): ${body}`);
    }
    return body;
  }

  /** The emulator's only subscription; it is fixed and has no setting. */
  getSubscriptionId(): string { return FlociAzContainer.DEFAULT_SUBSCRIPTION_ID; }
  getTenantId(): string { return FlociAzContainer.DEFAULT_TENANT_ID; }
  getAccountName(): string { return FlociAzContainer.DEFAULT_ACCOUNT_NAME; }
  getAccountKey(): string { return FlociAzContainer.DEFAULT_ACCOUNT_KEY; }

  getBlobEndpoint(): string { return `${this.getEndpoint()}/${this.getAccountName()}`; }
  getQueueEndpoint(): string { return `${this.getEndpoint()}/${this.getAccountName()}-queue`; }
  getTableEndpoint(): string { return `${this.getEndpoint()}/${this.getAccountName()}-table`; }

  /** A connection string for the Azure Storage SDKs (Blob, Queue and Table). */
  getStorageConnectionString(): string {
    return (
      'DefaultEndpointsProtocol=http' +
      `;AccountName=${this.getAccountName()}` +
      `;AccountKey=${this.getAccountKey()}` +
      `;BlobEndpoint=${this.getBlobEndpoint()}` +
      `;QueueEndpoint=${this.getQueueEndpoint()}` +
      `;TableEndpoint=${this.getTableEndpoint()}` +
      ';'
    );
  }
}

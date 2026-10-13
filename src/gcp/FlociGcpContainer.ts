import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { FlociBaseContainer, StartedFlociBaseContainer } from '../core';
import type { CloudDescriptor } from '../core';
import {
  GcpServiceConfig,
  BigQueryConfig,
  CloudFunctionsConfig,
  CloudRunConfig,
  CloudSqlConfig,
  CloudTasksConfig,
  ComputeConfig,
  DatastoreConfig,
  EventarcConfig,
  FirebaseAuthConfig,
  FirestoreConfig,
  GcsConfig,
  GkeConfig,
  IamConfig,
  IamCredentialsConfig,
  KafkaConfig,
  KmsConfig,
  LoggingConfig,
  MonitoringConfig,
  PubSubConfig,
  ResourceManagerConfig,
  SchedulerConfig,
  SecretManagerConfig,
  ServiceUsageConfig,
  StsConfig,
} from './config/services';
import { TlsConfig } from './config/TlsConfig';

const DEFAULT_IMAGE = 'floci/floci-gcp:latest';
const TLS_CERT_PATH = '/_floci-gcp/tls-cert';
const PROJECT_ID_ENV = 'FLOCI_GCP_DEFAULT_PROJECT_ID';

/** The GCP emulator (`floci/floci-gcp`) as data, for the shared core. */
export const GCP: CloudDescriptor = {
  name: 'gcp',
  defaultImage: DEFAULT_IMAGE,
  port: 4588,
  envPrefix: 'FLOCI_GCP_',
  healthPath: '/_floci-gcp/health',
  resetPath: '/_floci-gcp/state/reset',
  logLevelEnv: 'QUARKUS_LOG_CATEGORY__IO_FLOCI_GCP__LEVEL',
  // Services that spawn sibling containers. Cloud Functions is not one: it is control plane only.
  socketServices: [
    // BigQuery starts no DuckDB sidecar when it is pointed at one that already runs.
    { token: 'BIGQUERY', mockable: true, spawnsContainers: (setting) => !setting('DUCK_URL') },
    { token: 'CLOUDRUN', mockable: true },
    { token: 'CLOUDSQL', mockable: true },
    { token: 'GKE', mockable: true },
    { token: 'KAFKA', mockable: true },
  ],
  defaultEnv: {
    // The extra HTTPS listener defaults to 443, which an unprivileged container cannot bind.
    FLOCI_GCP_TLS_HTTPS_PORT: '0',
  },
};

/**
 * Testcontainers module for Floci GCP — a free, open-source local Google Cloud emulator.
 *
 * @example
 * ```ts
 * const floci = await new FlociGcpContainer().start();
 * Object.assign(process.env, floci.getEmulatorEnv());
 * const pubsub = new PubSub({ projectId: floci.getProjectId() });
 * await floci.stop();
 * ```
 */
export class FlociGcpContainer extends FlociBaseContainer {
  static readonly PORT = 4588;
  static readonly DEFAULT_PROJECT_ID = 'floci-local';

  private readonly serviceConfigs = new Map<string, GcpServiceConfig>();
  private tlsConfig = new TlsConfig();

  constructor(image = DEFAULT_IMAGE) {
    super(GCP, image);
    const defaults: GcpServiceConfig[] = [
      new BigQueryConfig(),
      new CloudFunctionsConfig(),
      new CloudRunConfig(),
      new CloudSqlConfig(),
      new CloudTasksConfig(),
      new ComputeConfig(),
      new DatastoreConfig(),
      new EventarcConfig(),
      new FirebaseAuthConfig(),
      new FirestoreConfig(),
      new GcsConfig(),
      new GkeConfig(),
      new IamConfig(),
      new IamCredentialsConfig(),
      new KafkaConfig(),
      new KmsConfig(),
      new LoggingConfig(),
      new MonitoringConfig(),
      new PubSubConfig(),
      new ResourceManagerConfig(),
      new SchedulerConfig(),
      new SecretManagerConfig(),
      new ServiceUsageConfig(),
      new StsConfig(),
    ];
    for (const cfg of defaults) {
      this.serviceConfigs.set(cfg.token, cfg);
      cfg.applyEnvVarsTo(this);
    }
    this.tlsConfig.applyEnvVarsTo(this);
  }

  /** The project used when a request names none. The emulator accepts any project id. */
  withProjectId(projectId: string): this {
    return this.withEnv(PROJECT_ID_ENV, projectId);
  }

  getProjectId(): string {
    return this.envVars[PROJECT_ID_ENV] ?? FlociGcpContainer.DEFAULT_PROJECT_ID;
  }

  /** Every service config as it is now, one per emulator service. */
  getServiceConfigs(): readonly GcpServiceConfig[] {
    return Array.from(this.serviceConfigs.values());
  }

  withTlsConfig(config: TlsConfig): this {
    this.replaceConfigEnv(this.tlsConfig, config);
    this.tlsConfig = config;
    return this;
  }

  getTlsConfig(): TlsConfig { return this.tlsConfig; }

  withBigQueryConfig(config: BigQueryConfig): this { return this.setServiceConfig(config); }

  getBigQueryConfig(): BigQueryConfig { return this.serviceConfig(BigQueryConfig); }

  withCloudFunctionsConfig(config: CloudFunctionsConfig): this { return this.setServiceConfig(config); }

  getCloudFunctionsConfig(): CloudFunctionsConfig { return this.serviceConfig(CloudFunctionsConfig); }

  withCloudRunConfig(config: CloudRunConfig): this { return this.setServiceConfig(config); }

  getCloudRunConfig(): CloudRunConfig { return this.serviceConfig(CloudRunConfig); }

  withCloudSqlConfig(config: CloudSqlConfig): this { return this.setServiceConfig(config); }

  getCloudSqlConfig(): CloudSqlConfig { return this.serviceConfig(CloudSqlConfig); }

  withCloudTasksConfig(config: CloudTasksConfig): this { return this.setServiceConfig(config); }

  getCloudTasksConfig(): CloudTasksConfig { return this.serviceConfig(CloudTasksConfig); }

  withComputeConfig(config: ComputeConfig): this { return this.setServiceConfig(config); }

  getComputeConfig(): ComputeConfig { return this.serviceConfig(ComputeConfig); }

  withDatastoreConfig(config: DatastoreConfig): this { return this.setServiceConfig(config); }

  getDatastoreConfig(): DatastoreConfig { return this.serviceConfig(DatastoreConfig); }

  withEventarcConfig(config: EventarcConfig): this { return this.setServiceConfig(config); }

  getEventarcConfig(): EventarcConfig { return this.serviceConfig(EventarcConfig); }

  withFirebaseAuthConfig(config: FirebaseAuthConfig): this { return this.setServiceConfig(config); }

  getFirebaseAuthConfig(): FirebaseAuthConfig { return this.serviceConfig(FirebaseAuthConfig); }

  withFirestoreConfig(config: FirestoreConfig): this { return this.setServiceConfig(config); }

  getFirestoreConfig(): FirestoreConfig { return this.serviceConfig(FirestoreConfig); }

  withGcsConfig(config: GcsConfig): this { return this.setServiceConfig(config); }

  getGcsConfig(): GcsConfig { return this.serviceConfig(GcsConfig); }

  withGkeConfig(config: GkeConfig): this { return this.setServiceConfig(config); }

  getGkeConfig(): GkeConfig { return this.serviceConfig(GkeConfig); }

  withIamConfig(config: IamConfig): this { return this.setServiceConfig(config); }

  getIamConfig(): IamConfig { return this.serviceConfig(IamConfig); }

  withIamCredentialsConfig(config: IamCredentialsConfig): this { return this.setServiceConfig(config); }

  getIamCredentialsConfig(): IamCredentialsConfig { return this.serviceConfig(IamCredentialsConfig); }

  withKafkaConfig(config: KafkaConfig): this { return this.setServiceConfig(config); }

  getKafkaConfig(): KafkaConfig { return this.serviceConfig(KafkaConfig); }

  withKmsConfig(config: KmsConfig): this { return this.setServiceConfig(config); }

  getKmsConfig(): KmsConfig { return this.serviceConfig(KmsConfig); }

  withLoggingConfig(config: LoggingConfig): this { return this.setServiceConfig(config); }

  getLoggingConfig(): LoggingConfig { return this.serviceConfig(LoggingConfig); }

  withMonitoringConfig(config: MonitoringConfig): this { return this.setServiceConfig(config); }

  getMonitoringConfig(): MonitoringConfig { return this.serviceConfig(MonitoringConfig); }

  withPubSubConfig(config: PubSubConfig): this { return this.setServiceConfig(config); }

  getPubSubConfig(): PubSubConfig { return this.serviceConfig(PubSubConfig); }

  withResourceManagerConfig(config: ResourceManagerConfig): this { return this.setServiceConfig(config); }

  getResourceManagerConfig(): ResourceManagerConfig { return this.serviceConfig(ResourceManagerConfig); }

  withSchedulerConfig(config: SchedulerConfig): this { return this.setServiceConfig(config); }

  getSchedulerConfig(): SchedulerConfig { return this.serviceConfig(SchedulerConfig); }

  withSecretManagerConfig(config: SecretManagerConfig): this { return this.setServiceConfig(config); }

  getSecretManagerConfig(): SecretManagerConfig { return this.serviceConfig(SecretManagerConfig); }

  withServiceUsageConfig(config: ServiceUsageConfig): this { return this.setServiceConfig(config); }

  getServiceUsageConfig(): ServiceUsageConfig { return this.serviceConfig(ServiceUsageConfig); }

  withStsConfig(config: StsConfig): this { return this.setServiceConfig(config); }

  getStsConfig(): StsConfig { return this.serviceConfig(StsConfig); }

  async start(): Promise<StartedFlociGcpContainer> {
    const { container, network } = await this.startContainer();
    return new StartedFlociGcpContainer(container, {
      dedicatedNetworkName: this.dedicatedNetworkName,
      network,
      resourceNamespace: this.getResourceNamespace(),
      projectId: this.getProjectId(),
    });
  }

  private setServiceConfig(next: GcpServiceConfig): this {
    this.replaceConfigEnv(this.serviceConfigs.get(next.token), next);
    this.serviceConfigs.set(next.token, next);
    return this;
  }

  private serviceConfig<T extends GcpServiceConfig>(type: new () => T): T {
    for (const cfg of this.serviceConfigs.values()) {
      if (cfg instanceof type) {
        return cfg;
      }
    }
    throw new Error(`no ${type.name} registered`);
  }
}

/** A running Floci GCP emulator: the endpoint, the project and the variables Google SDKs read. */
export class StartedFlociGcpContainer extends StartedFlociBaseContainer {
  private readonly projectId: string;

  constructor(
    container: StartedTestContainer,
    opts: {
      dedicatedNetworkName?: string;
      network?: StartedNetwork;
      resourceNamespace?: string;
      projectId?: string;
    } = {},
  ) {
    super(container, GCP, opts.network, opts.dedicatedNetworkName, opts.resourceNamespace);
    this.projectId = opts.projectId ?? FlociGcpContainer.DEFAULT_PROJECT_ID;
  }

  /** `https://host:port` on the emulator port, which serves HTTPS too once TLS is enabled. */
  getHttpsEndpoint(): string {
    return `https://${this.getHostAndPort()}`;
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

  /** The emulator's default project. */
  getProjectId(): string { return this.projectId; }

  /**
   * The variables Google Cloud SDKs read to find an emulator, all pointing at this container over
   * plain HTTP. Merge them into `process.env` before creating a client, or pass them to a child
   * process. Every value is `host:port`, except `STORAGE_EMULATOR_HOST`, which is a URL.
   * No client library reads `LOGGING_EMULATOR_HOST` or `KMS_EMULATOR_HOST`: they are a convention of
   * the emulator's own tests, for code that builds its Logging or KMS client from them.
   * Services without such a variable (BigQuery, Cloud Tasks, ...) take {@link getEndpoint} as
   * the client's API endpoint.
   */
  getEmulatorEnv(): Record<string, string> {
    const hostPort = this.getHostAndPort();
    return {
      PUBSUB_EMULATOR_HOST: hostPort,
      FIRESTORE_EMULATOR_HOST: hostPort,
      DATASTORE_EMULATOR_HOST: hostPort,
      SECRET_MANAGER_EMULATOR_HOST: hostPort,
      FIREBASE_AUTH_EMULATOR_HOST: hostPort,
      LOGGING_EMULATOR_HOST: hostPort,
      KMS_EMULATOR_HOST: hostPort,
      STORAGE_EMULATOR_HOST: this.getEndpoint(),
      STORAGE_EMULATOR_HOST_GRPC: hostPort,
      GOOGLE_CLOUD_PROJECT: this.projectId,
    };
  }

  private getHostAndPort(): string {
    return `${this.container.getHost()}:${this.container.getMappedPort(FlociGcpContainer.PORT)}`;
  }
}

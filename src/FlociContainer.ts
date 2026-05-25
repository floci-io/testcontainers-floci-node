import crypto from 'crypto';
import fs from 'fs';
import { GenericContainer, Network, StartedTestContainer, Wait } from 'testcontainers';
import type { StartedNetwork, ExecResult } from 'testcontainers';
import type { ServiceConfig } from './config/services';
import {
  AcmConfig,
  ApiGatewayConfig,
  ApiGatewayV2Config,
  AppConfigConfig,
  AppConfigDataConfig,
  AthenaConfig,
  BackupConfig,
  BcmDataExportsConfig,
  BedrockRuntimeConfig,
  CloudFormationConfig,
  CloudFrontConfig,
  CloudWatchLogsConfig,
  CloudWatchMetricsConfig,
  CodeBuildConfig,
  CodeDeployConfig,
  CognitoConfig,
  ConfigServiceConfig,
  CostExplorerConfig,
  CurConfig,
  DynamoDbConfig,
  Ec2Config,
  EcrConfig,
  EcsConfig,
  EksConfig,
  ElastiCacheConfig,
  ElbV2Config,
  EventBridgeConfig,
  FirehoseConfig,
  GlueConfig,
  IamConfig,
  KinesisConfig,
  KmsConfig,
  LambdaConfig,
  MskConfig,
  NeptuneConfig,
  OpenSearchConfig,
  PipesConfig,
  PricingConfig,
  RdsConfig,
  ResourceGroupsTaggingConfig,
  Route53Config,
  S3Config,
  SchedulerConfig,
  SecretsManagerConfig,
  SesConfig,
  SesV2Config,
  SnsConfig,
  SqsConfig,
  SsmConfig,
  StepFunctionsConfig,
  TextractConfig,
  TransferFamilyConfig,
} from './config/services';
import { TlsConfig } from './config/TlsConfig';
import { StorageConfig } from './config/StorageConfig';
import { DuckDbConfig } from './config/DuckDbConfig';

const DEFAULT_IMAGE = 'floci/floci:latest';
const DOCKER_SOCKET = '/var/run/docker.sock';

/**
 * Valid log levels for the Floci container.
 */
export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Testcontainers module for Floci — a free, open-source local AWS emulator.
 *
 * @example
 * ```ts
 * const floci = await new FlociContainer().start();
 * const s3 = new S3Client({
 *   endpoint: floci.getEndpoint(),
 *   region: floci.getRegion(),
 *   credentials: { accessKeyId: floci.getAccessKey(), secretAccessKey: floci.getSecretKey() },
 *   forcePathStyle: true,
 * });
 * await floci.stop();
 * ```
 */
export class FlociContainer {
  static readonly PORT = 4566;
  static readonly DEFAULT_REGION = 'us-east-1';
  static readonly DEFAULT_AVAILABILITY_ZONE = 'us-east-1a';
  static readonly DEFAULT_ACCOUNT_ID = '000000000000';
  static readonly DEFAULT_ACCESS_KEY = 'test';
  static readonly DEFAULT_SECRET_KEY = 'test';
  static readonly STARTUP_TIMEOUT_MS = 120_000;

  private readonly image: string;
  private readonly envVars: Record<string, string> = {};
  private readonly exposedPorts: Set<number> = new Set([FlociContainer.PORT]);
  private dedicatedNetworkName?: string;
  private logLevel: LogLevel = 'WARN';

  private acmConfig = new AcmConfig();
  private apiGatewayConfig = new ApiGatewayConfig();
  private apiGatewayV2Config = new ApiGatewayV2Config();
  private appConfigConfig = new AppConfigConfig();
  private appConfigDataConfig = new AppConfigDataConfig();
  private athenaConfig = new AthenaConfig();
  private bedrockRuntimeConfig = new BedrockRuntimeConfig();
  private cloudFormationConfig = new CloudFormationConfig();
  private cloudWatchLogsConfig = new CloudWatchLogsConfig();
  private cloudWatchMetricsConfig = new CloudWatchMetricsConfig();
  private codeBuildConfig = new CodeBuildConfig();
  private codeDeployConfig = new CodeDeployConfig();
  private cognitoConfig = new CognitoConfig();
  private dynamoDbConfig = new DynamoDbConfig();
  private ec2Config = new Ec2Config();
  private ecrConfig = new EcrConfig();
  private ecsConfig = new EcsConfig();
  private eksConfig = new EksConfig();
  private elastiCacheConfig = new ElastiCacheConfig();
  private elbV2Config = new ElbV2Config();
  private eventBridgeConfig = new EventBridgeConfig();
  private firehoseConfig = new FirehoseConfig();
  private glueConfig = new GlueConfig();
  private iamConfig = new IamConfig();
  private kinesisConfig = new KinesisConfig();
  private kmsConfig = new KmsConfig();
  private lambdaConfig = new LambdaConfig();
  private mskConfig = new MskConfig();
  private openSearchConfig = new OpenSearchConfig();
  private pipesConfig = new PipesConfig();
  private rdsConfig = new RdsConfig();
  private resourceGroupsTaggingConfig = new ResourceGroupsTaggingConfig();
  private s3Config = new S3Config();
  private schedulerConfig = new SchedulerConfig();
  private secretsManagerConfig = new SecretsManagerConfig();
  private sesConfig = new SesConfig();
  private sesV2Config = new SesV2Config();
  private snsConfig = new SnsConfig();
  private sqsConfig = new SqsConfig();
  private ssmConfig = new SsmConfig();
  private stepFunctionsConfig = new StepFunctionsConfig();
  private cloudFrontConfig = new CloudFrontConfig();
  private configServiceConfig = new ConfigServiceConfig();
  private backupConfig = new BackupConfig();
  private transferFamilyConfig = new TransferFamilyConfig();
  private route53Config = new Route53Config();
  private textractConfig = new TextractConfig();
  private pricingConfig = new PricingConfig();
  private neptuneConfig = new NeptuneConfig();
  private costExplorerConfig = new CostExplorerConfig();
  private curConfig = new CurConfig();
  private bcmDataExportsConfig = new BcmDataExportsConfig();
  private tlsConfig = new TlsConfig();
  private storageConfig?: StorageConfig;
  private duckDbConfig = new DuckDbConfig();

  constructor(image = DEFAULT_IMAGE) {
    this.image = image;
    this.withEnv('FLOCI_DEFAULT_REGION', FlociContainer.DEFAULT_REGION);
    this.withEnv('FLOCI_DEFAULT_ACCOUNT_ID', FlociContainer.DEFAULT_ACCOUNT_ID);
    this.withEnv('FLOCI_DEFAULT_AVAILABILITY_ZONE', FlociContainer.DEFAULT_AVAILABILITY_ZONE);
    this.withEnv('QUARKUS_LOG_CATEGORY__IO_GITHUB_HECTORVENT__LEVEL', this.logLevel);
    this.applyAllConfigs();
  }

  withEnv(key: string, value: string): this {
    this.envVars[key] = value;
    return this;
  }

  withExposedPort(port: number): this {
    this.exposedPorts.add(port);
    return this;
  }

  withRegion(region: string): this {
    return this.withEnv('FLOCI_DEFAULT_REGION', region);
  }

  withAccountId(accountId: string): this {
    return this.withEnv('FLOCI_DEFAULT_ACCOUNT_ID', accountId);
  }

  withAvailabilityZone(zone: string): this {
    return this.withEnv('FLOCI_DEFAULT_AVAILABILITY_ZONE', zone);
  }

  withDedicatedNetwork(): this {
    const name = `floci-network-${crypto.randomBytes(4).toString('hex')}`;
    this.dedicatedNetworkName = name;
    return this.withEnv('FLOCI_SERVICES_DOCKER_NETWORK', name);
  }

  withLogLevel(level: LogLevel): this {
    const valid: LogLevel[] = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'];
    if (!valid.includes(level)) {
      throw new Error(`Invalid log level "${level}". Must be one of: ${valid.join(', ')}`);
    }
    this.logLevel = level;
    this.withEnv('QUARKUS_LOG_CATEGORY__IO_GITHUB_HECTORVENT__LEVEL', level);
    return this;
  }

  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  withAcmConfig(config: AcmConfig): this {
    this.acmConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getAcmConfig(): AcmConfig { return this.acmConfig; }

  withApiGatewayConfig(config: ApiGatewayConfig): this {
    this.apiGatewayConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getApiGatewayConfig(): ApiGatewayConfig { return this.apiGatewayConfig; }

  withApiGatewayV2Config(config: ApiGatewayV2Config): this {
    this.apiGatewayV2Config = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getApiGatewayV2Config(): ApiGatewayV2Config { return this.apiGatewayV2Config; }

  withAppConfigConfig(config: AppConfigConfig): this {
    this.appConfigConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getAppConfigConfig(): AppConfigConfig { return this.appConfigConfig; }

  withAppConfigDataConfig(config: AppConfigDataConfig): this {
    this.appConfigDataConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getAppConfigDataConfig(): AppConfigDataConfig { return this.appConfigDataConfig; }

  withAthenaConfig(config: AthenaConfig): this {
    this.athenaConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getAthenaConfig(): AthenaConfig { return this.athenaConfig; }

  withBedrockRuntimeConfig(config: BedrockRuntimeConfig): this {
    this.bedrockRuntimeConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getBedrockRuntimeConfig(): BedrockRuntimeConfig { return this.bedrockRuntimeConfig; }

  withCloudFormationConfig(config: CloudFormationConfig): this {
    this.cloudFormationConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getCloudFormationConfig(): CloudFormationConfig { return this.cloudFormationConfig; }

  withCloudWatchLogsConfig(config: CloudWatchLogsConfig): this {
    this.cloudWatchLogsConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getCloudWatchLogsConfig(): CloudWatchLogsConfig { return this.cloudWatchLogsConfig; }

  withCloudWatchMetricsConfig(config: CloudWatchMetricsConfig): this {
    this.cloudWatchMetricsConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getCloudWatchMetricsConfig(): CloudWatchMetricsConfig { return this.cloudWatchMetricsConfig; }

  withCodeBuildConfig(config: CodeBuildConfig): this {
    this.codeBuildConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getCodeBuildConfig(): CodeBuildConfig { return this.codeBuildConfig; }

  withCodeDeployConfig(config: CodeDeployConfig): this {
    this.codeDeployConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getCodeDeployConfig(): CodeDeployConfig { return this.codeDeployConfig; }

  withCognitoConfig(config: CognitoConfig): this {
    this.cognitoConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getCognitoConfig(): CognitoConfig { return this.cognitoConfig; }

  withDynamoDbConfig(config: DynamoDbConfig): this {
    this.dynamoDbConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getDynamoDbConfig(): DynamoDbConfig { return this.dynamoDbConfig; }

  withEc2Config(config: Ec2Config): this {
    this.ec2Config = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getEc2Config(): Ec2Config { return this.ec2Config; }

  withEcrConfig(config: EcrConfig): this {
    this.ecrConfig = config;
    this.refreshExposedPorts();
    config.applyEnvVarsTo(this);
    return this;
  }

  getEcrConfig(): EcrConfig { return this.ecrConfig; }

  withEcsConfig(config: EcsConfig): this {
    this.ecsConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getEcsConfig(): EcsConfig { return this.ecsConfig; }

  withEksConfig(config: EksConfig): this {
    this.eksConfig = config;
    this.refreshExposedPorts();
    config.applyEnvVarsTo(this);
    return this;
  }

  getEksConfig(): EksConfig { return this.eksConfig; }

  withElastiCacheConfig(config: ElastiCacheConfig): this {
    this.elastiCacheConfig = config;
    this.refreshExposedPorts();
    config.applyEnvVarsTo(this);
    return this;
  }

  getElastiCacheConfig(): ElastiCacheConfig { return this.elastiCacheConfig; }

  withElbV2Config(config: ElbV2Config): this {
    this.elbV2Config = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getElbV2Config(): ElbV2Config { return this.elbV2Config; }

  withEventBridgeConfig(config: EventBridgeConfig): this {
    this.eventBridgeConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getEventBridgeConfig(): EventBridgeConfig { return this.eventBridgeConfig; }

  withFirehoseConfig(config: FirehoseConfig): this {
    this.firehoseConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getFirehoseConfig(): FirehoseConfig { return this.firehoseConfig; }

  withGlueConfig(config: GlueConfig): this {
    this.glueConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getGlueConfig(): GlueConfig { return this.glueConfig; }

  withIamConfig(config: IamConfig): this {
    this.iamConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getIamConfig(): IamConfig { return this.iamConfig; }

  withKinesisConfig(config: KinesisConfig): this {
    this.kinesisConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getKinesisConfig(): KinesisConfig { return this.kinesisConfig; }

  withKmsConfig(config: KmsConfig): this {
    this.kmsConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getKmsConfig(): KmsConfig { return this.kmsConfig; }

  withLambdaConfig(config: LambdaConfig): this {
    this.lambdaConfig = config;
    this.refreshExposedPorts();
    config.applyEnvVarsTo(this);
    return this;
  }

  getLambdaConfig(): LambdaConfig { return this.lambdaConfig; }

  withMskConfig(config: MskConfig): this {
    this.mskConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getMskConfig(): MskConfig { return this.mskConfig; }

  withOpenSearchConfig(config: OpenSearchConfig): this {
    this.openSearchConfig = config;
    this.refreshExposedPorts();
    config.applyEnvVarsTo(this);
    return this;
  }

  getOpenSearchConfig(): OpenSearchConfig { return this.openSearchConfig; }

  withPipesConfig(config: PipesConfig): this {
    this.pipesConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getPipesConfig(): PipesConfig { return this.pipesConfig; }

  withRdsConfig(config: RdsConfig): this {
    this.rdsConfig = config;
    this.refreshExposedPorts();
    config.applyEnvVarsTo(this);
    return this;
  }

  getRdsConfig(): RdsConfig { return this.rdsConfig; }

  withResourceGroupsTaggingConfig(config: ResourceGroupsTaggingConfig): this {
    this.resourceGroupsTaggingConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getResourceGroupsTaggingConfig(): ResourceGroupsTaggingConfig { return this.resourceGroupsTaggingConfig; }

  withS3Config(config: S3Config): this {
    this.s3Config = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getS3Config(): S3Config { return this.s3Config; }

  withSchedulerConfig(config: SchedulerConfig): this {
    this.schedulerConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getSchedulerConfig(): SchedulerConfig { return this.schedulerConfig; }

  withSecretsManagerConfig(config: SecretsManagerConfig): this {
    this.secretsManagerConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getSecretsManagerConfig(): SecretsManagerConfig { return this.secretsManagerConfig; }

  withSesConfig(config: SesConfig): this {
    this.sesConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getSesConfig(): SesConfig { return this.sesConfig; }

  withSesV2Config(config: SesV2Config): this {
    this.sesV2Config = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getSesV2Config(): SesV2Config { return this.sesV2Config; }

  withSnsConfig(config: SnsConfig): this {
    this.snsConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getSnsConfig(): SnsConfig { return this.snsConfig; }

  withSqsConfig(config: SqsConfig): this {
    this.sqsConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getSqsConfig(): SqsConfig { return this.sqsConfig; }

  withSsmConfig(config: SsmConfig): this {
    this.ssmConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getSsmConfig(): SsmConfig { return this.ssmConfig; }

  withStepFunctionsConfig(config: StepFunctionsConfig): this {
    this.stepFunctionsConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getStepFunctionsConfig(): StepFunctionsConfig { return this.stepFunctionsConfig; }

  withCloudFrontConfig(config: CloudFrontConfig): this {
    this.cloudFrontConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getCloudFrontConfig(): CloudFrontConfig { return this.cloudFrontConfig; }

  withConfigServiceConfig(config: ConfigServiceConfig): this {
    this.configServiceConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getConfigServiceConfig(): ConfigServiceConfig { return this.configServiceConfig; }

  withBackupConfig(config: BackupConfig): this {
    this.backupConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getBackupConfig(): BackupConfig { return this.backupConfig; }

  withTransferFamilyConfig(config: TransferFamilyConfig): this {
    this.transferFamilyConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getTransferFamilyConfig(): TransferFamilyConfig { return this.transferFamilyConfig; }

  withRoute53Config(config: Route53Config): this {
    this.route53Config = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getRoute53Config(): Route53Config { return this.route53Config; }

  withTextractConfig(config: TextractConfig): this {
    this.textractConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getTextractConfig(): TextractConfig { return this.textractConfig; }

  withPricingConfig(config: PricingConfig): this {
    this.pricingConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getPricingConfig(): PricingConfig { return this.pricingConfig; }

  withNeptuneConfig(config: NeptuneConfig): this {
    this.neptuneConfig = config;
    this.refreshExposedPorts();
    config.applyEnvVarsTo(this);
    return this;
  }

  getNeptuneConfig(): NeptuneConfig { return this.neptuneConfig; }

  withCostExplorerConfig(config: CostExplorerConfig): this {
    this.costExplorerConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getCostExplorerConfig(): CostExplorerConfig { return this.costExplorerConfig; }

  withCurConfig(config: CurConfig): this {
    this.curConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getCurConfig(): CurConfig { return this.curConfig; }

  withBcmDataExportsConfig(config: BcmDataExportsConfig): this {
    this.bcmDataExportsConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getBcmDataExportsConfig(): BcmDataExportsConfig { return this.bcmDataExportsConfig; }

  withTlsConfig(config: TlsConfig): this {
    this.tlsConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getTlsConfig(): TlsConfig { return this.tlsConfig; }

  withStorageConfig(config: StorageConfig): this {
    this.storageConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getStorageConfig(): StorageConfig | undefined { return this.storageConfig; }

  withDuckDbConfig(config: DuckDbConfig): this {
    this.duckDbConfig = config;
    config.applyEnvVarsTo(this);
    return this;
  }

  getDuckDbConfig(): DuckDbConfig { return this.duckDbConfig; }

  getDedicatedNetworkName(): string | undefined {
    return this.dedicatedNetworkName;
  }

  async start(): Promise<StartedFlociContainer> {
    let network: StartedNetwork | undefined;
    if (this.dedicatedNetworkName) {
      const networkName = this.dedicatedNetworkName;
      network = await new Network({ nextUuid: () => networkName }).start();
    }

    const bindMounts: Array<{ source: string; target: string; mode: 'rw' }> = [
      { source: DOCKER_SOCKET, target: DOCKER_SOCKET, mode: 'rw' },
    ];

    if (this.storageConfig?.hostPersistentPath) {
      bindMounts.push({ source: this.storageConfig.hostPersistentPath, target: '/app/data', mode: 'rw' });
    }

    let container = new GenericContainer(this.image)
      .withExposedPorts(...Array.from(this.exposedPorts))
      .withEnvironment(this.envVars)
      .withBindMounts(bindMounts)
      .withWaitStrategy(
        Wait.forHttp('/_floci/health', FlociContainer.PORT)
          .forStatusCode(200)
          .withStartupTimeout(FlociContainer.STARTUP_TIMEOUT_MS),
      );

    if (network) {
      container = container.withNetwork(network);
    }

    const started = await container.start();
    return new StartedFlociContainer(started, {
      region: this.envVars['FLOCI_DEFAULT_REGION'] ?? FlociContainer.DEFAULT_REGION,
      availabilityZone: this.envVars['FLOCI_DEFAULT_AVAILABILITY_ZONE'] ?? FlociContainer.DEFAULT_AVAILABILITY_ZONE,
      accountId: this.envVars['FLOCI_DEFAULT_ACCOUNT_ID'] ?? FlociContainer.DEFAULT_ACCOUNT_ID,
      dedicatedNetworkName: this.dedicatedNetworkName,
      network,
      tlsEnabled: this.tlsConfig.enabled,
      hostPersistentPath: this.storageConfig?.hostPersistentPath,
    });
  }

  private applyAllConfigs(): void {
    const configs: ServiceConfig[] = [
      this.acmConfig, this.apiGatewayConfig, this.apiGatewayV2Config,
      this.appConfigConfig, this.appConfigDataConfig, this.athenaConfig,
      this.bedrockRuntimeConfig, this.cloudFormationConfig, this.cloudWatchLogsConfig,
      this.cloudWatchMetricsConfig, this.codeBuildConfig, this.codeDeployConfig,
      this.cognitoConfig, this.dynamoDbConfig, this.ec2Config, this.ecrConfig,
      this.ecsConfig, this.eksConfig, this.elastiCacheConfig, this.elbV2Config,
      this.eventBridgeConfig, this.firehoseConfig, this.glueConfig, this.iamConfig,
      this.kinesisConfig, this.kmsConfig, this.lambdaConfig, this.mskConfig,
      this.openSearchConfig, this.pipesConfig, this.rdsConfig,
      this.resourceGroupsTaggingConfig, this.s3Config, this.schedulerConfig,
      this.secretsManagerConfig, this.sesConfig, this.sesV2Config, this.snsConfig,
      this.sqsConfig, this.ssmConfig, this.stepFunctionsConfig,
      this.cloudFrontConfig, this.configServiceConfig, this.backupConfig,
      this.transferFamilyConfig, this.route53Config, this.textractConfig,
      this.pricingConfig, this.neptuneConfig, this.costExplorerConfig,
      this.curConfig, this.bcmDataExportsConfig, this.tlsConfig, this.duckDbConfig,
    ];
    for (const config of configs) {
      config.applyEnvVarsTo(this);
    }
    if (this.storageConfig) {
      this.storageConfig.applyEnvVarsTo(this);
    }
    this.refreshExposedPorts();
  }

  private refreshExposedPorts(): void {
    const portConfigs: ServiceConfig[] = [
      this.lambdaConfig, this.rdsConfig, this.elastiCacheConfig,
      this.openSearchConfig, this.ecrConfig, this.eksConfig,
      this.neptuneConfig, this.ec2Config, this.elbV2Config,
    ];
    for (const config of portConfigs) {
      config.applyExposedPortsTo(this);
    }
  }
}

export class StartedFlociContainer {
  private readonly container: StartedTestContainer;
  private readonly region: string;
  private readonly availabilityZone: string;
  private readonly accountId: string;
  private readonly _dedicatedNetworkName?: string;
  private readonly network?: StartedNetwork;
  private readonly tlsEnabled: boolean;
  private readonly hostPersistentPath?: string;

  constructor(
    container: StartedTestContainer,
    opts: {
      region: string;
      availabilityZone: string;
      accountId: string;
      dedicatedNetworkName?: string;
      network?: StartedNetwork;
      tlsEnabled: boolean;
      hostPersistentPath?: string;
    },
  ) {
    this.container = container;
    this.region = opts.region;
    this.availabilityZone = opts.availabilityZone;
    this.accountId = opts.accountId;
    this._dedicatedNetworkName = opts.dedicatedNetworkName;
    this.network = opts.network;
    this.tlsEnabled = opts.tlsEnabled;
    this.hostPersistentPath = opts.hostPersistentPath;
  }

  getEndpoint(): string {
    return `http://${this.container.getHost()}:${this.container.getMappedPort(FlociContainer.PORT)}`;
  }

  getSecureEndpoint(): string {
    if (!this.tlsEnabled) {
      throw new Error('TLS is not enabled on this container. Use withTlsConfig(new TlsConfig(true)) before starting.');
    }
    return `https://${this.container.getHost()}:${this.container.getMappedPort(FlociContainer.PORT)}`;
  }

  getRegion(): string { return this.region; }
  getAccessKey(): string { return FlociContainer.DEFAULT_ACCESS_KEY; }
  getSecretKey(): string { return FlociContainer.DEFAULT_SECRET_KEY; }
  getAccountId(): string { return this.accountId; }
  getAvailabilityZone(): string { return this.availabilityZone; }
  getDedicatedNetworkName(): string | undefined { return this._dedicatedNetworkName; }

  getMappedPort(port: number): number {
    return this.container.getMappedPort(port);
  }

  async exec(command: string[]): Promise<ExecResult> {
    return this.container.exec(command);
  }

  async stop(): Promise<void> {
    await this.container.stop();
    if (this.network) {
      await this.network.stop();
    }
    // Cleanup persistent storage if a host path was configured
    if (this.hostPersistentPath) {
      try {
        fs.rmSync(this.hostPersistentPath, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors silently (matches Java behavior)
      }
    }
  }
}

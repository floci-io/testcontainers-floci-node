export { AWS, FlociContainer, StartedFlociContainer } from './aws/FlociContainer';
export type { LogLevel } from './aws/FlociContainer';
export type { ServiceConfig, FlociContainerTarget } from './aws/config';
export {
  AcmConfig,
  ApiGatewayConfig,
  ApiGatewayV2Config,
  AppConfigConfig,
  AppConfigDataConfig,
  AthenaConfig,
  BedrockRuntimeConfig,
  CloudFormationConfig,
  CloudWatchLogsConfig,
  CloudWatchMetricsConfig,
  CodeBuildConfig,
  CodeDeployConfig,
  CognitoConfig,
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
  OpenSearchConfig,
  PipesConfig,
  RdsConfig,
  ResourceGroupsTaggingConfig,
  S3Config,
  SchedulerConfig,
  SecretsManagerConfig,
  SesConfig,
  SesV2Config,
  SnsConfig,
  SqsConfig,
  SsmConfig,
  StepFunctionsConfig,
  CloudFrontConfig,
  ConfigServiceConfig,
  BackupConfig,
  TransferFamilyConfig,
  Route53Config,
  TextractConfig,
  PricingConfig,
  NeptuneConfig,
  CostExplorerConfig,
  CurConfig,
  BcmDataExportsConfig,
  TlsConfig,
  StorageConfig,
  DuckDbConfig,
} from './aws/config';

// Shared core: the base every cloud module builds on.
export type { BindMount, CloudDescriptor, HostSetting, ServiceSettingReader, SocketService } from './core';
export {
  DOCKER_SOCKET,
  FlociBaseContainer,
  StartedFlociBaseContainer,
  dockerSocketRequired,
  networkEnv,
  resourceNamespaceEnv,
  serviceEnv,
  tlsEnabled,
  tlsEnabledEnv,
} from './core';

// Azure (floci/floci-az). The container classes are exported by name; the Azure service configs
// live under the `az` namespace because some share a name with an AWS config (e.g. `TlsConfig`).
export { AZ, FlociAzContainer, StartedFlociAzContainer } from './az';
export * as az from './az';

// GCP (floci/floci-gcp). Same shape as Azure: container classes by name, service configs under `gcp`.
export { GCP, FlociGcpContainer, StartedFlociGcpContainer } from './gcp';
export * as gcp from './gcp';

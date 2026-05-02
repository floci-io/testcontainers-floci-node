export interface FlociContainerTarget {
  withEnv(key: string, value: string): unknown;
  withExposedPort(port: number): unknown;
}

export interface ServiceConfig {
  applyEnvVarsTo(container: FlociContainerTarget): void;
  applyExposedPortsTo(container: FlociContainerTarget): void;
}

function range(start: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => start + i);
}

export class AcmConfig implements ServiceConfig {
  constructor(
    readonly enabled: boolean = true,
    readonly validationWaitSeconds: number = 0,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_ACM_ENABLED', String(this.enabled));
    c.withEnv('FLOCI_SERVICES_ACM_VALIDATION_WAIT_SECONDS', String(this.validationWaitSeconds));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class ApiGatewayConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_APIGATEWAY_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class ApiGatewayV2Config implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_APIGATEWAYV2_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class AppConfigConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_APPCONFIG_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class AppConfigDataConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_APPCONFIGDATA_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class AthenaConfig implements ServiceConfig {
  constructor(
    readonly enabled: boolean = true,
    readonly mock: boolean = false,
    readonly defaultImage: string = 'floci/floci-duck:latest',
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_ATHENA_ENABLED', String(this.enabled));
    c.withEnv('FLOCI_SERVICES_ATHENA_MOCK', String(this.mock));
    c.withEnv('FLOCI_SERVICES_ATHENA_DEFAULT_IMAGE', this.defaultImage);
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class BedrockRuntimeConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_BEDROCK_RUNTIME_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class CloudFormationConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_CLOUDFORMATION_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class CloudWatchLogsConfig implements ServiceConfig {
  constructor(
    readonly enabled: boolean = true,
    readonly maxEventsPerQuery: number = 10000,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_CLOUDWATCH_LOGS_ENABLED', String(this.enabled));
    c.withEnv('FLOCI_SERVICES_CLOUDWATCH_LOGS_MAX_EVENTS_PER_QUERY', String(this.maxEventsPerQuery));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class CloudWatchMetricsConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_CLOUDWATCH_METRICS_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class CodeBuildConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_CODEBUILD_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class CodeDeployConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_CODEDEPLOY_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class CognitoConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_COGNITO_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class DynamoDbConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_DYNAMODB_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class Ec2Config implements ServiceConfig {
  constructor(
    readonly enabled: boolean = true,
    readonly mock: boolean = false,
    readonly imdsPort: number = 9169,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_EC2_ENABLED', String(this.enabled));
    c.withEnv('FLOCI_SERVICES_EC2_MOCK', String(this.mock));
    c.withEnv('FLOCI_SERVICES_EC2_IMDS_PORT', String(this.imdsPort));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class EcrConfig implements ServiceConfig {
  constructor(
    readonly enabled: boolean = true,
    readonly registryImage: string = 'registry:2',
    readonly registryBasePort: number = 5100,
    readonly registryPortCount: number = 100,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_ECR_ENABLED', String(this.enabled));
    c.withEnv('FLOCI_SERVICES_ECR_REGISTRY_IMAGE', this.registryImage);
    c.withEnv('FLOCI_SERVICES_ECR_REGISTRY_BASE_PORT', String(this.registryBasePort));
  }

  applyExposedPortsTo(c: FlociContainerTarget): void {
    for (const port of range(this.registryBasePort, this.registryPortCount)) {
      c.withExposedPort(port);
    }
  }
}

export class EcsConfig implements ServiceConfig {
  constructor(
    readonly enabled: boolean = true,
    readonly mock: boolean = false,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_ECS_ENABLED', String(this.enabled));
    c.withEnv('FLOCI_SERVICES_ECS_MOCK', String(this.mock));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class EksConfig implements ServiceConfig {
  constructor(
    readonly enabled: boolean = true,
    readonly mock: boolean = false,
    readonly provider: string = 'k3s',
    readonly defaultImage: string = 'rancher/k3s:latest',
    readonly apiServerBasePort: number = 6500,
    readonly apiServerPortCount: number = 100,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_EKS_ENABLED', String(this.enabled));
    c.withEnv('FLOCI_SERVICES_EKS_MOCK', String(this.mock));
    c.withEnv('FLOCI_SERVICES_EKS_PROVIDER', this.provider);
    c.withEnv('FLOCI_SERVICES_EKS_DEFAULT_IMAGE', this.defaultImage);
    c.withEnv('FLOCI_SERVICES_EKS_API_SERVER_BASE_PORT', String(this.apiServerBasePort));
  }

  applyExposedPortsTo(c: FlociContainerTarget): void {
    for (const port of range(this.apiServerBasePort, this.apiServerPortCount)) {
      c.withExposedPort(port);
    }
  }
}

export class ElastiCacheConfig implements ServiceConfig {
  constructor(
    readonly enabled: boolean = true,
    readonly defaultImage: string = 'valkey/valkey:8',
    readonly proxyBasePort: number = 6379,
    readonly proxyPortCount: number = 21,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_ELASTICACHE_ENABLED', String(this.enabled));
    c.withEnv('FLOCI_SERVICES_ELASTICACHE_DEFAULT_IMAGE', this.defaultImage);
    c.withEnv('FLOCI_SERVICES_ELASTICACHE_PROXY_BASE_PORT', String(this.proxyBasePort));
  }

  applyExposedPortsTo(c: FlociContainerTarget): void {
    for (const port of range(this.proxyBasePort, this.proxyPortCount)) {
      c.withExposedPort(port);
    }
  }
}

export class ElbV2Config implements ServiceConfig {
  constructor(
    readonly enabled: boolean = true,
    readonly mock: boolean = false,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_ELBV2_ENABLED', String(this.enabled));
    c.withEnv('FLOCI_SERVICES_ELBV2_MOCK', String(this.mock));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class EventBridgeConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_EVENTBRIDGE_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class FirehoseConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_FIREHOSE_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class GlueConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_GLUE_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class IamConfig implements ServiceConfig {
  constructor(
    readonly enabled: boolean = true,
    readonly enforcementEnabled: boolean = false,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_IAM_ENABLED', String(this.enabled));
    c.withEnv('FLOCI_SERVICES_IAM_ENFORCEMENT_ENABLED', String(this.enforcementEnabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class KinesisConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_KINESIS_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class KmsConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_KMS_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class LambdaConfig implements ServiceConfig {
  constructor(
    readonly enabled: boolean = true,
    readonly defaultMemoryMb: number = 128,
    readonly defaultTimeoutSeconds: number = 3,
    readonly ephemeral: boolean = false,
    readonly hotReloadEnabled: boolean = false,
    readonly runtimeApiBasePort: number = 9200,
    readonly runtimeApiPortCount: number = 100,
    readonly exposeRuntimePorts: boolean = false,
    readonly dockerNetwork?: string,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_LAMBDA_ENABLED', String(this.enabled));
    c.withEnv('FLOCI_SERVICES_LAMBDA_DEFAULT_MEMORY_MB', String(this.defaultMemoryMb));
    c.withEnv('FLOCI_SERVICES_LAMBDA_DEFAULT_TIMEOUT_SECONDS', String(this.defaultTimeoutSeconds));
    c.withEnv('FLOCI_SERVICES_LAMBDA_EPHEMERAL', String(this.ephemeral));
    c.withEnv('FLOCI_SERVICES_LAMBDA_HOT_RELOAD_ENABLED', String(this.hotReloadEnabled));
    c.withEnv('FLOCI_SERVICES_LAMBDA_RUNTIME_API_BASE_PORT', String(this.runtimeApiBasePort));
    if (this.dockerNetwork) {
      c.withEnv('FLOCI_SERVICES_LAMBDA_DOCKER_NETWORK', this.dockerNetwork);
    }
  }

  applyExposedPortsTo(c: FlociContainerTarget): void {
    if (this.exposeRuntimePorts) {
      for (const port of range(this.runtimeApiBasePort, this.runtimeApiPortCount)) {
        c.withExposedPort(port);
      }
    }
  }
}

export class MskConfig implements ServiceConfig {
  constructor(
    readonly enabled: boolean = true,
    readonly mock: boolean = false,
    readonly defaultImage: string = 'redpandadata/redpanda:latest',
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_MSK_ENABLED', String(this.enabled));
    c.withEnv('FLOCI_SERVICES_MSK_MOCK', String(this.mock));
    c.withEnv('FLOCI_SERVICES_MSK_DEFAULT_IMAGE', this.defaultImage);
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class OpenSearchConfig implements ServiceConfig {
  constructor(
    readonly enabled: boolean = true,
    readonly mock: boolean = false,
    readonly defaultImage: string = 'opensearchproject/opensearch:2',
    readonly proxyBasePort: number = 9400,
    readonly proxyPortCount: number = 100,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_OPENSEARCH_ENABLED', String(this.enabled));
    c.withEnv('FLOCI_SERVICES_OPENSEARCH_MOCK', String(this.mock));
    c.withEnv('FLOCI_SERVICES_OPENSEARCH_DEFAULT_IMAGE', this.defaultImage);
    c.withEnv('FLOCI_SERVICES_OPENSEARCH_PROXY_BASE_PORT', String(this.proxyBasePort));
  }

  applyExposedPortsTo(c: FlociContainerTarget): void {
    for (const port of range(this.proxyBasePort, this.proxyPortCount)) {
      c.withExposedPort(port);
    }
  }
}

export class PipesConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_PIPES_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class RdsConfig implements ServiceConfig {
  constructor(
    readonly enabled: boolean = true,
    readonly proxyBasePort: number = 7001,
    readonly proxyPortCount: number = 99,
    readonly defaultPostgresImage: string = 'postgres:16-alpine',
    readonly defaultMysqlImage: string = 'mysql:8.0',
    readonly defaultMariadbImage: string = 'mariadb:11',
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_RDS_ENABLED', String(this.enabled));
    c.withEnv('FLOCI_SERVICES_RDS_PROXY_BASE_PORT', String(this.proxyBasePort));
    c.withEnv('FLOCI_SERVICES_RDS_DEFAULT_POSTGRES_IMAGE', this.defaultPostgresImage);
    c.withEnv('FLOCI_SERVICES_RDS_DEFAULT_MYSQL_IMAGE', this.defaultMysqlImage);
    c.withEnv('FLOCI_SERVICES_RDS_DEFAULT_MARIADB_IMAGE', this.defaultMariadbImage);
  }

  applyExposedPortsTo(c: FlociContainerTarget): void {
    for (const port of range(this.proxyBasePort, this.proxyPortCount)) {
      c.withExposedPort(port);
    }
  }
}

export class ResourceGroupsTaggingConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_RESOURCEGROUPSTAGGING_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class S3Config implements ServiceConfig {
  constructor(
    readonly enabled: boolean = true,
    readonly defaultPresignExpirySeconds: number = 3600,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_S3_ENABLED', String(this.enabled));
    c.withEnv('FLOCI_SERVICES_S3_DEFAULT_PRESIGN_EXPIRY_SECONDS', String(this.defaultPresignExpirySeconds));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class SchedulerConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_SCHEDULER_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class SecretsManagerConfig implements ServiceConfig {
  constructor(
    readonly enabled: boolean = true,
    readonly defaultRecoveryWindowDays: number = 30,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_SECRETS_MANAGER_ENABLED', String(this.enabled));
    c.withEnv('FLOCI_SERVICES_SECRETS_MANAGER_DEFAULT_RECOVERY_WINDOW_DAYS', String(this.defaultRecoveryWindowDays));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class SesConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_SES_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class SesV2Config implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_SES_V2_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class SnsConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_SNS_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class SqsConfig implements ServiceConfig {
  constructor(
    readonly enabled: boolean = true,
    readonly defaultVisibilityTimeout: number = 30,
    readonly maxMessageSize: number = 262144,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_SQS_ENABLED', String(this.enabled));
    c.withEnv('FLOCI_SERVICES_SQS_DEFAULT_VISIBILITY_TIMEOUT', String(this.defaultVisibilityTimeout));
    c.withEnv('FLOCI_SERVICES_SQS_MAX_MESSAGE_SIZE', String(this.maxMessageSize));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class SsmConfig implements ServiceConfig {
  constructor(
    readonly enabled: boolean = true,
    readonly maxParameterHistory: number = 5,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_SSM_ENABLED', String(this.enabled));
    c.withEnv('FLOCI_SERVICES_SSM_MAX_PARAMETER_HISTORY', String(this.maxParameterHistory));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

export class StepFunctionsConfig implements ServiceConfig {
  constructor(readonly enabled: boolean = true) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_STEPFUNCTIONS_ENABLED', String(this.enabled));
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

# @floci/testcontainers

[![npm version](https://img.shields.io/npm/v/%40floci%2Ftestcontainers.svg)](https://www.npmjs.com/package/@floci/testcontainers)
[![Node versions](https://img.shields.io/node/v/%40floci%2Ftestcontainers.svg)](https://www.npmjs.com/package/@floci/testcontainers)
[![CI](https://github.com/floci-io/testcontainers-floci-node/actions/workflows/ci.yml/badge.svg)](https://github.com/floci-io/testcontainers-floci-node/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Node.js [Testcontainers](https://testcontainers.com) module for [Floci](https://github.com/floci-io/floci) — the open-source, drop-in replacement for LocalStack Community Edition.

Floci emulates **41 AWS services** in a single container with:
- **~24 ms** startup time (native image)
- **~13 MiB** idle memory
- **~90 MB** Docker image
- No auth tokens, no feature gates, MIT license

## Installation

```bash
# npm
npm install --save-dev @floci/testcontainers

# yarn
yarn add --dev @floci/testcontainers

# pnpm
pnpm add --save-dev @floci/testcontainers
```

## Quick start

```ts
import { S3Client, CreateBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import { FlociContainer } from '@floci/testcontainers';

describe('S3', () => {
  let floci: Awaited<ReturnType<FlociContainer['start']>>;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
  });

  afterAll(async () => {
    await floci.stop();
  });

  it('creates and lists a bucket', async () => {
    const s3 = new S3Client({
      endpoint: floci.getEndpoint(),
      region: floci.getRegion(),
      credentials: {
        accessKeyId: floci.getAccessKey(),
        secretAccessKey: floci.getSecretKey(),
      },
      forcePathStyle: true,
    });

    await s3.send(new CreateBucketCommand({ Bucket: 'my-bucket' }));
    const { Buckets } = await s3.send(new ListBucketsCommand({}));
    expect(Buckets?.map((b) => b.Name)).toContain('my-bucket');
  });
});
```
## Jest note

Integration tests that use AWS SDK v3 may need Node VM modules enabled when running under Jest:

```sh
NODE_OPTIONS=--experimental-vm-modules npm test
## Sharing a container across tests

```ts
import { FlociContainer, StartedFlociContainer } from '@floci/testcontainers';

let floci: StartedFlociContainer;

beforeAll(async () => {
  floci = await new FlociContainer().start();
});

afterAll(async () => {
  await floci.stop();
});
```

## Service configuration

Each of Floci's 41 services can be configured individually using typed config classes.

### S3

```ts
import { FlociContainer, S3Config } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withS3Config(new S3Config(true, 7200))
  .start();
```

### SQS

```ts
import { SqsConfig } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withSqsConfig(new SqsConfig(true, 60, 262144))
  .start();
```

### DynamoDB

```ts
import { DynamoDbConfig } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withDynamoDbConfig(new DynamoDbConfig(true))
  .start();
```

### Lambda

```ts
import { LambdaConfig } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withLambdaConfig(new LambdaConfig(
    true,   // enabled
    256,    // defaultMemoryMb
    30,     // defaultTimeoutSeconds
    false,  // ephemeral
    true,   // hotReloadEnabled
  ))
  .start();
```

### RDS (PostgreSQL / MySQL / MariaDB)

```ts
import { RdsConfig } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withRdsConfig(new RdsConfig(true, 7001, 99, 'postgres:16-alpine'))
  .start();
```

### ElastiCache (Redis / Valkey)

```ts
import { ElastiCacheConfig } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withElastiCacheConfig(new ElastiCacheConfig(true, 'valkey/valkey:8'))
  .start();
```

### OpenSearch

```ts
import { OpenSearchConfig } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withOpenSearchConfig(new OpenSearchConfig(true, false))
  .start();
```

### MSK (Kafka via Redpanda)

```ts
import { MskConfig } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withMskConfig(new MskConfig(true, false, 'redpandadata/redpanda:latest'))
  .start();
```
## AWS SDK v3 Example (S3)

```ts
import { FlociContainer } from "@floci/testcontainers";
import { S3Client, CreateBucketCommand, ListBucketsCommand } from "@aws-sdk/client-s3";

const floci = await new FlociContainer().start();

const client = new S3Client({
  region: "us-east-1",
  endpoint: floci.getEndpoint(),
  credentials: {
    accessKeyId: "test",
    secretAccessKey: "test",
  },
  forcePathStyle: true,
});

await client.send(
  new CreateBucketCommand({
    Bucket: "example-bucket",
  }),
);

const buckets = await client.send(new ListBucketsCommand({}));

console.log(buckets.Buckets);

await floci.stop();
```

### TLS Configuration

```ts
import { FlociContainer, TlsConfig } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withTlsConfig(new TlsConfig(true, true))
  .start();

const endpoint = floci.getSecureEndpoint(); // https://host:port
await floci.stop();
```

### Storage Configuration

```ts
import { FlociContainer, StorageConfig } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withStorageConfig(new StorageConfig('/tmp/floci-data', true))
  .start();

await floci.stop();
```

### DuckDB Configuration

```ts
import { FlociContainer, DuckDbConfig } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withDuckDbConfig(new DuckDbConfig('floci/floci-duck:latest'))
  .start();

await floci.stop();
```

### Log Level

```ts
import { FlociContainer } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withLogLevel('DEBUG')
  .start();

await floci.stop();
```

### All available config classes

| Config class | AWS service |
|---|---|
| `AcmConfig` | AWS Certificate Manager |
| `ApiGatewayConfig` | API Gateway (v1) |
| `ApiGatewayV2Config` | API Gateway (v2) |
| `AppConfigConfig` | AppConfig |
| `AppConfigDataConfig` | AppConfig Data |
| `AthenaConfig` | Athena |
| `BackupConfig` | AWS Backup |
| `BcmDataExportsConfig` | BCM Data Exports |
| `BedrockRuntimeConfig` | Bedrock Runtime |
| `CloudFormationConfig` | CloudFormation |
| `CloudFrontConfig` | CloudFront |
| `CloudWatchLogsConfig` | CloudWatch Logs |
| `CloudWatchMetricsConfig` | CloudWatch Metrics |
| `CodeBuildConfig` | CodeBuild |
| `CodeDeployConfig` | CodeDeploy |
| `CognitoConfig` | Cognito |
| `ConfigServiceConfig` | AWS Config |
| `CostExplorerConfig` | Cost Explorer |
| `CurConfig` | Cost and Usage Reports |
| `DynamoDbConfig` | DynamoDB |
| `Ec2Config` | EC2 |
| `EcrConfig` | ECR |
| `EcsConfig` | ECS |
| `EksConfig` | EKS |
| `ElastiCacheConfig` | ElastiCache |
| `ElbV2Config` | ELB v2 |
| `EventBridgeConfig` | EventBridge |
| `FirehoseConfig` | Kinesis Firehose |
| `GlueConfig` | Glue |
| `IamConfig` | IAM |
| `KinesisConfig` | Kinesis |
| `KmsConfig` | KMS |
| `LambdaConfig` | Lambda |
| `MskConfig` | MSK (Kafka) |
| `NeptuneConfig` | Neptune |
| `OpenSearchConfig` | OpenSearch |
| `PipesConfig` | EventBridge Pipes |
| `PricingConfig` | AWS Pricing |
| `RdsConfig` | RDS |
| `ResourceGroupsTaggingConfig` | Resource Groups Tagging |
| `Route53Config` | Route 53 |
| `S3Config` | S3 |
| `SchedulerConfig` | EventBridge Scheduler |
| `SecretsManagerConfig` | Secrets Manager |
| `SesConfig` | SES |
| `SesV2Config` | SES v2 |
| `SnsConfig` | SNS |
| `SqsConfig` | SQS |
| `SsmConfig` | SSM Parameter Store |
| `StepFunctionsConfig` | Step Functions |
| `TextractConfig` | Textract |
| `TransferFamilyConfig` | Transfer Family |

## Container options

By default, only the Floci gateway port (4566) is published to the host. Extra service ports are published only when their service configuration is explicitly supplied, or when `withExposedPort(port)` is called. Replacing a service configuration updates its published port range; disabling the service removes that range. This avoids publishing hundreds of unused proxy ports for tests that only use the gateway.

```ts
const floci = await new FlociContainer('floci/floci:latest')  // pin a specific tag
  .withRegion('eu-west-1')
  .withAccountId('111122223333')
  .withAvailabilityZone('eu-west-1a')
  .withDedicatedNetwork()   // isolated Docker network for stateful services
  .start();
```

### Connection details

| Method | Returns |
|---|---|
| `getEndpoint()` | `http://host:port` — pass as `endpoint` to AWS SDK clients |
| `getRegion()` | AWS region string |
| `getAccessKey()` | Access key (`"test"` by default) |
| `getSecretKey()` | Secret key (`"test"` by default) |
| `getAccountId()` | AWS account ID |
| `getMappedPort(port)` | Host port mapped from the given container port |

## Docker image variants

| Tag | Description |
|---|---|
| `floci/floci:latest` | Native image — sub-second startup (recommended) |
| `floci/floci:x.y.z` | Pinned release (native) |

## Troubleshooting

### Docker not running

**Symptom:** `Cannot connect to the Docker daemon` or container fails to start.

**Cause:** The Docker daemon is not running or the current user lacks permissions.

**Resolution:**
1. Start Docker Desktop or the Docker daemon (`sudo systemctl start docker`)
2. Verify with `docker info`
3. Ensure your user is in the `docker` group (`sudo usermod -aG docker $USER`)

### Port conflicts

**Symptom:** `Bind for 0.0.0.0:<port> failed: port is already allocated`

**Cause:** Another process or container is using the same port.

**Resolution:**
1. Identify the conflicting process: `lsof -i :<port>` or `docker ps`
2. Stop the conflicting process or container
3. Alternatively, let Testcontainers use random port mapping (the default behavior)

### Timeout errors

**Symptom:** `Timeout waiting for container to be ready` or test timeout exceeded.

**Cause:** The Floci container takes longer to start than the configured timeout.

**Resolution:**
1. Increase the Jest test timeout: `jest.setTimeout(120_000)`
2. Ensure Docker has sufficient resources (CPU/memory)
3. Check container logs for startup errors: `docker logs <container-id>`
4. Use `withLogLevel('DEBUG')` to get more verbose container output

## Requirements

- Node.js 18+
- Docker (running locally or in CI)
- `testcontainers >= 10.0.0`

## Related projects

- [Floci](https://github.com/floci-io/floci) — the emulator itself
- [testcontainers-floci](https://github.com/floci-io/testcontainers-floci) — Java / Spring Boot module
- [testcontainers-floci-python](https://github.com/floci-io/testcontainers-floci-python) — Python module
- [Testcontainers for Node.js](https://node.testcontainers.org)

## License

MIT

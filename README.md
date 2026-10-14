<p align="center">
  <img src="https://raw.githubusercontent.com/floci-io/.github/main/floci.svg#gh-light-mode-only" alt="Floci" width="500" />
  <img src="https://github.com/user-attachments/assets/edfff8b3-926c-471e-9549-77fb90a21b49#gh-dark-mode-only" alt="Floci" width="500" />
</p>

<p align="center">
  <strong>Any Cloud. Locally.</strong><br />
  Light, fluffy, and always free: Testcontainers for Node.js<br />
  No account. No auth token. No feature gates.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@floci/testcontainers"><img src="https://img.shields.io/npm/v/%40floci%2Ftestcontainers?label=npm&color=blue" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@floci/testcontainers"><img src="https://img.shields.io/node/v/%40floci%2Ftestcontainers" alt="Node versions"></a>
  <a href="https://github.com/floci-io/testcontainers-floci-node/actions/workflows/ci.yml"><img src="https://github.com/floci-io/testcontainers-floci-node/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-green" alt="License: MIT"></a>
  <a href="https://github.com/floci-io/testcontainers-floci-node/stargazers"><img src="https://img.shields.io/github/stars/floci-io/testcontainers-floci-node?style=flat" alt="GitHub Stars"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#service-configuration">Configuration</a> ·
  <a href="#the-floci-emulators">Emulators</a> ·
  <a href="https://floci.io/floci/testcontainers/nodejs/">Docs</a>
</p>

---

## What is this?

A Node.js / TypeScript [Testcontainers](https://testcontainers.com/) module for [Floci](https://github.com/floci-io),
the free, open-source local cloud emulators. `FlociContainer` starts a Floci (AWS) container for your integration
tests and gives you an endpoint and credentials to point the AWS SDK v3 at, plus a typed, per-service configuration
API over the emulator's environment variables. `FlociAzContainer` does the same for [Azure](#azure) with the
Floci Azure emulator, `FlociGcpContainer` for [Google Cloud](#gcp) with the Floci GCP emulator and
`FlociOciContainer` for [Oracle Cloud Infrastructure](#oci) with the Floci OCI emulator. No cloud account, no auth token, MIT license.

See the [Floci documentation](https://floci.io/floci/services/) for the full list of supported AWS services.

### The Floci emulators

testcontainers-floci-node is the Node.js member of the [Floci](https://github.com/floci-io) Testcontainers family.
Floci is named after [floccus](https://en.wikipedia.org/wiki/Cirrocumulus_floccus), the cloud formation that looks
like popcorn.

| Emulator                                           | Cloud | Port | Supported                                                                      |
|----------------------------------------------------|-------|:----:|:------------------------------------------------------------------------------:|
| [floci](https://github.com/floci-io/floci)         | AWS   | 4566 | ✅ [`@floci/testcontainers`](https://www.npmjs.com/package/@floci/testcontainers) |
| [floci-az](https://github.com/floci-io/floci-az)   | Azure | 4577 | ✅ [`@floci/testcontainers`](https://www.npmjs.com/package/@floci/testcontainers) |
| [floci-gcp](https://github.com/floci-io/floci-gcp) | GCP   | 4588 | ✅ [`@floci/testcontainers`](https://www.npmjs.com/package/@floci/testcontainers) |
| [floci-oci](https://github.com/floci-io/floci-oci) | OCI   | 4599 | ✅ [`@floci/testcontainers`](https://www.npmjs.com/package/@floci/testcontainers) |

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

### Jest note

Integration tests that use AWS SDK v3 may need Node VM modules enabled when running under Jest:

```sh
NODE_OPTIONS=--experimental-vm-modules npm test
```

### Sharing a container across tests

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

### AWS SDK v3 Example (S3)

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

### Azure

`FlociAzContainer` starts the [Floci Azure](https://github.com/floci-io/floci-az) emulator (`floci/floci-az`, port
4577). It ships in the same package and shares the container behaviour described above: Docker socket detection,
`withDedicatedNetwork()`, `withLogLevel()`, the unique resource namespace, sibling cleanup on `stop()` and `reset()`.

```ts
import { BlobServiceClient } from '@azure/storage-blob';
import { FlociAzContainer } from '@floci/testcontainers';

const floci = await new FlociAzContainer().start();

const blobs = BlobServiceClient.fromConnectionString(floci.getStorageConnectionString());
await blobs.getContainerClient('my-container').create();

await floci.reset(); // wipe all state, keep the container
await floci.stop();
```

### GCP

`FlociGcpContainer` starts the [Floci GCP](https://github.com/floci-io/floci-gcp) emulator (`floci/floci-gcp`, port
4588), with the same shared container behaviour. Google's SDKs find an emulator through environment variables such as
`PUBSUB_EMULATOR_HOST` and `STORAGE_EMULATOR_HOST`; `getEmulatorEnv()` returns them all, pointing at the container.

```ts
import { PubSub } from '@google-cloud/pubsub';
import { Storage } from '@google-cloud/storage';
import { FlociGcpContainer } from '@floci/testcontainers';

const floci = await new FlociGcpContainer().start();
Object.assign(process.env, floci.getEmulatorEnv()); // before creating any client

const storage = new Storage({ projectId: floci.getProjectId() });
await storage.createBucket('my-bucket');

const pubsub = new PubSub({ projectId: floci.getProjectId() });
await pubsub.createTopic('my-topic');

await floci.reset(); // wipe all state, keep the container
await floci.stop();
```

Services without such a variable (BigQuery, Cloud Tasks, Cloud Run and others) take `floci.getEndpoint()` as the
client's API endpoint. So do Cloud Logging and Cloud KMS: no client library reads `LOGGING_EMULATOR_HOST` or
`KMS_EMULATOR_HOST`, which are there for code that builds those clients from them. The emulator accepts any project id; `withProjectId('my-project')` changes the default one,
`floci-local`.

### OCI

`FlociOciContainer` starts the [Floci OCI](https://github.com/floci-io/floci-oci) emulator (`floci/floci-oci`, port
4599), with the same shared container behaviour. The OCI SDKs sign every request, so the started container hands out
credentials they accept: a throwaway RSA key generated for the container, with the tenancy, user and fingerprint to
go with it. The emulator reads the tenancy from the signature and never verifies it.

```ts
import * as common from 'oci-common';
import { ObjectStorageClient } from 'oci-objectstorage';
import { FlociOciContainer } from '@floci/testcontainers';

const floci = await new FlociOciContainer().start();

const client = new ObjectStorageClient({
  authenticationDetailsProvider: new common.SimpleAuthenticationDetailsProvider(
    floci.getTenancyId(),
    floci.getUserId(),
    floci.getFingerprint(),
    floci.getPrivateKeyPem(),
    null,
    common.Region.fromRegionId(floci.getRegion()),
  ),
});
client.endpoint = floci.getEndpoint();

await client.createBucket({
  namespaceName: floci.getNamespace(),
  createBucketDetails: { name: 'my-bucket', compartmentId: floci.getTenancyId() },
});

await floci.reset(); // wipe all state, keep the container
await floci.stop();
```

For the OCI CLI, or an SDK set up from a config file, write the key to a file and
`floci.getConfigFileContents(keyFile, 'FLOCI')` to another: it is a config file with that one profile. The endpoint
is not part of an OCI config file, so it is still set on each client, or with `--endpoint` on the CLI.
`withRegion()`, `withTenancyId()` and `withNamespace()` change the emulator's defaults, and `withPrivateKeyPem()`
supplies your own key in place of the generated one.

## Service configuration

Each AWS service emulated by Floci can be configured individually using typed config classes passed to a
`with*Config(...)` method on `FlociContainer`. See the [Floci documentation](https://floci.io/floci/services/) for the
full list of supported services.

### Per-service examples

#### S3

```ts
import { FlociContainer, S3Config } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withS3Config(new S3Config(true, 7200))
  .start();
```

#### SQS

```ts
import { SqsConfig } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withSqsConfig(new SqsConfig(true, 60, 262144))
  .start();
```

#### DynamoDB

```ts
import { DynamoDbConfig } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withDynamoDbConfig(new DynamoDbConfig(true))
  .start();
```

#### Lambda

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

#### RDS (PostgreSQL / MySQL / MariaDB)

```ts
import { RdsConfig } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withRdsConfig(new RdsConfig(true, 7001, 99, 'postgres:16-alpine'))
  .start();
```

The container sets `FLOCI_SERVICES_RDS_ENDPOINT_HOST` to the Docker host, so `DescribeDBInstances` returns an
endpoint (host and published proxy port) that a client on the host can connect to, on Linux, macOS and Windows
alike. Pass `endpointHost`, the last `RdsConfig` argument, to advertise another hostname.

#### ElastiCache (Redis / Valkey)

```ts
import { ElastiCacheConfig } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withElastiCacheConfig(new ElastiCacheConfig(true, 'valkey/valkey:8'))
  .start();
```

#### OpenSearch

```ts
import { OpenSearchConfig } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withOpenSearchConfig(new OpenSearchConfig(true, false))
  .start();
```

#### MSK (Kafka via Redpanda)

```ts
import { MskConfig } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withMskConfig(new MskConfig(true, false, 'redpandadata/redpanda:latest'))
  .start();
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

With TLS enabled, on any of the emulators, `start()` returns only once the health path answers over HTTPS as well as
plain HTTP, so the first HTTPS request can be sent at once. The emulators accept connections a moment before their
HTTPS listener is up; the readiness probe does not validate the certificate.

### Storage Configuration

```ts
import { FlociContainer, StorageConfig } from '@floci/testcontainers';

const floci = await new FlociContainer()
  .withStorageConfig(new StorageConfig('/tmp/floci-data', true))
  .start();

await floci.stop();
```

### Docker Socket

Container-backed services (Lambda, RDS, ElastiCache, ECS, EC2, EKS, ECR, MSK, OpenSearch, Athena, CodeBuild, Neptune) start sibling containers and need the host Docker socket. It is mounted read-write at `/var/run/docker.sock` only while at least one of them is enabled and not in `mock` mode, decided from the final environment when the container starts. All services are enabled by default, so a default container gets the socket.

To never mount it (hosts where the socket cannot be mounted, such as rootless Podman with SELinux):

```ts
const floci = await new FlociContainer().withoutDockerSocket().start();
await floci.stop();
```

For a rootless Docker daemon, pass its host socket path. It is still mounted at `/var/run/docker.sock` inside Floci:

```ts
const floci = await new FlociContainer()
  .withDockerSocket(`${process.env.XDG_RUNTIME_DIR}/docker.sock`)
  .start();
await floci.stop();
```

`withDockerSocket()` (with or without a path) always mounts the socket, overriding detection.

Each container also gets a unique `FLOCI_DOCKER_RESOURCE_NAMESPACE` (`tc-…`), so sibling containers of parallel
test runs never collide by name; `withResourceNamespace(name)` overrides it.

Floci manages the sibling containers it spawns; the testcontainers reaper does not track them. `stop()` removes
every one of them after stopping Floci, found by the `floci_namespace` label that holds the namespace
(`getResourceNamespace()` on the started container). Containers that share a namespace lose their siblings together.

### Resetting state

`await floci.reset()` wipes all emulator state (buckets, queues, tables, …) without restarting the container, which
is handy when one container is shared across test files.

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

### Azure

Every Azure service has a config class with an `enabled` switch, and a `mocked` switch where the emulator has one.
They live under the `az` namespace, because some share a name with an AWS config:

```ts
import { FlociAzContainer, az } from '@floci/testcontainers';

const floci = await new FlociAzContainer()
  .withKeyVaultConfig(new az.KeyVaultConfig(false))        // disable a service
  .withServiceBusConfig(new az.ServiceBusConfig(true, false)) // enabled, not mocked: runs a real broker
  .withTlsConfig(new az.TlsConfig(true))
  .start();
```

Service Bus, Container Instances, Virtual Machines and Container Apps are mocked by default and start sibling
containers only when their mock is switched off. `az.CosmosConfig` also takes the engine startup mode and the
container-backed engines to enable, and `az.SqlConfig` the data plane provider; typed settings for the other
services will follow. Until then, set any emulator setting with `withEnv('FLOCI_AZ_…', value)`. The service list is
the emulator's: see the [Floci Azure repository](https://github.com/floci-io/floci-az).

The Docker socket is mounted only while an enabled, unmocked service needs sibling containers (for example Event
Hubs, Functions, Redis or the database services); `withDockerSocket()` and `withoutDockerSocket()` override that.

### GCP

Every GCP service has a config class with an `enabled` switch, and a `mock` switch where the emulator has one. They
live under the `gcp` namespace:

```ts
import { FlociGcpContainer, gcp } from '@floci/testcontainers';

const floci = await new FlociGcpContainer()
  .withFirestoreConfig(new gcp.FirestoreConfig(false))  // disable a service
  .withCloudSqlConfig(new gcp.CloudSqlConfig(true, true)) // enabled, mocked: no database container
  .withTlsConfig(new gcp.TlsConfig(true))
  .start();
```

Kubernetes Engine, Managed Kafka, Cloud SQL, Cloud Run and BigQuery run in sibling containers unless mocked, so the
Docker socket is mounted while any of them is enabled and unmocked; mock or disable all five, or call
`withoutDockerSocket()`, for a container that needs no socket. Typed settings for individual services will follow.
Until then, set any emulator setting with `withEnv('FLOCI_GCP_…', value)`. The service list is the emulator's: see the
[Floci GCP repository](https://github.com/floci-io/floci-gcp).

### OCI

Every OCI service has a config class with an `enabled` switch, and a `mock` switch where the emulator has one. They
live under the `oci` namespace:

```ts
import { FlociOciContainer, oci } from '@floci/testcontainers';

const floci = await new FlociOciContainer()
  .withStreamingConfig(new oci.StreamingConfig(false))     // disable a service
  .withFunctionsConfig(new oci.FunctionsConfig(true, true)) // enabled, mocked: no Fn server container
  .withOkeConfig(new oci.OkeConfig(true, true))
  .start();
```

Functions and Kubernetes Engine (OKE) run in sibling containers unless mocked, so the Docker socket is mounted while
either is enabled and unmocked. `oci.TlsConfig` enables TLS. Set any other emulator setting with
`withEnv('FLOCI_OCI_…', value)`. The service list is the emulator's: see the
[Floci OCI repository](https://github.com/floci-io/floci-oci).

## Container options

By default, only the Floci gateway port (4566) is published to the host. Extra service ports are published only when their service configuration is explicitly supplied, or when `withExposedPort(port)` is called. Replacing a service configuration updates its published port range; disabling the service removes that range. This avoids publishing hundreds of unused proxy ports for tests that only use the gateway.

```ts
const floci = await new FlociContainer('floci/floci:x.y.z')  // pin a specific tag
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

### Azure

| Method | Returns |
|---|---|
| `getEndpoint()` | `http://host:port` of the emulator |
| `getHttpsEndpoint()` | `https://host:port`, served on the same port once TLS is enabled |
| `getTlsCertificate()` | Promise of the PEM certificate to trust for the HTTPS endpoint (TLS must be enabled) |
| `getStorageConnectionString()` | Connection string for the Azure Storage SDKs (Blob, Queue, Table) |
| `getBlobEndpoint()` / `getQueueEndpoint()` / `getTableEndpoint()` | Per-service storage endpoints |
| `getAccountName()` / `getAccountKey()` | Storage account `devstoreaccount1` and its well-known development key |
| `getSubscriptionId()` | The emulator's fixed subscription id |
| `getTenantId()` | The default Microsoft Entra tenant id |

### GCP

| Method | Returns |
|---|---|
| `getEndpoint()` | `http://host:port` of the emulator |
| `getProjectId()` | The default project id, `floci-local` unless set with `withProjectId()` |
| `getEmulatorEnv()` | The variables Google SDKs read, as an object: `PUBSUB_EMULATOR_HOST`, `FIRESTORE_EMULATOR_HOST`, `DATASTORE_EMULATOR_HOST`, `SECRET_MANAGER_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`, `LOGGING_EMULATOR_HOST`, `KMS_EMULATOR_HOST` and `STORAGE_EMULATOR_HOST_GRPC` (`host:port`), `STORAGE_EMULATOR_HOST` (`http://host:port`) and `GOOGLE_CLOUD_PROJECT` |
| `getHttpsEndpoint()` | `https://host:port`, served on the same port once TLS is enabled |
| `getTlsCertificate()` | Promise of the PEM certificate to trust for the HTTPS endpoint (TLS must be enabled) |

### OCI

| Method | Returns |
|---|---|
| `getEndpoint()` | `http://host:port` of the emulator; set it as the endpoint of each OCI client |
| `getRegion()` | Region, `us-ashburn-1` unless set with `withRegion()` |
| `getTenancyId()` | Tenancy OCID, which is also the root compartment |
| `getNamespace()` | Object Storage namespace, `floci-local` unless set with `withNamespace()` |
| `getUserId()` / `getFingerprint()` | A user OCID and key fingerprint to sign with; the emulator accepts any |
| `getPrivateKeyPem()` | A throwaway RSA private key in PEM, generated once per container unless set with `withPrivateKeyPem()` |
| `getConfigFileContents(keyFile, profile?)` | Text of an OCI config file with one profile (`DEFAULT` unless named) whose `key_file` is `keyFile` |
| `getHttpsEndpoint()` | `https://host:port`, served on the same port once TLS is enabled |

### Troubleshooting

#### Docker not running

**Symptom:** `Cannot connect to the Docker daemon` or container fails to start.

**Cause:** The Docker daemon is not running or the current user lacks permissions.

**Resolution:**
1. Start Docker Desktop or the Docker daemon (`sudo systemctl start docker`)
2. Verify with `docker info`
3. Ensure your user is in the `docker` group (`sudo usermod -aG docker $USER`)

#### Port conflicts

**Symptom:** `Bind for 0.0.0.0:<port> failed: port is already allocated`

**Cause:** Another process or container is using the same port.

**Resolution:**
1. Identify the conflicting process: `lsof -i :<port>` or `docker ps`
2. Stop the conflicting process or container
3. Alternatively, let Testcontainers use random port mapping (the default behavior)

#### Timeout errors

**Symptom:** `Timeout waiting for container to be ready` or test timeout exceeded.

**Cause:** The Floci container takes longer to start than the configured timeout.

**Resolution:**
1. Increase the Jest test timeout: `jest.setTimeout(120_000)`
2. Ensure Docker has sufficient resources (CPU/memory)
3. Check container logs for startup errors: `docker logs <container-id>`
4. Use `withLogLevel('DEBUG')` to get more verbose container output

## Docker image tags

By default `FlociContainer` runs the floating `latest` tag of the emulator image (`floci/floci:latest`), so you always
test against the current emulator. Pass an image name to the constructor to pin a release or follow `main`:

```ts
new FlociContainer('floci/floci:x.y.z');   // a specific release
new FlociContainer('floci/floci:nightly'); // built from main every night
```

| Tag                   | Description                         |
|-----------------------|-------------------------------------|
| `floci/floci:latest`  | Latest release, native image (default, recommended) |
| `floci/floci:x.y.z`   | Pinned release (native)             |
| `floci/floci:nightly` | Built from `main` every night       |

Every emulator publishes `latest`, `x.y.z` and `nightly` tags. `FlociAzContainer` defaults to `floci/floci-az:latest`
`FlociGcpContainer` to `floci/floci-gcp:latest` and `FlociOciContainer` to `floci/floci-oci:latest`; each takes an
image name the same way.

## Requirements

- Node.js 18+
- Docker (running locally or in CI)
- `testcontainers >= 10.0.0`

## Building and testing

```bash
npm ci                     # install dependencies
npm run typecheck          # type-check (the lint gate CI enforces)
npm test                   # all tests, unit and integration
npm run test:unit          # unit tests only, no Docker required
npm run test:integration   # integration tests, Docker must be running
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the project layout, the branching model, and how to add a service.

## Other languages

| Language | Repository |
|---|---|
| Java | [testcontainers-floci](https://github.com/floci-io/testcontainers-floci) |
| Node.js / TypeScript | **testcontainers-floci-node** (this repo) |
| Python | [testcontainers-floci-python](https://github.com/floci-io/testcontainers-floci-python) |
| Go | [testcontainers-floci-go](https://github.com/floci-io/testcontainers-floci-go) |
| .NET | [testcontainers-floci-dotnet](https://github.com/floci-io/testcontainers-floci-dotnet) |

## Community

- 💬 [Slack](https://join.slack.com/t/floci/shared_invite/zt-3tjn02s3q-A00kEjJ1cZxsg_imTfy6Cw): quick questions and community chat
- 🗣️ [GitHub Discussions](https://github.com/orgs/floci-io/discussions): ideas, design tradeoffs, and proposals
- [CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md) · [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) · [MAINTAINERS.md](MAINTAINERS.md)

## License

MIT. See [LICENSE](LICENSE).

---

<div align="center">

Floci™ is a trademark of Hector Ventura. Code is MIT-licensed; see
[TRADEMARK.md](https://github.com/floci-io/.github/blob/main/TRADEMARK.md) for name and logo use.

</div>

import type { FlociContainerTarget, ServiceConfig } from '../../core';

export type { FlociContainerTarget, ServiceConfig };

const PREFIX = 'FLOCI_GCP_SERVICES_';

/**
 * A GCP service of the emulator: `FLOCI_GCP_SERVICES_<token>_ENABLED` is always written, every
 * other setting only while the service is enabled.
 */
export abstract class GcpServiceConfig implements ServiceConfig {
  protected constructor(
    /** The emulator's name of the service in upper case, e.g. `SECRETMANAGER`. */
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

/** A GCP service with a mock switch (`…_MOCK`); it spawns containers only while not mocked. */
export abstract class GcpMockableServiceConfig extends GcpServiceConfig {
  protected constructor(
    token: string,
    enabled: boolean,
    readonly mock: boolean,
  ) {
    super(token, enabled);
  }

  protected applySettingsTo(set: (setting: string, value: string) => void): void {
    set('MOCK', String(this.mock));
  }

  requiresDockerSocket(): boolean {
    return this.enabled && !this.mock;
  }
}

/** Compute Engine. */
export class ComputeConfig extends GcpServiceConfig {
  constructor(enabled: boolean = true) {
    super('COMPUTE', enabled);
  }
}

/** Cloud Storage. */
export class GcsConfig extends GcpServiceConfig {
  constructor(enabled: boolean = true) {
    super('GCS', enabled);
  }
}

/** Pub/Sub. */
export class PubSubConfig extends GcpServiceConfig {
  constructor(enabled: boolean = true) {
    super('PUBSUB', enabled);
  }
}

/** Firestore. */
export class FirestoreConfig extends GcpServiceConfig {
  constructor(enabled: boolean = true) {
    super('FIRESTORE', enabled);
  }
}

/** Datastore. */
export class DatastoreConfig extends GcpServiceConfig {
  constructor(enabled: boolean = true) {
    super('DATASTORE', enabled);
  }
}

/** IAM. */
export class IamConfig extends GcpServiceConfig {
  constructor(enabled: boolean = true) {
    super('IAM', enabled);
  }
}

/** IAM Service Account Credentials. */
export class IamCredentialsConfig extends GcpServiceConfig {
  constructor(enabled: boolean = true) {
    super('IAMCREDENTIALS', enabled);
  }
}

/** Security Token Service. */
export class StsConfig extends GcpServiceConfig {
  constructor(enabled: boolean = true) {
    super('STS', enabled);
  }
}

/** Secret Manager. */
export class SecretManagerConfig extends GcpServiceConfig {
  constructor(enabled: boolean = true) {
    super('SECRETMANAGER', enabled);
  }
}

/** Cloud Logging. */
export class LoggingConfig extends GcpServiceConfig {
  constructor(enabled: boolean = true) {
    super('LOGGING', enabled);
  }
}

/** Cloud KMS. */
export class KmsConfig extends GcpServiceConfig {
  constructor(enabled: boolean = true) {
    super('KMS', enabled);
  }
}

/** Managed Service for Apache Kafka. Runs Redpanda in a sibling container unless mocked. */
export class KafkaConfig extends GcpMockableServiceConfig {
  constructor(enabled: boolean = true, mock: boolean = false) {
    super('KAFKA', enabled, mock);
  }
}

/** Cloud SQL. Runs PostgreSQL or MySQL in sibling containers unless mocked. */
export class CloudSqlConfig extends GcpMockableServiceConfig {
  constructor(enabled: boolean = true, mock: boolean = false) {
    super('CLOUDSQL', enabled, mock);
  }
}

/** Cloud Tasks. */
export class CloudTasksConfig extends GcpServiceConfig {
  constructor(enabled: boolean = true) {
    super('CLOUDTASKS', enabled);
  }
}

/** Cloud Run. Runs services and jobs in sibling containers unless mocked. */
export class CloudRunConfig extends GcpMockableServiceConfig {
  constructor(enabled: boolean = true, mock: boolean = false) {
    super('CLOUDRUN', enabled, mock);
  }
}

/** Cloud Functions. Control plane only: the emulator runs no function code. */
export class CloudFunctionsConfig extends GcpServiceConfig {
  constructor(enabled: boolean = true) {
    super('CLOUDFUNCTIONS', enabled);
  }
}

/** Cloud Monitoring. */
export class MonitoringConfig extends GcpServiceConfig {
  constructor(enabled: boolean = true) {
    super('MONITORING', enabled);
  }
}

/** Cloud Scheduler. */
export class SchedulerConfig extends GcpServiceConfig {
  constructor(enabled: boolean = true) {
    super('SCHEDULER', enabled);
  }
}

/** Eventarc. */
export class EventarcConfig extends GcpServiceConfig {
  constructor(enabled: boolean = true) {
    super('EVENTARC', enabled);
  }
}

/** Kubernetes Engine. Runs k3s in a sibling container unless mocked. */
export class GkeConfig extends GcpMockableServiceConfig {
  constructor(enabled: boolean = true, mock: boolean = false) {
    super('GKE', enabled, mock);
  }
}

/** Service Usage. */
export class ServiceUsageConfig extends GcpServiceConfig {
  constructor(enabled: boolean = true) {
    super('SERVICEUSAGE', enabled);
  }
}

/** Resource Manager. */
export class ResourceManagerConfig extends GcpServiceConfig {
  constructor(enabled: boolean = true) {
    super('RESOURCEMANAGER', enabled);
  }
}

/** Firebase Authentication (Identity Platform). */
export class FirebaseAuthConfig extends GcpServiceConfig {
  constructor(enabled: boolean = true) {
    super('FIREBASEAUTH', enabled);
  }
}

/** BigQuery. Runs queries on a DuckDB sibling container unless mocked. */
export class BigQueryConfig extends GcpMockableServiceConfig {
  constructor(enabled: boolean = true, mock: boolean = false) {
    super('BIGQUERY', enabled, mock);
  }
}

import type { FlociContainerTarget, ServiceConfig } from '../../core';

export type { FlociContainerTarget, ServiceConfig };

const PREFIX = 'FLOCI_OCI_SERVICES_';

/**
 * An OCI service of the emulator: `FLOCI_OCI_SERVICES_<token>_ENABLED` is always written, every
 * other setting only while the service is enabled.
 */
export abstract class OciServiceConfig implements ServiceConfig {
  protected constructor(
    /** The emulator's name of the service in upper case, e.g. `OBJECTSTORAGE`. */
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

/** An OCI service with a mock switch (`…_MOCK`); it spawns containers only while not mocked. */
export abstract class OciMockableServiceConfig extends OciServiceConfig {
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

/** Identity and Access Management. */
export class IdentityConfig extends OciServiceConfig {
  constructor(enabled: boolean = true) {
    super('IDENTITY', enabled);
  }
}

/** Object Storage. */
export class ObjectStorageConfig extends OciServiceConfig {
  constructor(enabled: boolean = true) {
    super('OBJECTSTORAGE', enabled);
  }
}

/** Queue. */
export class QueueConfig extends OciServiceConfig {
  constructor(enabled: boolean = true) {
    super('QUEUE', enabled);
  }
}

/** Key Management (vaults, keys and crypto). */
export class KmsConfig extends OciServiceConfig {
  constructor(enabled: boolean = true) {
    super('KMS', enabled);
  }
}

/** Vault secrets. */
export class VaultConfig extends OciServiceConfig {
  constructor(enabled: boolean = true) {
    super('VAULT', enabled);
  }
}

/** Streaming. */
export class StreamingConfig extends OciServiceConfig {
  constructor(enabled: boolean = true) {
    super('STREAMING', enabled);
  }
}

/** Functions. Runs an Fn Project server in a sibling container unless mocked. */
export class FunctionsConfig extends OciMockableServiceConfig {
  constructor(enabled: boolean = true, mock: boolean = false) {
    super('FUNCTIONS', enabled, mock);
  }
}

/** Kubernetes Engine (OKE). Runs k3s in a sibling container unless mocked. */
export class OkeConfig extends OciMockableServiceConfig {
  constructor(enabled: boolean = true, mock: boolean = false) {
    super('OKE', enabled, mock);
  }
}

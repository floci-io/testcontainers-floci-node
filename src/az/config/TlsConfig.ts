import type { FlociContainerTarget, ServiceConfig } from '../../core';

/**
 * TLS of the Azure emulator. When enabled, HTTP and HTTPS are both served on the emulator port.
 * `httpsPort` is an extra HTTPS listener; it defaults to `0` (none) because the emulator's own
 * default, 443, cannot be bound by an unprivileged container.
 */
export class TlsConfig implements ServiceConfig {
  constructor(
    readonly enabled: boolean = false,
    readonly selfSigned: boolean = true,
    readonly certPath?: string,
    readonly keyPath?: string,
    readonly httpsPort: number = 0,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_AZ_TLS_ENABLED', String(this.enabled));
    if (this.enabled) {
      c.withEnv('FLOCI_AZ_TLS_SELF_SIGNED', String(this.selfSigned));
      if (this.certPath) {
        c.withEnv('FLOCI_AZ_TLS_CERT_PATH', this.certPath);
      }
      if (this.keyPath) {
        c.withEnv('FLOCI_AZ_TLS_KEY_PATH', this.keyPath);
      }
      c.withEnv('FLOCI_AZ_TLS_HTTPS_PORT', String(this.httpsPort));
    }
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

import { FlociContainerTarget, ServiceConfig } from './services';

export class TlsConfig implements ServiceConfig {
  constructor(
    readonly enabled: boolean = false,
    readonly selfSigned: boolean = true,
    readonly certPath?: string,
    readonly keyPath?: string,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_TLS_ENABLED', String(this.enabled));
    if (this.enabled) {
      c.withEnv('FLOCI_TLS_SELF_SIGNED', String(this.selfSigned));
      if (this.certPath) {
        c.withEnv('FLOCI_TLS_CERT_PATH', this.certPath);
      }
      if (this.keyPath) {
        c.withEnv('FLOCI_TLS_KEY_PATH', this.keyPath);
      }
    }
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

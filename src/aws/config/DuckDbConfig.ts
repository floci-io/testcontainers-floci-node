import { FlociContainerTarget, ServiceConfig } from './services';

export class DuckDbConfig implements ServiceConfig {
  constructor(
    readonly defaultImage: string = 'floci/floci-duck:latest',
    readonly url?: string,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    c.withEnv('FLOCI_SERVICES_DUCK_DEFAULT_IMAGE', this.defaultImage);
    if (this.url) {
      c.withEnv('FLOCI_SERVICES_DUCK_URL', this.url);
    }
  }

  applyExposedPortsTo(_c: FlociContainerTarget): void {}
}

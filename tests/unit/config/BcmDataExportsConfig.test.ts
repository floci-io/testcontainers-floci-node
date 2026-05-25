import { BcmDataExportsConfig } from '../../../src/config/services';
import type { FlociContainerTarget } from '../../../src/config/services';

class MockContainer implements FlociContainerTarget {
  readonly envVars: Record<string, string> = {};
  readonly exposedPorts: number[] = [];

  withEnv(key: string, value: string): this {
    this.envVars[key] = value;
    return this;
  }

  withExposedPort(port: number): this {
    this.exposedPorts.push(port);
    return this;
  }
}

describe('BcmDataExportsConfig', () => {
  it('sets default values when constructed without arguments', () => {
    const config = new BcmDataExportsConfig();
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_BCM_DATA_EXPORTS_ENABLED']).toBe('true');
    expect(mock.envVars['FLOCI_SERVICES_BCM_DATA_EXPORTS_EMIT_MODE']).toBe('synchronous');
  });

  it('sets non-default emitMode when provided', () => {
    const config = new BcmDataExportsConfig(true, 'asynchronous');
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_BCM_DATA_EXPORTS_ENABLED']).toBe('true');
    expect(mock.envVars['FLOCI_SERVICES_BCM_DATA_EXPORTS_EMIT_MODE']).toBe('asynchronous');
  });

  it('does not set emitMode when disabled', () => {
    const config = new BcmDataExportsConfig(false);
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_BCM_DATA_EXPORTS_ENABLED']).toBe('false');
    expect(mock.envVars['FLOCI_SERVICES_BCM_DATA_EXPORTS_EMIT_MODE']).toBeUndefined();
  });

  it('does not expose any ports', () => {
    const config = new BcmDataExportsConfig();
    const mock = new MockContainer();

    config.applyExposedPortsTo(mock);

    expect(mock.exposedPorts).toHaveLength(0);
  });
});

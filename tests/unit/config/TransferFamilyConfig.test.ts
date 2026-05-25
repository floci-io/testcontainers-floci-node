import { TransferFamilyConfig } from '../../../src/config/services';
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

describe('TransferFamilyConfig', () => {
  it('sets default value (enabled=true)', () => {
    const config = new TransferFamilyConfig();
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_TRANSFER_ENABLED']).toBe('true');
  });

  it('sets non-default value (enabled=false)', () => {
    const config = new TransferFamilyConfig(false);
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_TRANSFER_ENABLED']).toBe('false');
  });

  it('applyExposedPortsTo is a no-op (no ports exposed)', () => {
    const config = new TransferFamilyConfig();
    const mock = new MockContainer();

    config.applyExposedPortsTo(mock);

    expect(mock.exposedPorts).toHaveLength(0);
  });
});

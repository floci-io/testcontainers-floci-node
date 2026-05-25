import { CostExplorerConfig } from '../../../src/config/services';
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

describe('CostExplorerConfig', () => {
  it('sets default values when constructed without arguments', () => {
    const config = new CostExplorerConfig();
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_CE_ENABLED']).toBe('true');
    expect(mock.envVars['FLOCI_SERVICES_CE_CREDIT_USD_MONTHLY']).toBe('0');
  });

  it('sets non-default creditUsdMonthly when provided', () => {
    const config = new CostExplorerConfig(true, 150.5);
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_CE_ENABLED']).toBe('true');
    expect(mock.envVars['FLOCI_SERVICES_CE_CREDIT_USD_MONTHLY']).toBe('150.5');
  });

  it('does not set creditUsdMonthly when disabled', () => {
    const config = new CostExplorerConfig(false);
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_CE_ENABLED']).toBe('false');
    expect(mock.envVars['FLOCI_SERVICES_CE_CREDIT_USD_MONTHLY']).toBeUndefined();
  });

  it('does not expose any ports', () => {
    const config = new CostExplorerConfig();
    const mock = new MockContainer();

    config.applyExposedPortsTo(mock);

    expect(mock.exposedPorts).toHaveLength(0);
  });
});

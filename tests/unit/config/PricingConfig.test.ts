import { PricingConfig } from '../../../src/config/services';
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

describe('PricingConfig', () => {
  it('sets enabled to true by default and does not set snapshotPath when undefined', () => {
    const config = new PricingConfig();
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_PRICING_ENABLED']).toBe('true');
    expect(mock.envVars['FLOCI_SERVICES_PRICING_SNAPSHOT_PATH']).toBeUndefined();
  });

  it('sets snapshotPath when provided', () => {
    const config = new PricingConfig(true, '/data/pricing-snapshot.json');
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_PRICING_ENABLED']).toBe('true');
    expect(mock.envVars['FLOCI_SERVICES_PRICING_SNAPSHOT_PATH']).toBe('/data/pricing-snapshot.json');
  });

  it('sets enabled to false when disabled', () => {
    const config = new PricingConfig(false);
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_PRICING_ENABLED']).toBe('false');
  });

  it('does not expose any ports', () => {
    const config = new PricingConfig();
    const mock = new MockContainer();

    config.applyExposedPortsTo(mock);

    expect(mock.exposedPorts).toHaveLength(0);
  });
});

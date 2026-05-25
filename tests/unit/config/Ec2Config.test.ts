import { Ec2Config } from '../../../src/config/services';
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

describe('Ec2Config', () => {
  it('sets default env vars', () => {
    const config = new Ec2Config();
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_EC2_ENABLED']).toBe('true');
    expect(mock.envVars['FLOCI_SERVICES_EC2_MOCK']).toBe('false');
    expect(mock.envVars['FLOCI_SERVICES_EC2_IMDS_PORT']).toBe('9169');
  });

  it('exposes imdsPort when enabled', () => {
    const config = new Ec2Config(true, false, 9169);
    const mock = new MockContainer();

    config.applyExposedPortsTo(mock);

    expect(mock.exposedPorts).toContain(9169);
    expect(mock.exposedPorts).toHaveLength(1);
  });

  it('exposes custom imdsPort when provided', () => {
    const config = new Ec2Config(true, false, 9200);
    const mock = new MockContainer();

    config.applyExposedPortsTo(mock);

    expect(mock.exposedPorts).toContain(9200);
    expect(mock.exposedPorts).toHaveLength(1);
  });

  it('does not expose ports when disabled', () => {
    const config = new Ec2Config(false);
    const mock = new MockContainer();

    config.applyExposedPortsTo(mock);

    expect(mock.exposedPorts).toHaveLength(0);
  });
});

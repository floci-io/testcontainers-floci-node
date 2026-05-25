import { ElbV2Config } from '../../../src/config/services';
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

describe('ElbV2Config', () => {
  it('sets default env vars with no listener ports', () => {
    const config = new ElbV2Config();
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_ELBV2_ENABLED']).toBe('true');
    expect(mock.envVars['FLOCI_SERVICES_ELBV2_MOCK']).toBe('false');
  });

  it('does not expose ports when no listener ports configured', () => {
    const config = new ElbV2Config();
    const mock = new MockContainer();

    config.applyExposedPortsTo(mock);

    expect(mock.exposedPorts).toHaveLength(0);
  });

  it('exposes listener ports when enabled', () => {
    const config = new ElbV2Config(true, false, [8080, 8443, 9090]);
    const mock = new MockContainer();

    config.applyExposedPortsTo(mock);

    expect(mock.exposedPorts).toEqual([8080, 8443, 9090]);
  });

  it('does not expose listener ports when disabled', () => {
    const config = new ElbV2Config(false, false, [8080, 8443]);
    const mock = new MockContainer();

    config.applyExposedPortsTo(mock);

    expect(mock.exposedPorts).toHaveLength(0);
  });

  it('does not set MOCK env var when disabled', () => {
    const config = new ElbV2Config(false);
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_ELBV2_ENABLED']).toBe('false');
    expect(mock.envVars['FLOCI_SERVICES_ELBV2_MOCK']).toBeUndefined();
  });
});

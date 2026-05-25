import { DuckDbConfig } from '../../../src/config/DuckDbConfig';
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

describe('DuckDbConfig', () => {
  it('sets default image and does not set url when constructed with defaults', () => {
    const config = new DuckDbConfig();
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_DUCK_DEFAULT_IMAGE']).toBe('floci/floci-duck:latest');
    expect(mock.envVars['FLOCI_SERVICES_DUCK_URL']).toBeUndefined();
  });

  it('sets custom defaultImage when provided', () => {
    const config = new DuckDbConfig('custom/duck:1.0');
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_DUCK_DEFAULT_IMAGE']).toBe('custom/duck:1.0');
    expect(mock.envVars['FLOCI_SERVICES_DUCK_URL']).toBeUndefined();
  });

  it('sets FLOCI_SERVICES_DUCK_URL when url is provided', () => {
    const config = new DuckDbConfig('floci/floci-duck:latest', 'http://localhost:9000');
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_DUCK_DEFAULT_IMAGE']).toBe('floci/floci-duck:latest');
    expect(mock.envVars['FLOCI_SERVICES_DUCK_URL']).toBe('http://localhost:9000');
  });

  it('does not set url when explicitly undefined', () => {
    const config = new DuckDbConfig('floci/floci-duck:latest', undefined);
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_DUCK_URL']).toBeUndefined();
  });

  it('does not expose any ports', () => {
    const config = new DuckDbConfig();
    const mock = new MockContainer();

    config.applyExposedPortsTo(mock);

    expect(mock.exposedPorts).toHaveLength(0);
  });
});

import { RdsConfig } from '../../../src/config/services';
import type { FlociContainerTarget } from '../../../src/config/services';

class MockContainer implements FlociContainerTarget {
  readonly envVars: Record<string, string> = {};

  withoutEnv(key: string): this {
    delete this.envVars[key];
    return this;
  }
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

describe('RdsConfig', () => {
  it('leaves the endpoint host to the container by default', () => {
    const mock = new MockContainer();

    new RdsConfig().applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_RDS_ENDPOINT_HOST']).toBeUndefined();
  });

  it('emits an explicit endpoint host', () => {
    const mock = new MockContainer();

    new RdsConfig(true, 7001, 99, 'postgres:16-alpine', 'mysql:8.0', 'mariadb:11', 'rds.example.com').applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_RDS_ENDPOINT_HOST']).toBe('rds.example.com');
  });

  it('drops a host an earlier config set when the new one has none', () => {
    const mock = new MockContainer();

    new RdsConfig(true, 7001, 99, 'postgres:16-alpine', 'mysql:8.0', 'mariadb:11', 'rds.example.com').applyEnvVarsTo(mock);
    new RdsConfig().applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_RDS_ENDPOINT_HOST']).toBeUndefined();
  });
});

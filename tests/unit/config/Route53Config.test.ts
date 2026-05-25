import { Route53Config } from '../../../src/config/services';
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

describe('Route53Config', () => {
  it('sets default nameserver values when constructed with defaults', () => {
    const config = new Route53Config();
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_ROUTE53_ENABLED']).toBe('true');
    expect(mock.envVars['FLOCI_SERVICES_ROUTE53_DEFAULT_NAMESERVER_1']).toBe('ns-1.awsdns-01.org');
    expect(mock.envVars['FLOCI_SERVICES_ROUTE53_DEFAULT_NAMESERVER_2']).toBe('ns-2.awsdns-02.net');
    expect(mock.envVars['FLOCI_SERVICES_ROUTE53_DEFAULT_NAMESERVER_3']).toBe('ns-3.awsdns-03.com');
    expect(mock.envVars['FLOCI_SERVICES_ROUTE53_DEFAULT_NAMESERVER_4']).toBe('ns-4.awsdns-04.co.uk');
  });

  it('sets custom nameserver values when provided', () => {
    const config = new Route53Config(true, 'ns1.custom.org', 'ns2.custom.net', 'ns3.custom.com', 'ns4.custom.co.uk');
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_ROUTE53_ENABLED']).toBe('true');
    expect(mock.envVars['FLOCI_SERVICES_ROUTE53_DEFAULT_NAMESERVER_1']).toBe('ns1.custom.org');
    expect(mock.envVars['FLOCI_SERVICES_ROUTE53_DEFAULT_NAMESERVER_2']).toBe('ns2.custom.net');
    expect(mock.envVars['FLOCI_SERVICES_ROUTE53_DEFAULT_NAMESERVER_3']).toBe('ns3.custom.com');
    expect(mock.envVars['FLOCI_SERVICES_ROUTE53_DEFAULT_NAMESERVER_4']).toBe('ns4.custom.co.uk');
  });

  it('does not set nameserver env vars when disabled', () => {
    const config = new Route53Config(false);
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_ROUTE53_ENABLED']).toBe('false');
    expect(mock.envVars['FLOCI_SERVICES_ROUTE53_DEFAULT_NAMESERVER_1']).toBeUndefined();
    expect(mock.envVars['FLOCI_SERVICES_ROUTE53_DEFAULT_NAMESERVER_2']).toBeUndefined();
    expect(mock.envVars['FLOCI_SERVICES_ROUTE53_DEFAULT_NAMESERVER_3']).toBeUndefined();
    expect(mock.envVars['FLOCI_SERVICES_ROUTE53_DEFAULT_NAMESERVER_4']).toBeUndefined();
  });

  it('does not expose any ports', () => {
    const config = new Route53Config();
    const mock = new MockContainer();

    config.applyExposedPortsTo(mock);

    expect(mock.exposedPorts).toHaveLength(0);
  });
});

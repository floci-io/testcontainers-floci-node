import { CloudFrontConfig } from '../../../src/config/services';
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

describe('CloudFrontConfig', () => {
  it('sets default values (enabled=true, domainSuffix="cloudfront.net")', () => {
    const config = new CloudFrontConfig();
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_CLOUDFRONT_ENABLED']).toBe('true');
    expect(mock.envVars['FLOCI_SERVICES_CLOUDFRONT_DOMAIN_SUFFIX']).toBe('cloudfront.net');
  });

  it('sets non-default values', () => {
    const config = new CloudFrontConfig(true, 'custom.example.com');
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_CLOUDFRONT_ENABLED']).toBe('true');
    expect(mock.envVars['FLOCI_SERVICES_CLOUDFRONT_DOMAIN_SUFFIX']).toBe('custom.example.com');
  });

  it('does not set domainSuffix when enabled is false', () => {
    const config = new CloudFrontConfig(false);
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_CLOUDFRONT_ENABLED']).toBe('false');
    expect(mock.envVars['FLOCI_SERVICES_CLOUDFRONT_DOMAIN_SUFFIX']).toBeUndefined();
  });

  it('applyExposedPortsTo is a no-op (no ports exposed)', () => {
    const config = new CloudFrontConfig();
    const mock = new MockContainer();

    config.applyExposedPortsTo(mock);

    expect(mock.exposedPorts).toHaveLength(0);
  });
});

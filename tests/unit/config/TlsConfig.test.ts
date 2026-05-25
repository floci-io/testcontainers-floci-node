import { TlsConfig } from '../../../src/config/TlsConfig';
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

describe('TlsConfig', () => {
  it('sets only FLOCI_TLS_ENABLED=false when disabled (default)', () => {
    const config = new TlsConfig();
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_TLS_ENABLED']).toBe('false');
    expect(mock.envVars['FLOCI_TLS_SELF_SIGNED']).toBeUndefined();
    expect(mock.envVars['FLOCI_TLS_CERT_PATH']).toBeUndefined();
    expect(mock.envVars['FLOCI_TLS_KEY_PATH']).toBeUndefined();
  });

  it('sets FLOCI_TLS_ENABLED=false and no other vars when explicitly disabled', () => {
    const config = new TlsConfig(false);
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_TLS_ENABLED']).toBe('false');
    expect(mock.envVars['FLOCI_TLS_SELF_SIGNED']).toBeUndefined();
    expect(mock.envVars['FLOCI_TLS_CERT_PATH']).toBeUndefined();
    expect(mock.envVars['FLOCI_TLS_KEY_PATH']).toBeUndefined();
  });

  it('sets FLOCI_TLS_ENABLED and FLOCI_TLS_SELF_SIGNED when enabled with defaults', () => {
    const config = new TlsConfig(true);
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_TLS_ENABLED']).toBe('true');
    expect(mock.envVars['FLOCI_TLS_SELF_SIGNED']).toBe('true');
    expect(mock.envVars['FLOCI_TLS_CERT_PATH']).toBeUndefined();
    expect(mock.envVars['FLOCI_TLS_KEY_PATH']).toBeUndefined();
  });

  it('sets certPath and keyPath when enabled and provided', () => {
    const config = new TlsConfig(true, false, '/certs/cert.pem', '/certs/key.pem');
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_TLS_ENABLED']).toBe('true');
    expect(mock.envVars['FLOCI_TLS_SELF_SIGNED']).toBe('false');
    expect(mock.envVars['FLOCI_TLS_CERT_PATH']).toBe('/certs/cert.pem');
    expect(mock.envVars['FLOCI_TLS_KEY_PATH']).toBe('/certs/key.pem');
  });

  it('does not set certPath or keyPath when enabled but paths are undefined', () => {
    const config = new TlsConfig(true, true, undefined, undefined);
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_TLS_ENABLED']).toBe('true');
    expect(mock.envVars['FLOCI_TLS_SELF_SIGNED']).toBe('true');
    expect(mock.envVars['FLOCI_TLS_CERT_PATH']).toBeUndefined();
    expect(mock.envVars['FLOCI_TLS_KEY_PATH']).toBeUndefined();
  });

  it('does not expose any ports', () => {
    const config = new TlsConfig(true);
    const mock = new MockContainer();

    config.applyExposedPortsTo(mock);

    expect(mock.exposedPorts).toHaveLength(0);
  });
});

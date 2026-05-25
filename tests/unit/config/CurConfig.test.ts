import { CurConfig } from '../../../src/config/services';
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

describe('CurConfig', () => {
  it('sets default values when constructed without arguments', () => {
    const config = new CurConfig();
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_CUR_ENABLED']).toBe('true');
    expect(mock.envVars['FLOCI_SERVICES_CUR_EMIT_MODE']).toBe('synchronous');
    expect(mock.envVars['FLOCI_SERVICES_CUR_STAGING_BUCKET']).toBe('floci-cur-staging');
  });

  it('sets non-default emitMode and stagingBucket when provided', () => {
    const config = new CurConfig(true, 'asynchronous', 'my-custom-bucket');
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_CUR_ENABLED']).toBe('true');
    expect(mock.envVars['FLOCI_SERVICES_CUR_EMIT_MODE']).toBe('asynchronous');
    expect(mock.envVars['FLOCI_SERVICES_CUR_STAGING_BUCKET']).toBe('my-custom-bucket');
  });

  it('does not set emitMode or stagingBucket when disabled', () => {
    const config = new CurConfig(false);
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_CUR_ENABLED']).toBe('false');
    expect(mock.envVars['FLOCI_SERVICES_CUR_EMIT_MODE']).toBeUndefined();
    expect(mock.envVars['FLOCI_SERVICES_CUR_STAGING_BUCKET']).toBeUndefined();
  });

  it('does not expose any ports', () => {
    const config = new CurConfig();
    const mock = new MockContainer();

    config.applyExposedPortsTo(mock);

    expect(mock.exposedPorts).toHaveLength(0);
  });
});

import { BackupConfig } from '../../../src/config/services';
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

describe('BackupConfig', () => {
  it('sets default values (enabled=true, jobCompletionDelaySeconds=3)', () => {
    const config = new BackupConfig();
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_BACKUP_ENABLED']).toBe('true');
    expect(mock.envVars['FLOCI_SERVICES_BACKUP_JOB_COMPLETION_DELAY_SECONDS']).toBe('3');
  });

  it('sets non-default values', () => {
    const config = new BackupConfig(true, 10);
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_BACKUP_ENABLED']).toBe('true');
    expect(mock.envVars['FLOCI_SERVICES_BACKUP_JOB_COMPLETION_DELAY_SECONDS']).toBe('10');
  });

  it('does not set jobCompletionDelaySeconds when enabled is false', () => {
    const config = new BackupConfig(false);
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_SERVICES_BACKUP_ENABLED']).toBe('false');
    expect(mock.envVars['FLOCI_SERVICES_BACKUP_JOB_COMPLETION_DELAY_SECONDS']).toBeUndefined();
  });

  it('applyExposedPortsTo is a no-op (no ports exposed)', () => {
    const config = new BackupConfig();
    const mock = new MockContainer();

    config.applyExposedPortsTo(mock);

    expect(mock.exposedPorts).toHaveLength(0);
  });
});

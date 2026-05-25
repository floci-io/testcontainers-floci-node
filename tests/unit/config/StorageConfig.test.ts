import { StorageConfig } from '../../../src/config/StorageConfig';
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

describe('StorageConfig', () => {
  it('sets default pruneVolumesOnDelete to true and does not set host path when undefined', () => {
    const config = new StorageConfig();
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_STORAGE_PRUNE_VOLUMES_ON_DELETE']).toBe('true');
    expect(mock.envVars['FLOCI_STORAGE_HOST_PERSISTENT_PATH']).toBeUndefined();
  });

  it('sets FLOCI_STORAGE_HOST_PERSISTENT_PATH when hostPersistentPath is provided', () => {
    const config = new StorageConfig('/tmp/floci-data');
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_STORAGE_HOST_PERSISTENT_PATH']).toBe('/tmp/floci-data');
    expect(mock.envVars['FLOCI_STORAGE_PRUNE_VOLUMES_ON_DELETE']).toBe('true');
  });

  it('sets pruneVolumesOnDelete to false when configured', () => {
    const config = new StorageConfig('/data', false);
    const mock = new MockContainer();

    config.applyEnvVarsTo(mock);

    expect(mock.envVars['FLOCI_STORAGE_HOST_PERSISTENT_PATH']).toBe('/data');
    expect(mock.envVars['FLOCI_STORAGE_PRUNE_VOLUMES_ON_DELETE']).toBe('false');
  });

  it('does not implement ServiceConfig (no applyExposedPortsTo method)', () => {
    const config = new StorageConfig();
    expect((config as any).applyExposedPortsTo).toBeUndefined();
  });
});

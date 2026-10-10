import type { FlociContainerTarget } from './services';

/**
 * Configuration for Floci persistent storage.
 *
 * This class does NOT implement ServiceConfig because it manages bind mounts
 * in addition to environment variables. It has its own `applyEnvVarsTo` method.
 */
export class StorageConfig {
  constructor(
    readonly hostPersistentPath?: string,
    readonly pruneVolumesOnDelete: boolean = true,
  ) {}

  applyEnvVarsTo(c: FlociContainerTarget): void {
    if (this.hostPersistentPath) {
      c.withEnv('FLOCI_STORAGE_HOST_PERSISTENT_PATH', this.hostPersistentPath);
    }
    c.withEnv('FLOCI_STORAGE_PRUNE_VOLUMES_ON_DELETE', String(this.pruneVolumesOnDelete));
  }
}

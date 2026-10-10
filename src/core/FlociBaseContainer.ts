import crypto from 'crypto';
import { GenericContainer, Network, Wait, getContainerRuntimeClient } from 'testcontainers';
import type { ExecResult, StartedNetwork, StartedTestContainer } from 'testcontainers';
import {
  CloudDescriptor,
  NAMESPACE_LABEL,
  dockerSocketRequired,
  networkEnv,
  resourceNamespaceEnv,
  serviceEnabled,
  serviceEnv,
} from './CloudDescriptor';

export const DOCKER_SOCKET = '/var/run/docker.sock';

/** Valid log levels for a Floci emulator. */
export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LOG_LEVELS: LogLevel[] = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'];

/** What a service config writes into: env vars and, for some services, exposed ports. */
export interface FlociContainerTarget {
  withEnv(key: string, value: string): unknown;
  withExposedPort(port: number): unknown;
}

/** A per-service config: writes its env vars, and exposes ports when the service needs them. */
export interface ServiceConfig {
  applyEnvVarsTo(container: FlociContainerTarget): void;
  applyExposedPortsTo(container: FlociContainerTarget): void;
}

export interface BindMount {
  source: string;
  target: string;
  mode: 'rw' | 'ro';
}

/**
 * A Floci emulator container configured by its cloud's {@link CloudDescriptor}.
 *
 * Owns what every cloud shares: env and port plumbing, readiness on the health path, Docker
 * socket detection from the final env, a dedicated network, a unique resource namespace and the
 * log level. A cloud module adds its typed service configs and builds its own started container.
 */
export abstract class FlociBaseContainer {
  static readonly STARTUP_TIMEOUT_MS: number = 120_000;

  protected readonly image: string;
  protected readonly envVars: Record<string, string> = {};
  private readonly exposedPorts: Set<number>;
  private readonly manualExposedPorts: Set<number> = new Set();
  private readonly configuredPortServices: Map<string, ServiceConfig> = new Map();
  /** `undefined`: detect from the env at start; `null`: never mount; a path: always mount it. */
  private dockerSocket: string | null | undefined = undefined;
  protected dedicatedNetworkName?: string;
  protected logLevel: LogLevel = 'WARN';

  protected constructor(protected readonly descriptor: CloudDescriptor, image?: string) {
    this.image = image ?? descriptor.defaultImage;
    this.exposedPorts = new Set([descriptor.port]);
    for (const [key, value] of Object.entries(descriptor.defaultEnv ?? {})) {
      this.withEnv(key, value);
    }
    // Sibling containers are named after the resource; a unique namespace per container keeps
    // parallel test runs from colliding and makes leftovers attributable.
    this.withEnv(resourceNamespaceEnv(descriptor), `tc-${crypto.randomBytes(4).toString('hex')}`);
    this.withEnv(descriptor.logLevelEnv, this.logLevel);
  }

  withEnv(key: string, value: string): this {
    this.envVars[key] = value;
    return this;
  }

  withExposedPort(port: number): this {
    this.manualExposedPorts.add(port);
    this.exposedPorts.add(port);
    return this;
  }

  /**
   * Always mount the host Docker socket (from `path`), overriding detection. By default it is
   * mounted only while an enabled, non-mocked service spawns sibling containers.
   */
  withDockerSocket(path = DOCKER_SOCKET): this {
    if (!path.trim()) {
      throw new Error('Docker socket path must not be empty');
    }
    this.dockerSocket = path;
    return this;
  }

  /**
   * Never mount the host Docker socket, overriding detection; for hosts where it cannot be
   * mounted (rootless Podman with SELinux, some CI sandboxes).
   */
  withoutDockerSocket(): this {
    this.dockerSocket = null;
    return this;
  }

  /** The socket path `start()` will mount, decided from the env as it is now, or `undefined`. */
  getDockerSocketMount(): string | undefined {
    if (this.dockerSocket === null) {
      return undefined;
    }
    if (this.dockerSocket !== undefined) {
      return this.dockerSocket;
    }
    return dockerSocketRequired(this.descriptor, this.envVars) ? DOCKER_SOCKET : undefined;
  }

  /** Create an isolated Docker network shared with the containers the emulator spawns. */
  withDedicatedNetwork(): this {
    const name = `floci-network-${crypto.randomBytes(4).toString('hex')}`;
    this.dedicatedNetworkName = name;
    return this.withEnv(networkEnv(this.descriptor), name);
  }

  getDedicatedNetworkName(): string | undefined {
    return this.dedicatedNetworkName;
  }

  /** Override the generated namespace that prefixes sibling container names. */
  withResourceNamespace(namespace: string): this {
    return this.withEnv(resourceNamespaceEnv(this.descriptor), namespace);
  }

  getResourceNamespace(): string {
    return this.envVars[resourceNamespaceEnv(this.descriptor)];
  }

  withLogLevel(level: LogLevel): this {
    if (!LOG_LEVELS.includes(level)) {
      throw new Error(`Invalid log level "${level}". Must be one of: ${LOG_LEVELS.join(', ')}`);
    }
    this.logLevel = level;
    return this.withEnv(this.descriptor.logLevelEnv, level);
  }

  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /** Record a service config that may publish ports, and recompute the exposed ports. */
  protected updatePortConfig(name: string, config: ServiceConfig): void {
    this.configuredPortServices.set(name, config);
    this.refreshExposedPorts();
  }

  protected refreshExposedPorts(): void {
    this.exposedPorts.clear();
    this.exposedPorts.add(this.descriptor.port);
    for (const port of this.manualExposedPorts) {
      this.exposedPorts.add(port);
    }
    const target: FlociContainerTarget = {
      withEnv: (key, value) => this.withEnv(key, value),
      withExposedPort: (port) => this.exposedPorts.add(port),
    };
    for (const config of this.configuredPortServices.values()) {
      config.applyExposedPortsTo(target);
    }
  }

  /** Extra bind mounts a cloud needs besides the Docker socket (e.g. persistent storage). */
  protected extraBindMounts(): BindMount[] {
    return [];
  }

  /**
   * The env the container starts with: the configured env plus every unset host setting of an
   * enabled service pointed at the Docker host. Without it Floci advertises sibling containers'
   * bridge addresses (e.g. RDS endpoints), which only a Linux host can reach.
   */
  private async environmentAtStart(): Promise<Record<string, string>> {
    const env = { ...this.envVars };
    const missing = (this.descriptor.hostSettings ?? [])
      .map((hs) => ({ token: hs.token, key: serviceEnv(this.descriptor, hs.token, hs.setting) }))
      .filter((hs) => env[hs.key] === undefined && serviceEnabled(this.descriptor, env, hs.token));
    if (missing.length > 0) {
      let host: string | undefined;
      try {
        host = (await getContainerRuntimeClient()).info.containerRuntime.host;
      } catch {
        // No runtime to ask: the start below fails on its own, so leave Floci's default.
      }
      for (const hs of missing) {
        if (host) {
          env[hs.key] = host;
        }
      }
    }
    return env;
  }

  /** Start the emulator and wait until its health path answers 200. */
  protected async startContainer(): Promise<{ container: StartedTestContainer; network?: StartedNetwork }> {
    let network: StartedNetwork | undefined;
    if (this.dedicatedNetworkName) {
      const networkName = this.dedicatedNetworkName;
      network = await new Network({ nextUuid: () => networkName }).start();
    }

    const bindMounts: BindMount[] = [];
    const socket = this.getDockerSocketMount();
    if (socket) {
      bindMounts.push({ source: socket, target: DOCKER_SOCKET, mode: 'rw' });
    }
    bindMounts.push(...this.extraBindMounts());

    let container = new GenericContainer(this.image)
      .withExposedPorts(...Array.from(this.exposedPorts))
      .withEnvironment(await this.environmentAtStart())
      .withBindMounts(bindMounts)
      .withWaitStrategy(
        Wait.forHttp(this.descriptor.healthPath, this.descriptor.port)
          .forStatusCode(200)
          .withStartupTimeout(FlociBaseContainer.STARTUP_TIMEOUT_MS),
      );
    if (network) {
      container = container.withNetwork(network);
    }
    return { container: await container.start(), network };
  }
}

/** A running Floci emulator: endpoint, ports, exec, state reset and cleanup. */
export class StartedFlociBaseContainer {
  constructor(
    protected readonly container: StartedTestContainer,
    protected readonly descriptor: CloudDescriptor,
    protected readonly network?: StartedNetwork,
    private readonly dedicatedNetworkName?: string,
    private readonly resourceNamespace?: string,
  ) {}

  /** Prefix of the sibling containers' names; their `floci_namespace` label holds it. */
  getResourceNamespace(): string | undefined {
    return this.resourceNamespace;
  }

  /** Base URL of the emulator, e.g. `http://localhost:32768`. */
  getEndpoint(): string {
    return `http://${this.container.getHost()}:${this.container.getMappedPort(this.descriptor.port)}`;
  }

  getMappedPort(port: number): number {
    return this.container.getMappedPort(port);
  }

  getDedicatedNetworkName(): string | undefined {
    return this.dedicatedNetworkName;
  }

  async exec(command: string[]): Promise<ExecResult> {
    return this.container.exec(command);
  }

  /** Wipe all emulator state (buckets, queues, tables, ...) without restarting. */
  async reset(): Promise<void> {
    if (!this.descriptor.resetPath) {
      throw new Error(`the ${this.descriptor.name} emulator has no state reset`);
    }
    const res = await fetch(this.getEndpoint() + this.descriptor.resetPath, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`state reset failed with HTTP ${res.status}`);
    }
  }

  /**
   * Stop the emulator, then remove the sibling containers it spawned (those labelled with its
   * resource namespace), then the dedicated network. Floci manages the siblings and the
   * testcontainers reaper does not track them, so without this they outlive the run; a leaked one
   * with a fixed host port, such as the AWS ECR registry, blocks the next run. Containers sharing
   * a namespace set with `withResourceNamespace` lose their siblings too.
   */
  async stop(): Promise<void> {
    await this.container.stop();
    if (this.resourceNamespace) {
      await removeSiblings(this.resourceNamespace);
    }
    if (this.network) {
      await this.network.stop();
    }
  }
}

/** Remove every container labelled with `namespace`. Best effort: teardown never fails over leftovers. */
async function removeSiblings(namespace: string): Promise<void> {
  try {
    const dockerode = (await getContainerRuntimeClient()).container.dockerode;
    const siblings = await dockerode.listContainers({
      all: true,
      filters: { label: [`${NAMESPACE_LABEL}=${namespace}`] },
    });
    await Promise.all(
      siblings.map((sibling) => dockerode.getContainer(sibling.Id).remove({ force: true, v: true }).catch(() => undefined)),
    );
  } catch {
    // The runtime is unreachable or the list failed: nothing more to do during teardown.
  }
}

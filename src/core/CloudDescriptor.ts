/**
 * A service that spawns sibling containers and therefore needs the host Docker socket.
 * `token` is the SCREAMING_SNAKE name in `<prefix>SERVICES_<token>_ENABLED`; a `mockable`
 * service spawns nothing while `<prefix>SERVICES_<token>_MOCK` is `true`.
 */
export interface SocketService {
  readonly token: string;
  readonly mockable?: boolean;
}

/**
 * A service setting that must name a host the test process can reach, such as the AWS RDS
 * endpoint host. When the service is enabled and the setting is unset, the container sets it to
 * the Docker host at start.
 */
export interface HostSetting {
  readonly token: string;
  readonly setting: string;
}

/** The label every Floci emulator puts on the sibling containers it spawns, holding its namespace. */
export const NAMESPACE_LABEL = 'floci_namespace';

/**
 * The facts that tell one Floci emulator apart from another, as data. A cloud module
 * (AWS today; Azure, GCP and OCI later) is this descriptor plus its own service configs and
 * connection helpers.
 */
export interface CloudDescriptor {
  /** Short cloud name, e.g. `aws`. */
  readonly name: string;
  /** Docker image with tag used by default, e.g. `floci/floci:latest`. */
  readonly defaultImage: string;
  /** The emulator's single edge port. */
  readonly port: number;
  /** Prefix of every setting, e.g. `FLOCI_` or `FLOCI_AZ_`. */
  readonly envPrefix: string;
  /** HTTP path that answers 200 once the emulator is ready. */
  readonly healthPath: string;
  /** HTTP path that wipes all emulator state on POST, if the cloud has one. */
  readonly resetPath?: string;
  /** Env var that sets the emulator's log level. */
  readonly logLevelEnv: string;
  /** Services that need the host Docker socket. */
  readonly socketServices: readonly SocketService[];
  /** Settings pointed at the Docker host at start, unless set or their service is disabled. */
  readonly hostSettings?: readonly HostSetting[];
  /** Settings every container of this cloud needs, applied first so callers can override them. */
  readonly defaultEnv?: Readonly<Record<string, string>>;
}

/** Env var naming the Docker network sibling containers join. */
export function networkEnv(d: CloudDescriptor): string {
  return `${d.envPrefix}SERVICES_DOCKER_NETWORK`;
}

/** Env var that prefixes sibling container names, keeping parallel runs apart. */
export function resourceNamespaceEnv(d: CloudDescriptor): string {
  return `${d.envPrefix}DOCKER_RESOURCE_NAMESPACE`;
}

/** Env var of one service setting, e.g. `serviceEnv(AWS, 'SQS', 'ENABLED')`. */
export function serviceEnv(d: CloudDescriptor, token: string, setting: string): string {
  return `${d.envPrefix}SERVICES_${token}_${setting}`;
}

/** Whether a service is enabled in `env`; a missing `_ENABLED` key means enabled. */
export function serviceEnabled(d: CloudDescriptor, env: Readonly<Record<string, string>>, token: string): boolean {
  const enabled = env[serviceEnv(d, token, 'ENABLED')];
  return enabled === undefined || enabled.toLowerCase() === 'true';
}

/**
 * Whether any enabled, non-mocked socket service in `env` spawns sibling containers.
 * A missing `_ENABLED` key means enabled, which is Floci's default.
 */
export function dockerSocketRequired(d: CloudDescriptor, env: Readonly<Record<string, string>>): boolean {
  return d.socketServices.some((svc) => {
    const enabled = env[serviceEnv(d, svc.token, 'ENABLED')];
    if (enabled !== undefined && enabled.toLowerCase() !== 'true') {
      return false;
    }
    if (svc.mockable && (env[serviceEnv(d, svc.token, 'MOCK')] ?? '').toLowerCase() === 'true') {
      return false;
    }
    return true;
  });
}

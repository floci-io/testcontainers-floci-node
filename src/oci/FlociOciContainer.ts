import crypto from 'crypto';
import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { FlociBaseContainer, StartedFlociBaseContainer } from '../core';
import type { CloudDescriptor } from '../core';
import {
  OciServiceConfig,
  FunctionsConfig,
  IdentityConfig,
  KmsConfig,
  ObjectStorageConfig,
  OkeConfig,
  QueueConfig,
  StreamingConfig,
  VaultConfig,
} from './config/services';
import { TlsConfig } from './config/TlsConfig';

const DEFAULT_IMAGE = 'floci/floci-oci:latest';
const REGION_ENV = 'FLOCI_OCI_DEFAULT_REGION';
const TENANCY_ENV = 'FLOCI_OCI_DEFAULT_TENANCY_ID';
const NAMESPACE_ENV = 'FLOCI_OCI_DEFAULT_NAMESPACE';

/** The OCI emulator (`floci/floci-oci`) as data, for the shared core. */
export const OCI: CloudDescriptor = {
  name: 'oci',
  defaultImage: DEFAULT_IMAGE,
  port: 4599,
  envPrefix: 'FLOCI_OCI_',
  healthPath: '/_floci-oci/health',
  resetPath: '/_floci-oci/state/reset',
  logLevelEnv: 'QUARKUS_LOG_CATEGORY__IO_FLOCI_OCI__LEVEL',
  // Services that spawn sibling containers.
  socketServices: [
    { token: 'FUNCTIONS', mockable: true },
    { token: 'OKE', mockable: true },
  ],
  defaultEnv: {
    // The extra HTTPS listener defaults to 443, which an unprivileged container cannot bind.
    FLOCI_OCI_TLS_HTTPS_PORT: '0',
  },
};

/** A throwaway RSA API signing key in PEM. The emulator parses request signatures but never verifies them. */
function generatePrivateKeyPem(): string {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  }).privateKey;
}

/**
 * Testcontainers module for Floci OCI — a free, open-source local Oracle Cloud Infrastructure emulator.
 *
 * @example
 * ```ts
 * const floci = await new FlociOciContainer().start();
 * const auth = new common.SimpleAuthenticationDetailsProvider(
 *   floci.getTenancyId(), floci.getUserId(), floci.getFingerprint(), floci.getPrivateKeyPem(), null,
 *   common.Region.fromRegionId(floci.getRegion()));
 * const client = new ObjectStorageClient({ authenticationDetailsProvider: auth });
 * client.endpoint = floci.getEndpoint();
 * await floci.stop();
 * ```
 */
export class FlociOciContainer extends FlociBaseContainer {
  static readonly PORT = 4599;
  static readonly DEFAULT_REGION = 'us-ashburn-1';
  static readonly DEFAULT_REALM = 'oc1';
  static readonly DEFAULT_TENANCY_ID = 'ocid1.tenancy.oc1..flocilocaltenancy0000000000000000000000000000000000000000';
  static readonly DEFAULT_NAMESPACE = 'floci-local';
  /** The user and key fingerprint the emulator's documentation uses; any value is accepted. */
  static readonly DEFAULT_USER_ID = 'ocid1.user.oc1..flocilocaluser0000000000000000000000000000000000000000000000';
  static readonly DEFAULT_FINGERPRINT = 'aa:bb:cc:dd:ee:ff:00:11:22:33:44:55:66:77:88:99';

  private readonly serviceConfigs = new Map<string, OciServiceConfig>();
  private tlsConfig = new TlsConfig();
  private privateKeyPem?: string;

  constructor(image = DEFAULT_IMAGE) {
    super(OCI, image);
    const defaults: OciServiceConfig[] = [
      new FunctionsConfig(),
      new IdentityConfig(),
      new KmsConfig(),
      new ObjectStorageConfig(),
      new OkeConfig(),
      new QueueConfig(),
      new StreamingConfig(),
      new VaultConfig(),
    ];
    for (const cfg of defaults) {
      this.serviceConfigs.set(cfg.token, cfg);
      cfg.applyEnvVarsTo(this);
    }
    this.tlsConfig.applyEnvVarsTo(this);
  }

  /** The region the emulator reports and mints OCIDs for. */
  withRegion(region: string): this {
    return this.withEnv(REGION_ENV, region);
  }

  getRegion(): string {
    return this.envVars[REGION_ENV] ?? FlociOciContainer.DEFAULT_REGION;
  }

  /** The tenancy of requests that carry no signature; signed requests name their own. */
  withTenancyId(tenancyId: string): this {
    return this.withEnv(TENANCY_ENV, tenancyId);
  }

  getTenancyId(): string {
    return this.envVars[TENANCY_ENV] ?? FlociOciContainer.DEFAULT_TENANCY_ID;
  }

  /** The Object Storage namespace of the emulated tenancy. */
  withNamespace(namespace: string): this {
    return this.withEnv(NAMESPACE_ENV, namespace);
  }

  getNamespace(): string {
    return this.envVars[NAMESPACE_ENV] ?? FlociOciContainer.DEFAULT_NAMESPACE;
  }

  /**
   * Hand out this private key (PEM) from the started container instead of generating one, e.g. to
   * share one key file between containers. The emulator never checks it.
   */
  withPrivateKeyPem(privateKeyPem: string): this {
    if (!privateKeyPem.trim()) {
      throw new Error('Private key PEM must not be empty');
    }
    this.privateKeyPem = privateKeyPem;
    return this;
  }

  /** Every service config as it is now, one per emulator service. */
  getServiceConfigs(): readonly OciServiceConfig[] {
    return Array.from(this.serviceConfigs.values());
  }

  withTlsConfig(config: TlsConfig): this {
    this.replaceConfigEnv(this.tlsConfig, config);
    this.tlsConfig = config;
    return this;
  }

  getTlsConfig(): TlsConfig { return this.tlsConfig; }

  withFunctionsConfig(config: FunctionsConfig): this { return this.setServiceConfig(config); }

  getFunctionsConfig(): FunctionsConfig { return this.serviceConfig(FunctionsConfig); }

  withIdentityConfig(config: IdentityConfig): this { return this.setServiceConfig(config); }

  getIdentityConfig(): IdentityConfig { return this.serviceConfig(IdentityConfig); }

  withKmsConfig(config: KmsConfig): this { return this.setServiceConfig(config); }

  getKmsConfig(): KmsConfig { return this.serviceConfig(KmsConfig); }

  withObjectStorageConfig(config: ObjectStorageConfig): this { return this.setServiceConfig(config); }

  getObjectStorageConfig(): ObjectStorageConfig { return this.serviceConfig(ObjectStorageConfig); }

  withOkeConfig(config: OkeConfig): this { return this.setServiceConfig(config); }

  getOkeConfig(): OkeConfig { return this.serviceConfig(OkeConfig); }

  withQueueConfig(config: QueueConfig): this { return this.setServiceConfig(config); }

  getQueueConfig(): QueueConfig { return this.serviceConfig(QueueConfig); }

  withStreamingConfig(config: StreamingConfig): this { return this.setServiceConfig(config); }

  getStreamingConfig(): StreamingConfig { return this.serviceConfig(StreamingConfig); }

  withVaultConfig(config: VaultConfig): this { return this.setServiceConfig(config); }

  getVaultConfig(): VaultConfig { return this.serviceConfig(VaultConfig); }

  async start(): Promise<StartedFlociOciContainer> {
    const { container, network } = await this.startContainer();
    return new StartedFlociOciContainer(container, {
      dedicatedNetworkName: this.dedicatedNetworkName,
      network,
      resourceNamespace: this.getResourceNamespace(),
      region: this.getRegion(),
      tenancyId: this.getTenancyId(),
      namespace: this.getNamespace(),
      privateKeyPem: this.privateKeyPem,
    });
  }

  private setServiceConfig(next: OciServiceConfig): this {
    this.replaceConfigEnv(this.serviceConfigs.get(next.token), next);
    this.serviceConfigs.set(next.token, next);
    return this;
  }

  private serviceConfig<T extends OciServiceConfig>(type: new () => T): T {
    for (const cfg of this.serviceConfigs.values()) {
      if (cfg instanceof type) {
        return cfg;
      }
    }
    throw new Error(`no ${type.name} registered`);
  }
}

/** A running Floci OCI emulator: the endpoint, the identities and credentials the OCI SDKs accept. */
export class StartedFlociOciContainer extends StartedFlociBaseContainer {
  private readonly region: string;
  private readonly tenancyId: string;
  private readonly namespace: string;
  private privateKeyPem?: string;

  constructor(
    container: StartedTestContainer,
    opts: {
      dedicatedNetworkName?: string;
      network?: StartedNetwork;
      resourceNamespace?: string;
      region?: string;
      tenancyId?: string;
      namespace?: string;
      privateKeyPem?: string;
    } = {},
  ) {
    super(container, OCI, opts.network, opts.dedicatedNetworkName, opts.resourceNamespace);
    this.region = opts.region ?? FlociOciContainer.DEFAULT_REGION;
    this.tenancyId = opts.tenancyId ?? FlociOciContainer.DEFAULT_TENANCY_ID;
    this.namespace = opts.namespace ?? FlociOciContainer.DEFAULT_NAMESPACE;
    this.privateKeyPem = opts.privateKeyPem;
  }

  /** `https://host:port` on the emulator port, which serves HTTPS too once TLS is enabled. */
  getHttpsEndpoint(): string {
    return `https://${this.container.getHost()}:${this.container.getMappedPort(FlociOciContainer.PORT)}`;
  }

  getRegion(): string { return this.region; }
  /** The tenancy OCID; it is also the root compartment, so pass it as `compartmentId`. */
  getTenancyId(): string { return this.tenancyId; }
  /** The Object Storage namespace. */
  getNamespace(): string { return this.namespace; }
  getUserId(): string { return FlociOciContainer.DEFAULT_USER_ID; }
  getFingerprint(): string { return FlociOciContainer.DEFAULT_FINGERPRINT; }

  /**
   * A throwaway RSA private key (PEM) to sign requests with, generated once per container on
   * first use unless one was given with `withPrivateKeyPem`. The emulator reads the tenancy and user from the signature but never verifies it,
   * so the key matches no uploaded public key and the fingerprint is a placeholder.
   */
  getPrivateKeyPem(): string {
    this.privateKeyPem ??= generatePrivateKeyPem();
    return this.privateKeyPem;
  }

  /**
   * The contents of an OCI config file with one profile for this container. Write
   * {@link getPrivateKeyPem} to `keyFile` and this text to a file, then load it with the SDK's
   * config file provider or `OCI_CLI_CONFIG_FILE`. The config file has no endpoint setting: set
   * {@link getEndpoint} on each client.
   */
  getConfigFileContents(keyFile: string, profile = 'DEFAULT'): string {
    return [
      `[${profile}]`,
      `user=${this.getUserId()}`,
      `fingerprint=${this.getFingerprint()}`,
      `tenancy=${this.tenancyId}`,
      `region=${this.region}`,
      `key_file=${keyFile}`,
      '',
    ].join('\n');
  }
}

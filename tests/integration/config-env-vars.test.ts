import {
  FlociContainer,
  StartedFlociContainer,
  CloudFrontConfig,
  BackupConfig,
  Route53Config,
  NeptuneConfig,
  CostExplorerConfig,
  CurConfig,
  BcmDataExportsConfig,
  PricingConfig,
  TextractConfig,
  TransferFamilyConfig,
  ConfigServiceConfig,
  TlsConfig,
  StorageConfig,
  DuckDbConfig,
} from '../../src';

describe('Config environment variable verification (integration)', () => {
  let floci: StartedFlociContainer;

  beforeAll(async () => {
    floci = await new FlociContainer()
      .withCloudFrontConfig(new CloudFrontConfig(true, 'custom-cdn.example.com'))
      .withBackupConfig(new BackupConfig(true, 10))
      .withRoute53Config(
        new Route53Config(true, 'ns-custom-1.test.org', 'ns-custom-2.test.net', 'ns-custom-3.test.com', 'ns-custom-4.test.co.uk'),
      )
      .withNeptuneConfig(new NeptuneConfig(false, 9000, 5, 'tinkerpop/gremlin-server:3.6.0'))
      .withCostExplorerConfig(new CostExplorerConfig(true, 42.5))
      .withCurConfig(new CurConfig(true, 'async', 'my-staging-bucket'))
      .withBcmDataExportsConfig(new BcmDataExportsConfig(true, 'async'))
      .withPricingConfig(new PricingConfig(true, '/tmp/pricing-snapshot.json'))
      .withTextractConfig(new TextractConfig(true))
      .withTransferFamilyConfig(new TransferFamilyConfig(true))
      .withConfigServiceConfig(new ConfigServiceConfig(true))
      .withTlsConfig(new TlsConfig(true, true))
      .withStorageConfig(new StorageConfig(undefined, false))
      .withDuckDbConfig(new DuckDbConfig('floci/floci-duck:custom', 'jdbc:duckdb:/tmp/test.db'))
      .start();
  }, 180_000);

  afterAll(async () => {
    if (floci) {
      await floci.stop();
    }
  });

  /**
   * Parse the output of `env` command into a key-value map.
   */
  function parseEnvOutput(output: string): Record<string, string> {
    const env: Record<string, string> = {};
    for (const line of output.split('\n')) {
      const idx = line.indexOf('=');
      if (idx > 0) {
        env[line.substring(0, idx)] = line.substring(idx + 1);
      }
    }
    return env;
  }

  it('should set CloudFront config env vars', async () => {
    const result = await floci.exec(['env']);
    const env = parseEnvOutput(result.output);

    expect(env['FLOCI_SERVICES_CLOUDFRONT_ENABLED']).toBe('true');
    expect(env['FLOCI_SERVICES_CLOUDFRONT_DOMAIN_SUFFIX']).toBe('custom-cdn.example.com');
  });

  it('should set Backup config env vars', async () => {
    const result = await floci.exec(['env']);
    const env = parseEnvOutput(result.output);

    expect(env['FLOCI_SERVICES_BACKUP_ENABLED']).toBe('true');
    expect(env['FLOCI_SERVICES_BACKUP_JOB_COMPLETION_DELAY_SECONDS']).toBe('10');
  });

  it('should set Route53 config env vars', async () => {
    const result = await floci.exec(['env']);
    const env = parseEnvOutput(result.output);

    expect(env['FLOCI_SERVICES_ROUTE53_ENABLED']).toBe('true');
    expect(env['FLOCI_SERVICES_ROUTE53_DEFAULT_NAMESERVER_1']).toBe('ns-custom-1.test.org');
    expect(env['FLOCI_SERVICES_ROUTE53_DEFAULT_NAMESERVER_2']).toBe('ns-custom-2.test.net');
    expect(env['FLOCI_SERVICES_ROUTE53_DEFAULT_NAMESERVER_3']).toBe('ns-custom-3.test.com');
    expect(env['FLOCI_SERVICES_ROUTE53_DEFAULT_NAMESERVER_4']).toBe('ns-custom-4.test.co.uk');
  });

  it('should set Neptune config env vars', async () => {
    const result = await floci.exec(['env']);
    const env = parseEnvOutput(result.output);

    expect(env['FLOCI_SERVICES_NEPTUNE_ENABLED']).toBe('false');
  });

  it('should set CostExplorer config env vars', async () => {
    const result = await floci.exec(['env']);
    const env = parseEnvOutput(result.output);

    expect(env['FLOCI_SERVICES_CE_ENABLED']).toBe('true');
    expect(env['FLOCI_SERVICES_CE_CREDIT_USD_MONTHLY']).toBe('42.5');
  });

  it('should set CUR config env vars', async () => {
    const result = await floci.exec(['env']);
    const env = parseEnvOutput(result.output);

    expect(env['FLOCI_SERVICES_CUR_ENABLED']).toBe('true');
    expect(env['FLOCI_SERVICES_CUR_EMIT_MODE']).toBe('async');
    expect(env['FLOCI_SERVICES_CUR_STAGING_BUCKET']).toBe('my-staging-bucket');
  });

  it('should set BcmDataExports config env vars', async () => {
    const result = await floci.exec(['env']);
    const env = parseEnvOutput(result.output);

    expect(env['FLOCI_SERVICES_BCM_DATA_EXPORTS_ENABLED']).toBe('true');
    expect(env['FLOCI_SERVICES_BCM_DATA_EXPORTS_EMIT_MODE']).toBe('async');
  });

  it('should set Pricing config env vars', async () => {
    const result = await floci.exec(['env']);
    const env = parseEnvOutput(result.output);

    expect(env['FLOCI_SERVICES_PRICING_ENABLED']).toBe('true');
    expect(env['FLOCI_SERVICES_PRICING_SNAPSHOT_PATH']).toBe('/tmp/pricing-snapshot.json');
  });

  it('should set Textract config env vars', async () => {
    const result = await floci.exec(['env']);
    const env = parseEnvOutput(result.output);

    expect(env['FLOCI_SERVICES_TEXTRACT_ENABLED']).toBe('true');
  });

  it('should set TransferFamily config env vars', async () => {
    const result = await floci.exec(['env']);
    const env = parseEnvOutput(result.output);

    expect(env['FLOCI_SERVICES_TRANSFER_ENABLED']).toBe('true');
  });

  it('should set ConfigService config env vars', async () => {
    const result = await floci.exec(['env']);
    const env = parseEnvOutput(result.output);

    expect(env['FLOCI_SERVICES_CONFIGSERVICE_ENABLED']).toBe('true');
  });

  it('should set TLS config env vars', async () => {
    const result = await floci.exec(['env']);
    const env = parseEnvOutput(result.output);

    expect(env['FLOCI_TLS_ENABLED']).toBe('true');
    expect(env['FLOCI_TLS_SELF_SIGNED']).toBe('true');
  });

  it('should set Storage config env vars', async () => {
    const result = await floci.exec(['env']);
    const env = parseEnvOutput(result.output);

    expect(env['FLOCI_STORAGE_PRUNE_VOLUMES_ON_DELETE']).toBe('false');
    // hostPersistentPath is undefined, so FLOCI_STORAGE_HOST_PERSISTENT_PATH should not be set
    expect(env['FLOCI_STORAGE_HOST_PERSISTENT_PATH']).toBeUndefined();
  });

  it('should set DuckDB config env vars', async () => {
    const result = await floci.exec(['env']);
    const env = parseEnvOutput(result.output);

    expect(env['FLOCI_SERVICES_DUCK_DEFAULT_IMAGE']).toBe('floci/floci-duck:custom');
    expect(env['FLOCI_SERVICES_DUCK_URL']).toBe('jdbc:duckdb:/tmp/test.db');
  });
});

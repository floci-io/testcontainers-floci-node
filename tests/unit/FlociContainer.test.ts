import {
  FlociContainer,
  StartedFlociContainer,
  DynamoDbConfig,
  EksConfig,
  LambdaConfig,
  RdsConfig,
  S3Config,
  SqsConfig,
  CloudFrontConfig,
  ConfigServiceConfig,
  BackupConfig,
  TransferFamilyConfig,
  Route53Config,
  TextractConfig,
  PricingConfig,
  NeptuneConfig,
  CostExplorerConfig,
  CurConfig,
  BcmDataExportsConfig,
  TlsConfig,
  StorageConfig,
  DuckDbConfig,
} from '../../src';

describe('FlociContainer (unit)', () => {
  it('has correct defaults', () => {
    const container = new FlociContainer();
    expect(FlociContainer.PORT).toBe(4566);
    expect(FlociContainer.DEFAULT_REGION).toBe('us-east-1');
    expect(FlociContainer.DEFAULT_ACCESS_KEY).toBe('test');
    expect(FlociContainer.DEFAULT_SECRET_KEY).toBe('test');
    expect(FlociContainer.DEFAULT_ACCOUNT_ID).toBe('000000000000');
  });

  it('uses custom image', () => {
    const container = new FlociContainer('floci/floci:1.2.3');
    // No error constructing with a custom image
    expect(container).toBeDefined();
  });

  it('withRegion returns this for chaining', () => {
    const container = new FlociContainer();
    const result = container.withRegion('eu-west-1');
    expect(result).toBe(container);
  });

  it('withAccountId returns this for chaining', () => {
    const container = new FlociContainer();
    const result = container.withAccountId('111122223333');
    expect(result).toBe(container);
  });

  it('withAvailabilityZone returns this for chaining', () => {
    const container = new FlociContainer();
    const result = container.withAvailabilityZone('eu-west-1a');
    expect(result).toBe(container);
  });

  it('withDedicatedNetwork sets network name', () => {
    const container = new FlociContainer().withDedicatedNetwork();
    const name = container.getDedicatedNetworkName();
    expect(name).toBeDefined();
    expect(name).toMatch(/^floci-network-[0-9a-f]{8}$/);
  });

  it('withS3Config stores config', () => {
    const config = new S3Config(true, 7200);
    const container = new FlociContainer().withS3Config(config);
    expect(container.getS3Config()).toBe(config);
    expect(container.getS3Config().defaultPresignExpirySeconds).toBe(7200);
  });

  it('withSqsConfig stores config', () => {
    const config = new SqsConfig(true, 60, 262144);
    const container = new FlociContainer().withSqsConfig(config);
    expect(container.getSqsConfig()).toBe(config);
    expect(container.getSqsConfig().defaultVisibilityTimeout).toBe(60);
  });

  it('withDynamoDbConfig stores config', () => {
    const config = new DynamoDbConfig(true);
    const container = new FlociContainer().withDynamoDbConfig(config);
    expect(container.getDynamoDbConfig()).toBe(config);
  });

  it('withRdsConfig stores config', () => {
    const config = new RdsConfig(true, 8000, 100, 'postgres:15');
    const container = new FlociContainer().withRdsConfig(config);
    expect(container.getRdsConfig().proxyBasePort).toBe(8000);
    expect(container.getRdsConfig().proxyPortCount).toBe(100);
    expect(container.getRdsConfig().defaultPostgresImage).toBe('postgres:15');
  });

  it('withLambdaConfig stores config', () => {
    const config = new LambdaConfig(true, 512, 3, true);
    const container = new FlociContainer().withLambdaConfig(config);
    expect(container.getLambdaConfig().defaultMemoryMb).toBe(512);
    expect(container.getLambdaConfig().ephemeral).toBe(true);
  });

  it('withEksConfig stores config', () => {
    const config = new EksConfig(true, true);
    const container = new FlociContainer().withEksConfig(config);
    expect(container.getEksConfig().mock).toBe(true);
  });

  it('supports fluent chaining across multiple config calls', () => {
    expect(() => {
      new FlociContainer()
        .withRegion('us-west-2')
        .withAccountId('999988887777')
        .withS3Config(new S3Config(true, 7200))
        .withSqsConfig(new SqsConfig(true, 60))
        .withDynamoDbConfig(new DynamoDbConfig(true));
    }).not.toThrow();
  });
});

describe('FlociContainer log level', () => {
  it('getLogLevel returns WARN by default', () => {
    const container = new FlociContainer();
    expect(container.getLogLevel()).toBe('WARN');
  });

  it.each(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'] as const)(
    'withLogLevel accepts valid level: %s',
    (level) => {
      const container = new FlociContainer();
      const result = container.withLogLevel(level);
      expect(result).toBe(container);
      expect(container.getLogLevel()).toBe(level);
    },
  );

  it('withLogLevel throws error for invalid value', () => {
    const container = new FlociContainer();
    expect(() => container.withLogLevel('INVALID' as any)).toThrow(
      'Invalid log level "INVALID". Must be one of: TRACE, DEBUG, INFO, WARN, ERROR',
    );
  });
});

describe('FlociContainer new config methods', () => {
  it('withCloudFrontConfig/getCloudFrontConfig stores config', () => {
    const config = new CloudFrontConfig(true, 'example.com');
    const container = new FlociContainer().withCloudFrontConfig(config);
    expect(container.getCloudFrontConfig()).toBe(config);
    expect(container.getCloudFrontConfig().domainSuffix).toBe('example.com');
  });

  it('withConfigServiceConfig/getConfigServiceConfig stores config', () => {
    const config = new ConfigServiceConfig(false);
    const container = new FlociContainer().withConfigServiceConfig(config);
    expect(container.getConfigServiceConfig()).toBe(config);
    expect(container.getConfigServiceConfig().enabled).toBe(false);
  });

  it('withBackupConfig/getBackupConfig stores config', () => {
    const config = new BackupConfig(true, 10);
    const container = new FlociContainer().withBackupConfig(config);
    expect(container.getBackupConfig()).toBe(config);
    expect(container.getBackupConfig().jobCompletionDelaySeconds).toBe(10);
  });

  it('withTransferFamilyConfig/getTransferFamilyConfig stores config', () => {
    const config = new TransferFamilyConfig(false);
    const container = new FlociContainer().withTransferFamilyConfig(config);
    expect(container.getTransferFamilyConfig()).toBe(config);
    expect(container.getTransferFamilyConfig().enabled).toBe(false);
  });

  it('withRoute53Config/getRoute53Config stores config', () => {
    const config = new Route53Config(true, 'ns1.test.org', 'ns2.test.net', 'ns3.test.com', 'ns4.test.uk');
    const container = new FlociContainer().withRoute53Config(config);
    expect(container.getRoute53Config()).toBe(config);
    expect(container.getRoute53Config().defaultNameserver1).toBe('ns1.test.org');
  });

  it('withTextractConfig/getTextractConfig stores config', () => {
    const config = new TextractConfig(false);
    const container = new FlociContainer().withTextractConfig(config);
    expect(container.getTextractConfig()).toBe(config);
    expect(container.getTextractConfig().enabled).toBe(false);
  });

  it('withPricingConfig/getPricingConfig stores config', () => {
    const config = new PricingConfig(true, '/path/to/snapshot');
    const container = new FlociContainer().withPricingConfig(config);
    expect(container.getPricingConfig()).toBe(config);
    expect(container.getPricingConfig().snapshotPath).toBe('/path/to/snapshot');
  });

  it('withNeptuneConfig/getNeptuneConfig stores config', () => {
    const config = new NeptuneConfig(true, 9000, 50, 'custom-image:1.0', 'my-network');
    const container = new FlociContainer().withNeptuneConfig(config);
    expect(container.getNeptuneConfig()).toBe(config);
    expect(container.getNeptuneConfig().proxyBasePort).toBe(9000);
    expect(container.getNeptuneConfig().proxyPortCount).toBe(50);
    expect(container.getNeptuneConfig().defaultImage).toBe('custom-image:1.0');
    expect(container.getNeptuneConfig().dockerNetwork).toBe('my-network');
  });

  it('withCostExplorerConfig/getCostExplorerConfig stores config', () => {
    const config = new CostExplorerConfig(true, 100.5);
    const container = new FlociContainer().withCostExplorerConfig(config);
    expect(container.getCostExplorerConfig()).toBe(config);
    expect(container.getCostExplorerConfig().creditUsdMonthly).toBe(100.5);
  });

  it('withCurConfig/getCurConfig stores config', () => {
    const config = new CurConfig(true, 'async', 'my-bucket');
    const container = new FlociContainer().withCurConfig(config);
    expect(container.getCurConfig()).toBe(config);
    expect(container.getCurConfig().emitMode).toBe('async');
    expect(container.getCurConfig().stagingBucket).toBe('my-bucket');
  });

  it('withBcmDataExportsConfig/getBcmDataExportsConfig stores config', () => {
    const config = new BcmDataExportsConfig(true, 'async');
    const container = new FlociContainer().withBcmDataExportsConfig(config);
    expect(container.getBcmDataExportsConfig()).toBe(config);
    expect(container.getBcmDataExportsConfig().emitMode).toBe('async');
  });

  it('withTlsConfig/getTlsConfig stores config', () => {
    const config = new TlsConfig(true, false, '/cert.pem', '/key.pem');
    const container = new FlociContainer().withTlsConfig(config);
    expect(container.getTlsConfig()).toBe(config);
    expect(container.getTlsConfig().enabled).toBe(true);
    expect(container.getTlsConfig().selfSigned).toBe(false);
    expect(container.getTlsConfig().certPath).toBe('/cert.pem');
    expect(container.getTlsConfig().keyPath).toBe('/key.pem');
  });

  it('withStorageConfig/getStorageConfig stores config', () => {
    const config = new StorageConfig('/data/path', false);
    const container = new FlociContainer().withStorageConfig(config);
    expect(container.getStorageConfig()).toBe(config);
    expect(container.getStorageConfig()!.hostPersistentPath).toBe('/data/path');
    expect(container.getStorageConfig()!.pruneVolumesOnDelete).toBe(false);
  });

  it('getStorageConfig returns undefined when not set', () => {
    const container = new FlociContainer();
    expect(container.getStorageConfig()).toBeUndefined();
  });

  it('withDuckDbConfig/getDuckDbConfig stores config', () => {
    const config = new DuckDbConfig('custom/duck:v2', 'http://localhost:9090');
    const container = new FlociContainer().withDuckDbConfig(config);
    expect(container.getDuckDbConfig()).toBe(config);
    expect(container.getDuckDbConfig().defaultImage).toBe('custom/duck:v2');
    expect(container.getDuckDbConfig().url).toBe('http://localhost:9090');
  });

  it('all new config methods return this for chaining', () => {
    expect(() => {
      new FlociContainer()
        .withCloudFrontConfig(new CloudFrontConfig())
        .withConfigServiceConfig(new ConfigServiceConfig())
        .withBackupConfig(new BackupConfig())
        .withTransferFamilyConfig(new TransferFamilyConfig())
        .withRoute53Config(new Route53Config())
        .withTextractConfig(new TextractConfig())
        .withPricingConfig(new PricingConfig())
        .withNeptuneConfig(new NeptuneConfig())
        .withCostExplorerConfig(new CostExplorerConfig())
        .withCurConfig(new CurConfig())
        .withBcmDataExportsConfig(new BcmDataExportsConfig())
        .withTlsConfig(new TlsConfig())
        .withStorageConfig(new StorageConfig())
        .withDuckDbConfig(new DuckDbConfig())
        .withLogLevel('DEBUG');
    }).not.toThrow();
  });
});

describe('StartedFlociContainer.getSecureEndpoint()', () => {
  const mockContainer = {
    getHost: () => 'localhost',
    getMappedPort: (port: number) => port === 4566 ? 49152 : port,
    stop: async () => {},
  } as any;

  it('returns https endpoint when TLS is enabled', () => {
    const started = new StartedFlociContainer(mockContainer, {
      region: 'us-east-1',
      availabilityZone: 'us-east-1a',
      accountId: '000000000000',
      tlsEnabled: true,
    });
    expect(started.getSecureEndpoint()).toBe('https://localhost:49152');
  });

  it('throws error when TLS is not enabled', () => {
    const started = new StartedFlociContainer(mockContainer, {
      region: 'us-east-1',
      availabilityZone: 'us-east-1a',
      accountId: '000000000000',
      tlsEnabled: false,
    });
    expect(() => started.getSecureEndpoint()).toThrow(
      'TLS is not enabled on this container. Use withTlsConfig(new TlsConfig(true)) before starting.',
    );
  });
});

describe('StartedFlociContainer.stop() storage cleanup', () => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  const mockContainer = {
    getHost: () => 'localhost',
    getMappedPort: (port: number) => port === 4566 ? 49152 : port,
    stop: async () => {},
  } as any;

  it('deletes hostPersistentPath on stop', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'floci-test-'));
    fs.writeFileSync(path.join(tmpDir, 'test.txt'), 'data');

    const started = new StartedFlociContainer(mockContainer, {
      region: 'us-east-1',
      availabilityZone: 'us-east-1a',
      accountId: '000000000000',
      tlsEnabled: false,
      hostPersistentPath: tmpDir,
    });

    expect(fs.existsSync(tmpDir)).toBe(true);
    await started.stop();
    expect(fs.existsSync(tmpDir)).toBe(false);
  });

  it('does not throw when hostPersistentPath is undefined', async () => {
    const started = new StartedFlociContainer(mockContainer, {
      region: 'us-east-1',
      availabilityZone: 'us-east-1a',
      accountId: '000000000000',
      tlsEnabled: false,
    });

    await expect(started.stop()).resolves.toBeUndefined();
  });
});

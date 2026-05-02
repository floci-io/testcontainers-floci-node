import {
  FlociContainer,
  DynamoDbConfig,
  EksConfig,
  LambdaConfig,
  RdsConfig,
  S3Config,
  SqsConfig,
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

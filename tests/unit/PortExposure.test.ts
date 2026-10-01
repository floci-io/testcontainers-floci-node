import { GenericContainer, StartedTestContainer } from 'testcontainers';
import {
  Ec2Config,
  EcrConfig,
  EksConfig,
  ElastiCacheConfig,
  ElbV2Config,
  FlociContainer,
  LambdaConfig,
  NeptuneConfig,
  OpenSearchConfig,
  RdsConfig,
} from '../../src';

describe('FlociContainer exposed ports', () => {
  const startedPorts = async (container: FlociContainer) => {
    const exposed = jest.spyOn(GenericContainer.prototype, 'withExposedPorts');
    jest.spyOn(GenericContainer.prototype, 'start').mockResolvedValue({} as StartedTestContainer);
    await container.start();
    return new Set(exposed.mock.calls[0]);
  };

  afterEach(() => jest.restoreAllMocks());

  it('publishes only the gateway port by default', async () => {
    expect(await startedPorts(new FlociContainer())).toEqual(new Set([4566]));
  });

  it('publishes explicitly requested service ranges and manual ports', async () => {
    const container = new FlociContainer()
      .withExposedPort(9000)
      .withRdsConfig(new RdsConfig(true, 7001, 2))
      .withEcrConfig(new EcrConfig(true, 'registry:2', 5100, 2));
    expect(await startedPorts(container)).toEqual(new Set([4566, 9000, 7001, 7002, 5100, 5101]));
  });

  it('removes a replaced config range without removing a manual port', async () => {
    const container = new FlociContainer()
      .withExposedPort(5100)
      .withEcrConfig(new EcrConfig(true, 'registry:2', 5100, 2))
      .withEcrConfig(new EcrConfig(true, 'registry:2', 5200, 1));
    expect(await startedPorts(container)).toEqual(new Set([4566, 5100, 5200]));
  });

  it('removes a service range when that service is disabled', async () => {
    const container = new FlociContainer()
      .withRdsConfig(new RdsConfig(true, 7001, 2))
      .withRdsConfig(new RdsConfig(false, 7001, 2));
    expect(await startedPorts(container)).toEqual(new Set([4566]));
  });

  it('does not publish ports for disabled service configs', async () => {
    const container = new FlociContainer()
      .withEc2Config(new Ec2Config(false))
      .withEcrConfig(new EcrConfig(false))
      .withEksConfig(new EksConfig(false))
      .withElastiCacheConfig(new ElastiCacheConfig(false))
      .withElbV2Config(new ElbV2Config(false, false, [80]))
      .withLambdaConfig(new LambdaConfig(false, 128, 3, false, false, 9200, 2, true))
      .withOpenSearchConfig(new OpenSearchConfig(false))
      .withRdsConfig(new RdsConfig(false))
      .withNeptuneConfig(new NeptuneConfig(false));
    expect(await startedPorts(container)).toEqual(new Set([4566]));
  });

  it('publishes EC2, ELB, and opted-in Lambda ports', async () => {
    const container = new FlociContainer()
      .withEc2Config(new Ec2Config(true, false, 9169))
      .withElbV2Config(new ElbV2Config(true, false, [80, 443]))
      .withLambdaConfig(new LambdaConfig(true, 128, 3, false, false, 9200, 2, true));
    expect(await startedPorts(container)).toEqual(new Set([4566, 9169, 80, 443, 9200, 9201]));
  });
});

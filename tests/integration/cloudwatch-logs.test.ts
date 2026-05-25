import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  DescribeLogGroupsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { FlociContainer, StartedFlociContainer } from '../../src';

describe('CloudWatch Logs (integration)', () => {
  let floci: StartedFlociContainer;
  let logs: CloudWatchLogsClient;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
    logs = new CloudWatchLogsClient({
      endpoint: floci.getEndpoint(),
      region: floci.getRegion(),
      credentials: {
        accessKeyId: floci.getAccessKey(),
        secretAccessKey: floci.getSecretKey(),
      },
    });
  });

  afterAll(async () => {
    if (floci) {
      await floci.stop();
    }
  });

  it('creates and describes a log group', async () => {
    const logGroupName = `/test/logs-${Date.now()}`;
    await logs.send(new CreateLogGroupCommand({ logGroupName }));

    const { logGroups } = await logs.send(
      new DescribeLogGroupsCommand({ logGroupNamePrefix: logGroupName }),
    );
    const names = (logGroups ?? []).map((g) => g.logGroupName);
    expect(names).toContain(logGroupName);
  });
});

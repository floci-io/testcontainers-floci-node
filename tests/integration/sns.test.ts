import {
  SNSClient,
  CreateTopicCommand,
  ListTopicsCommand,
} from '@aws-sdk/client-sns';
import { FlociContainer, StartedFlociContainer } from '../../src';
import { TEST_IMAGE } from './images';

describe('SNS (integration)', () => {
  let floci: StartedFlociContainer;
  let sns: SNSClient;

  beforeAll(async () => {
    floci = await new FlociContainer(TEST_IMAGE).start();
    sns = new SNSClient({
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

  it('creates a topic and lists it', async () => {
    const topicName = `test-topic-${Date.now()}`;
    const { TopicArn } = await sns.send(new CreateTopicCommand({ Name: topicName }));
    expect(TopicArn).toBeDefined();

    const { Topics } = await sns.send(new ListTopicsCommand({}));
    const arns = (Topics ?? []).map((t) => t.TopicArn);
    expect(arns).toContain(TopicArn);
  });
});

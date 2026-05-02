import {
  SQSClient,
  CreateQueueCommand,
  SendMessageCommand,
  ReceiveMessageCommand,
} from '@aws-sdk/client-sqs';
import { FlociContainer, StartedFlociContainer } from '../../src';

describe('SQS (integration)', () => {
  let floci: StartedFlociContainer;
  let sqs: SQSClient;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
    sqs = new SQSClient({
      endpoint: floci.getEndpoint(),
      region: floci.getRegion(),
      credentials: {
        accessKeyId: floci.getAccessKey(),
        secretAccessKey: floci.getSecretKey(),
      },
    });
  });

  afterAll(async () => {
    await floci.stop();
  });

  it('sends and receives a message', async () => {
    const { QueueUrl } = await sqs.send(
      new CreateQueueCommand({ QueueName: `test-queue-${Date.now()}` }),
    );
    expect(QueueUrl).toBeDefined();

    await sqs.send(
      new SendMessageCommand({ QueueUrl: QueueUrl!, MessageBody: 'hello floci' }),
    );

    const { Messages } = await sqs.send(
      new ReceiveMessageCommand({ QueueUrl: QueueUrl!, MaxNumberOfMessages: 1 }),
    );
    expect(Messages).toHaveLength(1);
    expect(Messages![0].Body).toBe('hello floci');
  });
});

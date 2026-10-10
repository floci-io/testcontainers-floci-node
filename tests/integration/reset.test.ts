import { CreateQueueCommand, ListQueuesCommand, SQSClient } from '@aws-sdk/client-sqs';
import { FlociContainer, StartedFlociContainer } from '../../src';

describe('reset (integration)', () => {
  let floci: StartedFlociContainer;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
  });

  afterAll(async () => {
    if (floci) {
      await floci.stop();
    }
  });

  it('wipes state and keeps serving requests', async () => {
    const sqs = new SQSClient({
      endpoint: floci.getEndpoint(),
      region: floci.getRegion(),
      credentials: { accessKeyId: floci.getAccessKey(), secretAccessKey: floci.getSecretKey() },
    });
    await sqs.send(new CreateQueueCommand({ QueueName: 'before-reset' }));

    await floci.reset();

    const { QueueUrls } = await sqs.send(new ListQueuesCommand({}));
    expect(QueueUrls ?? []).toHaveLength(0);
    await sqs.send(new CreateQueueCommand({ QueueName: 'after-reset' }));
  });
});

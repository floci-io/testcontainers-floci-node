import {
  KinesisClient,
  CreateStreamCommand,
  ListStreamsCommand,
} from '@aws-sdk/client-kinesis';
import { FlociContainer, StartedFlociContainer } from '../../src';

describe('Kinesis (integration)', () => {
  let floci: StartedFlociContainer;
  let kinesis: KinesisClient;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
    kinesis = new KinesisClient({
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

  it('creates a stream and lists it', async () => {
    const streamName = `test-stream-${Date.now()}`;
    await kinesis.send(
      new CreateStreamCommand({
        StreamName: streamName,
        ShardCount: 1,
      }),
    );

    const { StreamNames } = await kinesis.send(new ListStreamsCommand({}));
    expect(StreamNames).toContain(streamName);
  });
});

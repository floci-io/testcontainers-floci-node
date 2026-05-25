import {
  FirehoseClient,
  CreateDeliveryStreamCommand,
  ListDeliveryStreamsCommand,
} from '@aws-sdk/client-firehose';
import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3';
import { FlociContainer, StartedFlociContainer } from '../../src';

describe('Firehose (integration)', () => {
  let floci: StartedFlociContainer;
  let firehose: FirehoseClient;
  let s3: S3Client;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
    firehose = new FirehoseClient({
      endpoint: floci.getEndpoint(),
      region: floci.getRegion(),
      credentials: {
        accessKeyId: floci.getAccessKey(),
        secretAccessKey: floci.getSecretKey(),
      },
    });
    s3 = new S3Client({
      endpoint: floci.getEndpoint(),
      region: floci.getRegion(),
      credentials: {
        accessKeyId: floci.getAccessKey(),
        secretAccessKey: floci.getSecretKey(),
      },
      forcePathStyle: true,
    });
  });

  afterAll(async () => {
    if (floci) {
      await floci.stop();
    }
  });

  it('creates a delivery stream and lists it', async () => {
    const bucketName = `firehose-dest-${Date.now()}`;
    await s3.send(new CreateBucketCommand({ Bucket: bucketName }));

    const streamName = `test-stream-${Date.now()}`;
    await firehose.send(
      new CreateDeliveryStreamCommand({
        DeliveryStreamName: streamName,
        S3DestinationConfiguration: {
          BucketARN: `arn:aws:s3:::${bucketName}`,
          RoleARN: 'arn:aws:iam::000000000000:role/firehose-role',
        },
      }),
    );

    const { DeliveryStreamNames } = await firehose.send(
      new ListDeliveryStreamsCommand({}),
    );
    expect(DeliveryStreamNames).toContain(streamName);
  });
});

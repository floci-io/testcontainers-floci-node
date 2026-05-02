import {
  S3Client,
  CreateBucketCommand,
  ListBucketsCommand,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { FlociContainer, StartedFlociContainer } from '../../src';

describe('S3 (integration)', () => {
  let floci: StartedFlociContainer;
  let s3: S3Client;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
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
    await floci.stop();
  });

  it('creates and lists a bucket', async () => {
    const bucketName = `test-bucket-${Date.now()}`;
    await s3.send(new CreateBucketCommand({ Bucket: bucketName }));

    const { Buckets } = await s3.send(new ListBucketsCommand({}));
    const names = (Buckets ?? []).map((b) => b.Name);
    expect(names).toContain(bucketName);
  });

  it('puts and gets an object', async () => {
    const bucketName = `test-objects-${Date.now()}`;
    await s3.send(new CreateBucketCommand({ Bucket: bucketName }));

    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: 'hello.txt',
        Body: 'Hello from Floci!',
      }),
    );

    const response = await s3.send(
      new GetObjectCommand({ Bucket: bucketName, Key: 'hello.txt' }),
    );
    const body = await response.Body?.transformToString();
    expect(body).toBe('Hello from Floci!');
  });
});

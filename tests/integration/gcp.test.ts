import { PubSub, type Subscription } from '@google-cloud/pubsub';
import { Storage } from '@google-cloud/storage';
import { FlociGcpContainer, StartedFlociGcpContainer } from '../../src';
import { GCP_TEST_IMAGE } from './images';

describe('Floci GCP (integration)', () => {
  let floci: StartedFlociGcpContainer;
  const savedEnv: Record<string, string | undefined> = {};

  beforeAll(async () => {
    floci = await new FlociGcpContainer(GCP_TEST_IMAGE).start();
    // The Google SDKs find the emulator through these variables, as they would in a real test suite.
    for (const [key, value] of Object.entries(floci.getEmulatorEnv())) {
      savedEnv[key] = process.env[key];
      process.env[key] = value;
    }
  });

  afterAll(async () => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    if (floci) {
      await floci.stop();
    }
  });

  it('starts and answers on its health path', async () => {
    const res = await fetch(`${floci.getEndpoint()}/_floci-gcp/health`);
    expect(res.status).toBe(200);
    expect(floci.getMappedPort(FlociGcpContainer.PORT)).toBeGreaterThan(0);
    expect(floci.getProjectId()).toBe('floci-local');
  });

  it('round-trips an object with the Cloud Storage SDK', async () => {
    const storage = new Storage({ projectId: floci.getProjectId() });
    const [bucket] = await storage.createBucket('tc-objects');
    await bucket.file('hello.txt').save('hello floci', { resumable: false });

    const [contents] = await bucket.file('hello.txt').download();
    expect(contents.toString()).toBe('hello floci');
  });

  it('round-trips a message with the Pub/Sub SDK', async () => {
    const pubsub = new PubSub({ projectId: floci.getProjectId() });
    let subscription: Subscription | undefined;
    let timer: NodeJS.Timeout | undefined;
    try {
      const [topic] = await pubsub.createTopic('tc-topic');
      [subscription] = await topic.createSubscription('tc-subscription');

      const opened = subscription;
      // Reject well inside Jest's timeout, so a lost message still reaches the cleanup below.
      const received = new Promise<string>((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('no Pub/Sub message within 30s')), 30_000);
        opened.on('message', (message) => {
          message.ack();
          resolve(message.data.toString());
        });
        opened.on('error', reject);
      });
      await topic.publishMessage({ data: Buffer.from('hello floci') });

      expect(await received).toBe('hello floci');
    } finally {
      clearTimeout(timer);
      await subscription?.close();
      await pubsub.close();
    }
  });

  it('wipes state on reset() and keeps serving requests', async () => {
    const storage = new Storage({ projectId: floci.getProjectId() });
    await storage.createBucket('before-reset');

    await floci.reset();

    const [buckets] = await storage.getBuckets();
    expect(buckets.map((b) => b.name)).toEqual([]);
    await storage.createBucket('after-reset');
  });

  it('gives each start its own resource namespace', async () => {
    const other = await new FlociGcpContainer(GCP_TEST_IMAGE).start();
    try {
      expect(floci.getResourceNamespace()).toMatch(/^tc-[0-9a-f]{8}$/);
      expect(other.getResourceNamespace()).toMatch(/^tc-[0-9a-f]{8}$/);
      expect(other.getResourceNamespace()).not.toBe(floci.getResourceNamespace());
      const env = await other.exec(['printenv', 'FLOCI_GCP_DOCKER_RESOURCE_NAMESPACE']);
      expect(env.output.trim()).toBe(other.getResourceNamespace());
    } finally {
      await other.stop();
    }
  });
});

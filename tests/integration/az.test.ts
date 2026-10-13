import { BlobServiceClient } from '@azure/storage-blob';
import { QueueServiceClient } from '@azure/storage-queue';
import { FlociAzContainer, StartedFlociAzContainer } from '../../src';
import { AZ_TEST_IMAGE } from './images';

describe('Floci Azure (integration)', () => {
  let floci: StartedFlociAzContainer;

  beforeAll(async () => {
    floci = await new FlociAzContainer(AZ_TEST_IMAGE).start();
  });

  afterAll(async () => {
    if (floci) {
      await floci.stop();
    }
  });

  it('starts and answers on its health path', async () => {
    const res = await fetch(`${floci.getEndpoint()}/_floci/health`);
    expect(res.status).toBe(200);
    expect(floci.getMappedPort(FlociAzContainer.PORT)).toBeGreaterThan(0);
  });

  it('round-trips a blob with the Azure SDK', async () => {
    const blobs = BlobServiceClient.fromConnectionString(floci.getStorageConnectionString());
    const container = blobs.getContainerClient('tc-blobs');
    await container.create();
    const blob = container.getBlockBlobClient('hello.txt');
    await blob.upload('hello floci', 'hello floci'.length);

    expect((await blob.downloadToBuffer()).toString()).toBe('hello floci');
  });

  it('round-trips a queue message with the Azure SDK', async () => {
    const queues = QueueServiceClient.fromConnectionString(floci.getStorageConnectionString());
    const queue = queues.getQueueClient('tc-queue');
    await queue.create();
    await queue.sendMessage('hello floci');

    const { receivedMessageItems } = await queue.receiveMessages();
    expect(receivedMessageItems.map((m) => m.messageText)).toEqual(['hello floci']);
  });

  it('wipes state on reset() and keeps serving requests', async () => {
    const blobs = BlobServiceClient.fromConnectionString(floci.getStorageConnectionString());
    await blobs.getContainerClient('before-reset').create();

    await floci.reset();

    const names: string[] = [];
    for await (const c of blobs.listContainers()) {
      names.push(c.name);
    }
    expect(names).toEqual([]);
    await blobs.getContainerClient('after-reset').create();
  });

  it('gives each start its own resource namespace', async () => {
    const other = await new FlociAzContainer(AZ_TEST_IMAGE).start();
    try {
      expect(floci.getResourceNamespace()).toMatch(/^tc-[0-9a-f]{8}$/);
      expect(other.getResourceNamespace()).toMatch(/^tc-[0-9a-f]{8}$/);
      expect(other.getResourceNamespace()).not.toBe(floci.getResourceNamespace());
      const env = await other.exec(['printenv', 'FLOCI_AZ_DOCKER_RESOURCE_NAMESPACE']);
      expect(env.output.trim()).toBe(other.getResourceNamespace());
    } finally {
      await other.stop();
    }
  });
});

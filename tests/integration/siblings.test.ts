import { CreateRepositoryCommand, ECRClient } from '@aws-sdk/client-ecr';
import { getContainerRuntimeClient } from 'testcontainers';
import { FlociContainer } from '../../src';
import { TEST_IMAGE } from './images';

async function siblings(namespace: string): Promise<number> {
  const dockerode = (await getContainerRuntimeClient()).container.dockerode;
  const list = await dockerode.listContainers({ all: true, filters: { label: [`floci_namespace=${namespace}`] } });
  return list.length;
}

describe('sibling containers (integration)', () => {
  it('stop() removes the sibling containers Floci spawned', async () => {
    const floci = await new FlociContainer(TEST_IMAGE).start();
    const namespace = floci.getResourceNamespace()!;
    try {
      // CreateRepository makes Floci start its ECR registry as a sibling container.
      const ecr = new ECRClient({
        endpoint: floci.getEndpoint(),
        region: floci.getRegion(),
        credentials: { accessKeyId: floci.getAccessKey(), secretAccessKey: floci.getSecretKey() },
      });
      await ecr.send(new CreateRepositoryCommand({ repositoryName: 'cleanup-test' }));
      expect(await siblings(namespace)).toBeGreaterThan(0);
    } finally {
      await floci.stop();
    }
    expect(await siblings(namespace)).toBe(0);
  });
});

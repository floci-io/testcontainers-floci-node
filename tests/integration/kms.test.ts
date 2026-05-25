import {
  KMSClient,
  CreateKeyCommand,
  ListKeysCommand,
} from '@aws-sdk/client-kms';
import { FlociContainer, StartedFlociContainer } from '../../src';

describe('KMS (integration)', () => {
  let floci: StartedFlociContainer;
  let kms: KMSClient;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
    kms = new KMSClient({
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

  it('creates a key and lists it', async () => {
    const { KeyMetadata } = await kms.send(
      new CreateKeyCommand({
        Description: 'test-key',
        KeyUsage: 'ENCRYPT_DECRYPT',
      }),
    );
    expect(KeyMetadata).toBeDefined();
    expect(KeyMetadata!.KeyId).toBeDefined();

    const { Keys } = await kms.send(new ListKeysCommand({}));
    const keyIds = (Keys ?? []).map((k) => k.KeyId);
    expect(keyIds).toContain(KeyMetadata!.KeyId);
  });
});

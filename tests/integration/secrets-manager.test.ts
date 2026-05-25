import {
  SecretsManagerClient,
  CreateSecretCommand,
  ListSecretsCommand,
} from '@aws-sdk/client-secrets-manager';
import { FlociContainer, StartedFlociContainer } from '../../src';

describe('Secrets Manager (integration)', () => {
  let floci: StartedFlociContainer;
  let sm: SecretsManagerClient;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
    sm = new SecretsManagerClient({
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

  it('creates a secret and lists it', async () => {
    const secretName = `test-secret-${Date.now()}`;
    const { ARN } = await sm.send(
      new CreateSecretCommand({
        Name: secretName,
        SecretString: JSON.stringify({ username: 'admin', password: 's3cr3t' }),
      }),
    );
    expect(ARN).toBeDefined();

    const { SecretList } = await sm.send(new ListSecretsCommand({}));
    const names = (SecretList ?? []).map((s) => s.Name);
    expect(names).toContain(secretName);
  });
});

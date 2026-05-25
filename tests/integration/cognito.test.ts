import {
  CognitoIdentityProviderClient,
  CreateUserPoolCommand,
  ListUserPoolsCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { FlociContainer, StartedFlociContainer } from '../../src';

describe('Cognito (integration)', () => {
  let floci: StartedFlociContainer;
  let cognito: CognitoIdentityProviderClient;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
    cognito = new CognitoIdentityProviderClient({
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

  it('creates and lists a user pool', async () => {
    const poolName = `test-pool-${Date.now()}`;
    const { UserPool } = await cognito.send(
      new CreateUserPoolCommand({ PoolName: poolName }),
    );
    expect(UserPool?.Id).toBeDefined();

    const { UserPools } = await cognito.send(
      new ListUserPoolsCommand({ MaxResults: 60 }),
    );
    const names = (UserPools ?? []).map((p) => p.Name);
    expect(names).toContain(poolName);
  });
});

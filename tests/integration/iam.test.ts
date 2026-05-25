import {
  IAMClient,
  CreateRoleCommand,
  ListRolesCommand,
} from '@aws-sdk/client-iam';
import { FlociContainer, StartedFlociContainer } from '../../src';

describe('IAM (integration)', () => {
  let floci: StartedFlociContainer;
  let iam: IAMClient;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
    iam = new IAMClient({
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

  it('creates a role and lists it', async () => {
    const roleName = `test-role-${Date.now()}`;
    const assumeRolePolicy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { Service: 'lambda.amazonaws.com' },
          Action: 'sts:AssumeRole',
        },
      ],
    });

    await iam.send(
      new CreateRoleCommand({
        RoleName: roleName,
        AssumeRolePolicyDocument: assumeRolePolicy,
      }),
    );

    const { Roles } = await iam.send(new ListRolesCommand({}));
    const names = (Roles ?? []).map((r) => r.RoleName);
    expect(names).toContain(roleName);
  });
});

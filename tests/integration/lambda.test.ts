import {
  LambdaClient,
  CreateFunctionCommand,
  ListFunctionsCommand,
} from '@aws-sdk/client-lambda';
import {
  IAMClient,
  CreateRoleCommand,
} from '@aws-sdk/client-iam';
import { FlociContainer, StartedFlociContainer } from '../../src';

describe('Lambda (integration)', () => {
  let floci: StartedFlociContainer;
  let lambda: LambdaClient;
  let iam: IAMClient;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
    lambda = new LambdaClient({
      endpoint: floci.getEndpoint(),
      region: floci.getRegion(),
      credentials: {
        accessKeyId: floci.getAccessKey(),
        secretAccessKey: floci.getSecretKey(),
      },
    });
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

  it('creates a function and lists it', async () => {
    // Create a minimal IAM role for the Lambda function
    const roleName = `lambda-role-${Date.now()}`;
    const { Role } = await iam.send(
      new CreateRoleCommand({
        RoleName: roleName,
        AssumeRolePolicyDocument: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { Service: 'lambda.amazonaws.com' },
              Action: 'sts:AssumeRole',
            },
          ],
        }),
      }),
    );

    // Create a valid zip payload containing a minimal Lambda handler
    const minimalZip = Buffer.from(
      'UEsDBBQACAAIADltuFwAAAAAAAAAAAAAAAAIAAAAaW5kZXguanNLrSjILyop' +
      '1stIzEvJSS1SsFVILK7MS1bQ0FSwtVPQqFYoLkksKS12zk9JtVIwMjBQqNW0' +
      'BgBQSwcIDLTVTjYAAAA0AAAAUEsBAi0DFAAIAAgAOW24XAy01U42AAAANAAAA' +
      'AgAAAAAAAAAAAAgAKSBAAAAAGluZGV4LmpzUEsFBgAAAAABAAEANgAAAGwAAAAA' +
      'AA==',
      'base64',
    );

    const functionName = `test-fn-${Date.now()}`;
    await lambda.send(
      new CreateFunctionCommand({
        FunctionName: functionName,
        Runtime: 'nodejs18.x',
        Role: Role!.Arn!,
        Handler: 'index.handler',
        Code: { ZipFile: minimalZip },
      }),
    );

    const { Functions } = await lambda.send(new ListFunctionsCommand({}));
    const names = (Functions ?? []).map((f) => f.FunctionName);
    expect(names).toContain(functionName);
  });
});

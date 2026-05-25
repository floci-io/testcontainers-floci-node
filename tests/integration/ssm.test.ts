import {
  SSMClient,
  PutParameterCommand,
  GetParameterCommand,
} from '@aws-sdk/client-ssm';
import { FlociContainer, StartedFlociContainer } from '../../src';

describe('SSM (integration)', () => {
  let floci: StartedFlociContainer;
  let ssm: SSMClient;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
    ssm = new SSMClient({
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

  it('puts a parameter and gets it', async () => {
    const paramName = `/test/param-${Date.now()}`;
    const paramValue = 'hello-floci';

    await ssm.send(
      new PutParameterCommand({
        Name: paramName,
        Value: paramValue,
        Type: 'String',
      }),
    );

    const { Parameter } = await ssm.send(
      new GetParameterCommand({ Name: paramName }),
    );
    expect(Parameter).toBeDefined();
    expect(Parameter!.Name).toBe(paramName);
    expect(Parameter!.Value).toBe(paramValue);
  });
});

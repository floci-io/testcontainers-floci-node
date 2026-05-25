import {
  SFNClient,
  CreateStateMachineCommand,
  ListStateMachinesCommand,
} from '@aws-sdk/client-sfn';
import { FlociContainer, StartedFlociContainer } from '../../src';

describe('Step Functions (integration)', () => {
  let floci: StartedFlociContainer;
  let sfn: SFNClient;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
    sfn = new SFNClient({
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

  it('creates a state machine and lists it', async () => {
    const name = `test-sm-${Date.now()}`;
    const definition = JSON.stringify({
      StartAt: 'Pass',
      States: {
        Pass: { Type: 'Pass', End: true },
      },
    });

    const { stateMachineArn } = await sfn.send(
      new CreateStateMachineCommand({
        name,
        definition,
        roleArn: `arn:aws:iam::${floci.getAccountId()}:role/test-role`,
      }),
    );
    expect(stateMachineArn).toBeDefined();

    const { stateMachines } = await sfn.send(new ListStateMachinesCommand({}));
    const arns = (stateMachines ?? []).map((sm) => sm.stateMachineArn);
    expect(arns).toContain(stateMachineArn);
  });
});

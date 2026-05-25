import {
  EventBridgeClient,
  PutRuleCommand,
  ListRulesCommand,
} from '@aws-sdk/client-eventbridge';
import { FlociContainer, StartedFlociContainer } from '../../src';

describe('EventBridge (integration)', () => {
  let floci: StartedFlociContainer;
  let eventbridge: EventBridgeClient;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
    eventbridge = new EventBridgeClient({
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

  it('creates a rule and lists it', async () => {
    const ruleName = `test-rule-${Date.now()}`;
    await eventbridge.send(
      new PutRuleCommand({
        Name: ruleName,
        ScheduleExpression: 'rate(1 minute)',
        State: 'ENABLED',
      }),
    );

    const { Rules } = await eventbridge.send(new ListRulesCommand({}));
    const names = (Rules ?? []).map((r) => r.Name);
    expect(names).toContain(ruleName);
  });
});

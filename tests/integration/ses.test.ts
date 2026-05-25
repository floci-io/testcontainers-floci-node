import {
  SESClient,
  VerifyEmailIdentityCommand,
  ListIdentitiesCommand,
} from '@aws-sdk/client-ses';
import { FlociContainer, StartedFlociContainer } from '../../src';

describe('SES (integration)', () => {
  let floci: StartedFlociContainer;
  let ses: SESClient;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
    ses = new SESClient({
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

  it('verifies an email identity and lists it', async () => {
    const email = `test-${Date.now()}@example.com`;
    await ses.send(new VerifyEmailIdentityCommand({ EmailAddress: email }));

    const { Identities } = await ses.send(new ListIdentitiesCommand({}));
    expect(Identities).toContain(email);
  });
});

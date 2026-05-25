import {
  ACMClient,
  RequestCertificateCommand,
  ListCertificatesCommand,
} from '@aws-sdk/client-acm';
import { FlociContainer, StartedFlociContainer } from '../../src';

describe('ACM (integration)', () => {
  let floci: StartedFlociContainer;
  let acm: ACMClient;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
    acm = new ACMClient({
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

  it('requests and lists a certificate', async () => {
    const domainName = `test-${Date.now()}.example.com`;
    const { CertificateArn } = await acm.send(
      new RequestCertificateCommand({ DomainName: domainName }),
    );
    expect(CertificateArn).toBeDefined();

    const { CertificateSummaryList } = await acm.send(
      new ListCertificatesCommand({}),
    );
    const arns = (CertificateSummaryList ?? []).map((c) => c.CertificateArn);
    expect(arns).toContain(CertificateArn);
  });
});

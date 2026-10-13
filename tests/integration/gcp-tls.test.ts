import { FlociGcpContainer, StartedFlociGcpContainer, gcp } from '../../src';
import { httpsGetOnce } from './https';
import { GCP_TEST_IMAGE } from './images';

describe('Floci GCP with TLS (integration)', () => {
  let floci: StartedFlociGcpContainer;
  let firstRequest: Promise<number>;

  beforeAll(async () => {
    floci = await new FlociGcpContainer(GCP_TEST_IMAGE).withTlsConfig(new gcp.TlsConfig(true)).start();
    // The emulator accepts connections before its HTTPS backend listens; start() must have waited
    // for it, so the very first HTTPS request, sent at once and never retried, has to succeed.
    firstRequest = httpsGetOnce(`${floci.getHttpsEndpoint()}/_floci-gcp/health`);
    firstRequest.catch(() => undefined);
  });

  afterAll(async () => {
    if (floci) {
      await floci.stop();
    }
  });

  it('serves HTTPS as soon as start() returns', async () => {
    expect(await firstRequest).toBe(200);
  });

  it('serves HTTPS with the certificate it hands out, and still plain HTTP', async () => {
    const certificate = await floci.getTlsCertificate();
    expect(certificate).toContain('-----BEGIN CERTIFICATE-----');
    expect(await httpsGetOnce(`${floci.getHttpsEndpoint()}/_floci-gcp/health`, certificate)).toBe(200);
    expect((await fetch(`${floci.getEndpoint()}/_floci-gcp/health`)).status).toBe(200);
  });
});

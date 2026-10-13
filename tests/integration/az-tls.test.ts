import { FlociAzContainer, StartedFlociAzContainer, az } from '../../src';
import { httpsGetOnce } from './https';
import { AZ_TEST_IMAGE } from './images';

describe('Floci Azure with TLS (integration)', () => {
  let floci: StartedFlociAzContainer;
  let firstRequest: Promise<number>;

  beforeAll(async () => {
    floci = await new FlociAzContainer(AZ_TEST_IMAGE).withTlsConfig(new az.TlsConfig(true)).start();
    // The emulator accepts connections before its HTTPS backend listens; start() must have waited
    // for it, so the very first HTTPS request, sent at once and never retried, has to succeed.
    firstRequest = httpsGetOnce(`${floci.getHttpsEndpoint()}/_floci/health`);
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
    expect(await httpsGetOnce(`${floci.getHttpsEndpoint()}/_floci/health`, certificate)).toBe(200);
    expect((await fetch(`${floci.getEndpoint()}/_floci/health`)).status).toBe(200);
  });
});

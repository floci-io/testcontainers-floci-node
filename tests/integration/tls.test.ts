import { FlociContainer, StartedFlociContainer, TlsConfig } from '../../src';
import { httpsGetOnce } from './https';
import { TEST_IMAGE } from './images';

jest.setTimeout(120_000);

describe('TLS secure endpoint (integration)', () => {
  let floci: StartedFlociContainer;
  let firstRequest: Promise<number>;

  beforeAll(async () => {
    floci = await new FlociContainer(TEST_IMAGE)
      .withTlsConfig(new TlsConfig(true))
      .start();
    // The emulator accepts connections before its HTTPS backend listens; start() must have waited
    // for it, so the very first HTTPS request, sent at once and never retried, has to succeed.
    firstRequest = httpsGetOnce(`${floci.getSecureEndpoint()}/_floci/health`);
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

  it('getSecureEndpoint() returns an https URL', () => {
    const endpoint = floci.getSecureEndpoint();
    expect(endpoint).toMatch(/^https:\/\//);
  });

  it('getSecureEndpoint() returns a valid https://{host}:{port} format', () => {
    const endpoint = floci.getSecureEndpoint();
    const url = new URL(endpoint);
    expect(url.protocol).toBe('https:');
    expect(url.hostname).toBeTruthy();
    expect(url.port).toBeTruthy();
    expect(Number(url.port)).toBeGreaterThan(0);
  });
});

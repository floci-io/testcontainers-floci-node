import { FlociContainer, StartedFlociContainer, TlsConfig } from '../../src';

jest.setTimeout(120_000);

describe('TLS secure endpoint (integration)', () => {
  let floci: StartedFlociContainer;

  beforeAll(async () => {
    floci = await new FlociContainer()
      .withTlsConfig(new TlsConfig(true))
      .start();
  });

  afterAll(async () => {
    if (floci) {
      await floci.stop();
    }
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

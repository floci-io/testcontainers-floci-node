import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { AWS, AZ, FlociAzContainer, FlociContainer, TlsConfig, az, tlsEnabled, tlsEnabledEnv } from '../../src';

/** The parts of testcontainers' HTTP wait strategy that say what it probes. */
interface HttpProbe {
  protocol: string;
  path: string;
  port: number;
  _allowInsecure: boolean;
  startupTimeout: number;
  waitStrategies?: HttpProbe[];
}

/** The probes of the wait strategy `container` starts with: one, or the members of a composite. */
async function probesAtStart(container: { start(): Promise<unknown> }): Promise<HttpProbe[]> {
  const wait = jest.spyOn(GenericContainer.prototype, 'withWaitStrategy');
  jest.spyOn(GenericContainer.prototype, 'start').mockResolvedValue({} as StartedTestContainer);
  wait.mockClear();
  await container.start();
  const strategy = wait.mock.calls[0][0] as unknown as HttpProbe;
  return strategy.waitStrategies ?? [strategy];
}

const summary = (probes: HttpProbe[]) =>
  probes.map((p) => ({ protocol: p.protocol, path: p.path, port: p.port, insecure: p._allowInsecure, timeout: p.startupTimeout }));

describe('readiness wait', () => {
  afterEach(() => jest.restoreAllMocks());

  const http = (path: string, port: number) => ({ protocol: 'http', path, port, insecure: false, timeout: 120_000 });
  const https = (path: string, port: number) => ({ protocol: 'https', path, port, insecure: true, timeout: 120_000 });

  it('names the TLS switch from the descriptor prefix', () => {
    expect(tlsEnabledEnv(AWS)).toBe('FLOCI_TLS_ENABLED');
    expect(tlsEnabledEnv(AZ)).toBe('FLOCI_AZ_TLS_ENABLED');
    expect(tlsEnabled(AZ, {})).toBe(false);
    expect(tlsEnabled(AZ, { FLOCI_AZ_TLS_ENABLED: 'false' })).toBe(false);
    expect(tlsEnabled(AZ, { FLOCI_AZ_TLS_ENABLED: 'TRUE' })).toBe(true);
    expect(tlsEnabled(AZ, { FLOCI_TLS_ENABLED: 'true' })).toBe(false);
  });

  it('waits for plain HTTP health only while TLS is off', async () => {
    expect(summary(await probesAtStart(new FlociAzContainer()))).toEqual([http('/_floci/health', 4577)]);
    expect(summary(await probesAtStart(new FlociContainer()))).toEqual([http('/_floci/health', 4566)]);
  });

  it('also waits for HTTPS health, certificate unchecked, once TLS is enabled by config', async () => {
    expect(summary(await probesAtStart(new FlociAzContainer().withTlsConfig(new az.TlsConfig(true)))))
      .toEqual([http('/_floci/health', 4577), https('/_floci/health', 4577)]);
    expect(summary(await probesAtStart(new FlociContainer().withTlsConfig(new TlsConfig(true)))))
      .toEqual([http('/_floci/health', 4566), https('/_floci/health', 4566)]);
  });

  it('decides from the final environment, so a raw setting counts and the last one wins', async () => {
    expect(summary(await probesAtStart(new FlociAzContainer().withEnv('FLOCI_AZ_TLS_ENABLED', 'true'))))
      .toEqual([http('/_floci/health', 4577), https('/_floci/health', 4577)]);
    expect(summary(await probesAtStart(
      new FlociAzContainer().withTlsConfig(new az.TlsConfig(true)).withEnv('FLOCI_AZ_TLS_ENABLED', 'false'),
    ))).toEqual([http('/_floci/health', 4577)]);
  });
});

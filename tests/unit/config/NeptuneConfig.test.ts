import { NeptuneConfig } from '../../../src/config/services';
import type { FlociContainerTarget } from '../../../src/config/services';

class MockContainer implements FlociContainerTarget {
  readonly envVars: Record<string, string> = {};
  readonly exposedPorts: number[] = [];

  withEnv(key: string, value: string): this {
    this.envVars[key] = value;
    return this;
  }

  withExposedPort(port: number): this {
    this.exposedPorts.push(port);
    return this;
  }
}

describe('NeptuneConfig', () => {
  describe('applyEnvVarsTo with default parameters', () => {
    it('sets ENABLED to true', () => {
      const config = new NeptuneConfig();
      const mock = new MockContainer();

      config.applyEnvVarsTo(mock);

      expect(mock.envVars['FLOCI_SERVICES_NEPTUNE_ENABLED']).toBe('true');
    });

    it('sets PROXY_BASE_PORT to 8182', () => {
      const config = new NeptuneConfig();
      const mock = new MockContainer();

      config.applyEnvVarsTo(mock);

      expect(mock.envVars['FLOCI_SERVICES_NEPTUNE_PROXY_BASE_PORT']).toBe('8182');
    });

    it('sets PROXY_MAX_PORT to 8282 (8182 + 101 - 1)', () => {
      const config = new NeptuneConfig();
      const mock = new MockContainer();

      config.applyEnvVarsTo(mock);

      expect(mock.envVars['FLOCI_SERVICES_NEPTUNE_PROXY_MAX_PORT']).toBe('8282');
    });

    it('sets DEFAULT_IMAGE to tinkerpop/gremlin-server:3.7.3', () => {
      const config = new NeptuneConfig();
      const mock = new MockContainer();

      config.applyEnvVarsTo(mock);

      expect(mock.envVars['FLOCI_SERVICES_NEPTUNE_DEFAULT_IMAGE']).toBe('tinkerpop/gremlin-server:3.7.3');
    });

    it('does not set DOCKER_NETWORK when undefined', () => {
      const config = new NeptuneConfig();
      const mock = new MockContainer();

      config.applyEnvVarsTo(mock);

      expect(mock.envVars['FLOCI_SERVICES_NEPTUNE_DOCKER_NETWORK']).toBeUndefined();
    });
  });

  describe('applyEnvVarsTo with non-default parameters', () => {
    it('sets all env vars with custom values', () => {
      const config = new NeptuneConfig(true, 9000, 50, 'custom/image:1.0', 'my-network');
      const mock = new MockContainer();

      config.applyEnvVarsTo(mock);

      expect(mock.envVars['FLOCI_SERVICES_NEPTUNE_ENABLED']).toBe('true');
      expect(mock.envVars['FLOCI_SERVICES_NEPTUNE_PROXY_BASE_PORT']).toBe('9000');
      expect(mock.envVars['FLOCI_SERVICES_NEPTUNE_PROXY_MAX_PORT']).toBe('9049');
      expect(mock.envVars['FLOCI_SERVICES_NEPTUNE_DEFAULT_IMAGE']).toBe('custom/image:1.0');
      expect(mock.envVars['FLOCI_SERVICES_NEPTUNE_DOCKER_NETWORK']).toBe('my-network');
    });
  });

  describe('applyExposedPortsTo', () => {
    it('exposes 101 ports from 8182 to 8282 by default', () => {
      const config = new NeptuneConfig();
      const mock = new MockContainer();

      config.applyExposedPortsTo(mock);

      expect(mock.exposedPorts).toHaveLength(101);
      expect(mock.exposedPorts[0]).toBe(8182);
      expect(mock.exposedPorts[100]).toBe(8282);
    });

    it('exposes custom port range based on proxyBasePort and proxyPortCount', () => {
      const config = new NeptuneConfig(true, 9000, 10);
      const mock = new MockContainer();

      config.applyExposedPortsTo(mock);

      expect(mock.exposedPorts).toHaveLength(10);
      expect(mock.exposedPorts[0]).toBe(9000);
      expect(mock.exposedPorts[9]).toBe(9009);
    });

    it('does not expose any ports when disabled', () => {
      const config = new NeptuneConfig(false);
      const mock = new MockContainer();

      config.applyExposedPortsTo(mock);

      expect(mock.exposedPorts).toHaveLength(0);
    });
  });

  describe('disabled state', () => {
    it('only sets ENABLED env var when disabled', () => {
      const config = new NeptuneConfig(false);
      const mock = new MockContainer();

      config.applyEnvVarsTo(mock);

      expect(mock.envVars['FLOCI_SERVICES_NEPTUNE_ENABLED']).toBe('false');
      expect(mock.envVars['FLOCI_SERVICES_NEPTUNE_PROXY_BASE_PORT']).toBeUndefined();
      expect(mock.envVars['FLOCI_SERVICES_NEPTUNE_PROXY_MAX_PORT']).toBeUndefined();
      expect(mock.envVars['FLOCI_SERVICES_NEPTUNE_DEFAULT_IMAGE']).toBeUndefined();
      expect(mock.envVars['FLOCI_SERVICES_NEPTUNE_DOCKER_NETWORK']).toBeUndefined();
    });
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

const { init } = vi.hoisted(() => ({ init: vi.fn() }));

vi.mock('@sentry/astro', () => ({
  init,
  consoleLoggingIntegration: vi.fn(),
  browserTracingIntegration: vi.fn(),
  replayIntegration: vi.fn(),
  feedbackIntegration: vi.fn(),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.resetModules();
});

describe('Sentry environment tagging', () => {
  it.each([
    ['opensimgear.org', 'production'],
    ['www.opensimgear.org', 'production'],
    ['127.0.0.1', 'preview'],
    ['localhost', 'preview'],
    ['[::1]', 'preview'],
    ['192.168.1.10', 'preview'],
    ['opensimgear.github.io', 'preview'],
    ['preview.opensimgear.org', 'preview'],
    ['opensimgear.org.example.com', 'preview'],
  ])('tags a production build served on %s as %s', async (hostname, environment) => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubGlobal('window', { location: { hostname } });

    await import('../../../sentry.client.config.js');

    expect(init).toHaveBeenCalledOnce();
    expect(init).toHaveBeenCalledWith(expect.objectContaining({ environment }));
  });

  it('keeps telemetry disabled during development', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    await import('../../../sentry.client.config.js');

    expect(init).not.toHaveBeenCalled();
  });
});

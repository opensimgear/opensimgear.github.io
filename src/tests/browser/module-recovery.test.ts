import { describe, expect, it, vi } from 'vitest';
import { installModuleRecovery, installCalculatorRetry } from '~/utils/browser/module-recovery';

function setup(storage = new Map<string, string>(), storageMode = 'normal', inline = false) {
  const listeners = new Map<string, (event: any) => void>();
  const reload = vi.fn();
  const location = {
    href: 'https://www.opensimgear.org/calculators/actuator-sizing/?stroke=150#calculator',
    origin: 'https://www.opensimgear.org',
    reload,
  };
  const browser = {
    location,
    get sessionStorage() {
      if (storageMode === 'blocked') throw new Error('SecurityError');
      return {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          if (storageMode === 'full') throw new Error('QuotaExceededError');
          if (storageMode !== 'ignored') storage.set(key, value);
        },
      };
    },
    addEventListener: (name: string, handler: (event: any) => void) => listeners.set(name, handler),
  };
  if (inline) {
    new Function('window', `(${installModuleRecovery.toString()})(window);`)(browser);
  } else {
    installModuleRecovery(browser as unknown as Window);
  }
  return { reload, location, emit: (name: string, event: unknown) => listeners.get(name)!(event) };
}

const asset = 'https://www.opensimgear.org/_astro/client.svelte.old.js';

describe('module load recovery', () => {
  it('runs as a standalone inline Head script before module imports', () => {
    const page = setup(undefined, 'normal', true);
    page.emit('unhandledrejection', { reason: `Failed to fetch dynamically imported module: ${asset}` });
    expect(page.reload).toHaveBeenCalledOnce();
  });

  it.each([
    `Failed to fetch dynamically imported module: ${asset}`,
    `error loading dynamically imported module: ${asset}`,
    `Importing a module script failed: ${asset}`,
    'Failed to fetch dynamically imported module: /_astro/ui-core.old.js',
  ])('reloads a failed local built module: %s', (message) => {
    const page = setup();
    page.emit('unhandledrejection', { reason: new TypeError(message) });
    expect(page.reload).toHaveBeenCalledOnce();
    expect(page.location.href).toBe('https://www.opensimgear.org/calculators/actuator-sizing/?stroke=150#calculator');
  });

  it('handles error events and string reasons without suppressing them', () => {
    const page = setup();
    const preventDefault = vi.fn();
    page.emit('error', { message: `Failed to fetch dynamically imported module: ${asset}`, preventDefault });
    expect(page.reload).toHaveBeenCalledOnce();
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('does not reload twice in one document or again after navigation', () => {
    const storage = new Map<string, string>();
    const page = setup(storage);
    const event = { reason: new Error(`Failed to fetch dynamically imported module: ${asset}`) };
    page.emit('unhandledrejection', event);
    page.emit('error', { error: event.reason });
    expect(page.reload).toHaveBeenCalledOnce();
    const nextPage = setup(storage);
    nextPage.emit('unhandledrejection', event);
    expect(nextPage.reload).not.toHaveBeenCalled();
  });

  it.each(['blocked', 'full', 'ignored'])('avoids a reload loop when storage is %s', (mode) => {
    const page = setup(undefined, mode);
    page.emit('unhandledrejection', { reason: `Failed to fetch dynamically imported module: ${asset}` });
    expect(page.reload).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    null,
    1,
    { message: 1 },
    'Load failed',
    'Importing a module script failed.',
    `Unexpected error: ${asset}`,
    'Failed to fetch dynamically imported module: https://other.example/_astro/test.js',
    'Failed to fetch dynamically imported module: https://www.opensimgear.org/api/test.js',
    'Failed to fetch dynamically imported module: /_astro/test.css',
    'Failed to fetch dynamically imported module: http://[broken',
  ])('leaves unrelated or unidentifiable failures alone: %j', (reason) => {
    const page = setup();
    page.emit('unhandledrejection', { reason });
    expect(page.reload).not.toHaveBeenCalled();
  });
});

describe('calculator hydration retry', () => {
  function setupRetry({ hydrated = false, missing = '' } = {}) {
    const events = new Map<string, () => void>();
    const notice = { remove: vi.fn() };
    const island = {
      hasAttribute: () => !hydrated,
      addEventListener: (name: string, callback: () => void) => events.set(name, callback),
    };
    const container = {
      querySelector: (selector: string) => {
        if (selector === 'astro-island') return missing === 'island' ? null : island;
        return missing === 'notice' ? null : notice;
      },
    };
    installCalculatorRetry(container as unknown as HTMLElement);
    return { events, notice };
  }

  it('retains manual retry while loading and removes it when hydration succeeds', () => {
    const page = setupRetry();
    expect(page.notice.remove).not.toHaveBeenCalled();
    page.events.get('astro:hydrate')!();
    expect(page.notice.remove).toHaveBeenCalledOnce();
  });

  it('removes retry if hydration finished before initialization', () => {
    const page = setupRetry({ hydrated: true });
    expect(page.notice.remove).toHaveBeenCalledOnce();
    expect(page.events.size).toBe(0);
  });

  it.each(['island', 'notice'])('ignores incomplete markup with missing %s', (missing) => {
    const page = setupRetry({ missing });
    expect(page.notice.remove).not.toHaveBeenCalled();
    expect(page.events.size).toBe(0);
  });
});

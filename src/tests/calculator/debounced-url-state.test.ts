import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDebouncedUrlStateWriter } from '../../components/calculator/shared/debounced-url-state';

describe('createDebouncedUrlStateWriter', () => {
  let replaceState: ReturnType<typeof vi.fn>;
  let historyState: { source: string };

  beforeEach(() => {
    vi.useFakeTimers();
    replaceState = vi.fn();
    historyState = { source: 'existing-state' };
    vi.stubGlobal('window', {
      clearTimeout,
      history: {
        replaceState,
        state: historyState,
      },
      setTimeout,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('waits until debounce interval before writing url', () => {
    const writer = createDebouncedUrlStateWriter(300);

    writer.schedule('https://example.com/?state=one');

    vi.advanceTimersByTime(299);
    expect(replaceState).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(replaceState).toHaveBeenCalledWith(historyState, '', 'https://example.com/?state=one');
  });

  it('keeps only latest pending url during rapid updates', () => {
    const writer = createDebouncedUrlStateWriter(300);

    writer.schedule('https://example.com/?state=one');
    vi.advanceTimersByTime(150);
    writer.schedule('https://example.com/?state=two');

    vi.advanceTimersByTime(299);
    expect(replaceState).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenCalledWith(historyState, '', 'https://example.com/?state=two');
  });

  it('cancels pending write on cleanup', () => {
    const writer = createDebouncedUrlStateWriter(300);

    writer.schedule('https://example.com/?state=one');
    writer.cancel();
    vi.runAllTimers();

    expect(replaceState).not.toHaveBeenCalled();
  });

  it('does not throw when used without window', () => {
    vi.unstubAllGlobals();

    const writer = createDebouncedUrlStateWriter(300);

    expect(() => writer.schedule('https://example.com/?state=one')).not.toThrow();
    expect(() => writer.cancel()).not.toThrow();
  });

  it('schedules new write after prior debounce already flushed', () => {
    const writer = createDebouncedUrlStateWriter(300);

    writer.schedule('https://example.com/?state=one');
    vi.advanceTimersByTime(300);

    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenLastCalledWith(historyState, '', 'https://example.com/?state=one');

    writer.schedule('https://example.com/?state=two');
    vi.advanceTimersByTime(299);

    expect(replaceState).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);

    expect(replaceState).toHaveBeenCalledTimes(2);
    expect(replaceState).toHaveBeenLastCalledWith(historyState, '', 'https://example.com/?state=two');
  });

  it('preserves existing history state when writing url', () => {
    const writer = createDebouncedUrlStateWriter(300);

    writer.schedule('https://example.com/?state=one');
    vi.advanceTimersByTime(300);

    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenCalledWith(historyState, '', 'https://example.com/?state=one');
  });

  it('does not throw when history.replaceState is unusable', () => {
    vi.stubGlobal('window', {
      clearTimeout,
      history: {
        replaceState: null,
        state: historyState,
      },
      setTimeout,
    });

    const writer = createDebouncedUrlStateWriter(300);

    expect(() => writer.schedule('https://example.com/?state=one')).not.toThrow();
    expect(() => vi.runAllTimers()).not.toThrow();
    expect(() => writer.cancel()).not.toThrow();
  });
});

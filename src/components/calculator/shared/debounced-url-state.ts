export function createDebouncedUrlStateWriter(delayMs: number) {
  if (typeof window === 'undefined') {
    return {
      cancel() {},
      schedule(_url: string) {},
    };
  }

  const { history } = window;

  if (typeof history?.replaceState !== 'function') {
    return {
      cancel() {},
      schedule(_url: string) {},
    };
  }

  const setTimer: Window['setTimeout'] = window.setTimeout.bind(window);
  const clearTimer: Window['clearTimeout'] = window.clearTimeout.bind(window);

  let timeoutId: ReturnType<Window['setTimeout']> | null = null;
  let nextUrl = '';

  function cancel() {
    if (timeoutId !== null) {
      clearTimer(timeoutId);
      timeoutId = null;
    }
  }

  function schedule(url: string) {
    nextUrl = url;
    cancel();
    timeoutId = setTimer(() => {
      history.replaceState(history.state, '', nextUrl);
      timeoutId = null;
    }, delayMs);
  }

  return { schedule, cancel };
}

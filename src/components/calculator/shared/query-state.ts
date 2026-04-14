export function encodeQueryState(state: Record<string, unknown>) {
  return btoa(JSON.stringify(state));
}

export function decodeQueryState(encoded: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(encoded));
  } catch {
    return null;
  }
}

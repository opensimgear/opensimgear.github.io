const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(encoded: string) {
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(encoded, 'base64'));
  }

  return Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
}

function isQueryStateRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function encodeQueryState(state: Record<string, unknown>) {
  return bytesToBase64(utf8Encoder.encode(JSON.stringify(state)));
}

export function decodeQueryState(encoded: string): Record<string, unknown> | null {
  try {
    const decoded = JSON.parse(utf8Decoder.decode(base64ToBytes(encoded)));

    return isQueryStateRecord(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

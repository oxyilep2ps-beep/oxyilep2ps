const PREFIX = '{"oxyile":"handshake"';

export function buildHandshakeMessagePayload(handshakeId: string): string {
  return JSON.stringify({ oxyile: 'handshake', handshakeId });
}

export function parseHandshakeMessagePayload(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith(PREFIX) && !trimmed.includes('"oxyile":"handshake"')) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as { oxyile?: string; handshakeId?: string };
    if (parsed.oxyile === 'handshake' && parsed.handshakeId) {
      return parsed.handshakeId;
    }
  } catch {
    return null;
  }
  return null;
}

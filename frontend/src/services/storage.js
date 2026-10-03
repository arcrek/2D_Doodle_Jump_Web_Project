let guestId;

export function readLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getPlayerId() {
  if (guestId) return guestId;
  const saved = readLocal('doodle-player-id', '');
  guestId = typeof saved === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(saved)
    ? saved
    : crypto.randomUUID();
  writeLocal('doodle-player-id', guestId);
  return guestId;
}

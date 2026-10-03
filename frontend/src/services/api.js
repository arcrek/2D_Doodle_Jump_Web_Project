export async function getJson(path, { signal } = {}) {
  const response = await fetch(path, { signal });
  if (!response.ok) {
    let body;
    try { body = await response.json(); } catch { /* Có thể proxy trả văn bản khi Flask tắt. */ }
    throw new Error(body?.error?.message || `API trả HTTP ${response.status}. Kiểm tra terminal Flask.`);
  }
  return response.json();
}

export async function postJson(path, data) {
  const response = await fetch(path, {
    signal: AbortSignal.timeout(10000),
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  let body;
  try { body = await response.json(); } catch { throw new Error(`API trả HTTP ${response.status}.`); }
  if (!response.ok) throw new Error(body?.error?.message || `API trả HTTP ${response.status}.`);
  return body;
}

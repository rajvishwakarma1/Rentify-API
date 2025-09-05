const { logger } = require('./logger');

const APIFY_BASE = 'https://api.apify.com/v2';

function getToken() {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN not set');
  return token;
}

async function runActorSyncGetItems(actorId, input) {
  const token = getToken();
  const url = `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input || {}) });
  if (!res.ok) {
    const text = await res.text();
    logger.error('Apify run failed', { status: res.status, text });
    throw new Error(`Apify run failed: ${res.status}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  // Fallback: try parse NDJSON/CSV minimal
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

module.exports = { runActorSyncGetItems };

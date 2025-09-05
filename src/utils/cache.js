const { createClient } = require('redis');
const { logger } = require('./logger');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DEFAULT_TTL = Number(process.env.CACHE_TTL_DEFAULT || 300);

let client;
let connected = false;
let stats = { hits: 0, misses: 0, sets: 0, errors: 0 };

async function connect() {
  if (client && connected) return client;
  client = createClient({ url: REDIS_URL });
  client.on('error', (err) => { connected = false; stats.errors++; logger.warn('Redis error', { error: err.message }); });
  client.on('connect', () => logger.info('Redis connecting...'));
  client.on('reconnecting', () => logger.warn('Redis reconnecting...'));
  client.on('ready', () => { connected = true; logger.info('Redis ready'); });
  try { await client.connect(); } catch (e) { logger.warn('Redis connect failed; cache disabled', { error: e.message }); }
  return client;
}

function buildCacheKey(prefix, params = {}) {
  const norm = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${Array.isArray(v) ? v.join('|') : v}`)
    .join(';');
  return `${prefix}:${norm}`;
}

async function get(key) {
  try { if (!client || !connected) return null; const val = await client.get(key); if (val != null) stats.hits++; else stats.misses++; return val ? JSON.parse(val) : null; }
  catch (e) { stats.errors++; logger.warn('Redis get error', { error: e.message }); return null; }
}

async function set(key, value, ttl = DEFAULT_TTL) {
  try { if (!client || !connected) return false; await client.set(key, JSON.stringify(value), { EX: Number(ttl) }); stats.sets++; return true; }
  catch (e) { stats.errors++; logger.warn('Redis set error', { error: e.message }); return false; }
}

async function wrap(key, ttl, fn) {
  const cached = await get(key);
  if (cached != null) return cached;
  const result = await fn();
  await set(key, result, ttl);
  return result;
}

async function invalidatePattern(pattern) {
  try {
    if (!client || !connected) return 0;
    const iter = client.scanIterator({ MATCH: pattern, COUNT: 100 });
    let count = 0; const keys = [];
    for await (const key of iter) { keys.push(key); if (keys.length >= 1000) { count += await client.del(keys); keys.length = 0; } }
    if (keys.length) count += await client.del(keys);
    logger.info('Cache invalidated by pattern', { pattern, count });
    return count;
  } catch (e) { stats.errors++; logger.warn('Redis invalidate error', { error: e.message }); return 0; }
}

function getStats() { return { ...stats, connected }; }

module.exports = { connect, get, set, wrap, buildCacheKey, invalidatePattern, getStats };

const { logger } = require('./logger');

const THRESHOLD = Number(process.env.SLOW_QUERY_THRESHOLD_MS || 1000);
let enabled = String(process.env.ENABLE_QUERY_MONITORING || 'true').toLowerCase() === 'true';
const stats = {};

function wrapQuery(promise, operation) {
  if (!enabled) return promise;
  const start = Date.now();
  return promise.then((res) => {
    const dur = Date.now() - start;
    trackQueryStats(operation, dur, Array.isArray(res) ? res.length : (res ? 1 : 0));
    if (dur >= THRESHOLD) logger.warn('Slow query', { operation, durationMs: dur });
    return res;
  }).catch((err) => {
    const dur = Date.now() - start;
    logger.warn('Query error', { operation, durationMs: dur, error: err.message });
    throw err;
  });
}

function trackQueryStats(operation, duration, count) {
  stats[operation] = stats[operation] || { runs: 0, slow: 0, totalMs: 0, count: 0 };
  const s = stats[operation];
  s.runs++; s.totalMs += duration; s.count += count;
  if (duration >= THRESHOLD) s.slow++;
}

function getPerformanceReport() {
  const report = {};
  for (const [op, s] of Object.entries(stats)) {
    report[op] = { runs: s.runs, slow: s.slow, avgMs: s.runs ? Math.round(s.totalMs / s.runs) : 0, avgCount: s.runs ? Math.round(s.count / s.runs) : 0 };
  }
  return report;
}

function enableMonitoring() { enabled = true; }
function disableMonitoring() { enabled = false; }

module.exports = { wrapQuery, trackQueryStats, getPerformanceReport, enableMonitoring, disableMonitoring };

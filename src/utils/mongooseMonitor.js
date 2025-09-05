const { logger } = require('./logger');
const { trackQueryStats } = require('./queryMonitor');

let patched = false;

function initMongooseMonitor(mongoose) {
  if (patched) return; // idempotent
  patched = true;
  const THRESHOLD = Number(process.env.SLOW_QUERY_THRESHOLD_MS || 1000);

  const Query = mongoose.Query;
  const Aggregate = mongoose.Aggregate;

  if (Query && !Query.prototype.__rentifyPatched) {
    const originalExec = Query.prototype.exec;
    Query.prototype.exec = function monitoredExec(...args) {
      const modelName = this.model && this.model.modelName ? this.model.modelName : 'UnknownModel';
      const op = `${modelName}.${this.op || 'query'}`;
      const start = Date.now();
      return originalExec.apply(this, args).then((res) => {
        const dur = Date.now() - start;
        const count = Array.isArray(res) ? res.length : res ? 1 : 0;
        trackQueryStats(op, dur, count);
        if (dur >= THRESHOLD) {
          try {
            logger.warn('Slow Mongoose query', {
              operation: op,
              durationMs: dur,
              model: modelName,
              conditions: this.getQuery ? this.getQuery() : undefined,
              options: this.getOptions ? this.getOptions() : undefined,
            });
          } catch (_) { /* noop */ }
        }
        return res;
      }).catch((err) => {
        const dur = Date.now() - start;
        logger.warn('Mongoose query error', { operation: op, durationMs: dur, error: err.message });
        throw err;
      });
    };
    Query.prototype.__rentifyPatched = true;
  }

  if (Aggregate && !Aggregate.prototype.__rentifyPatched) {
    const originalExecA = Aggregate.prototype.exec;
    Aggregate.prototype.exec = function monitoredAggExec(...args) {
      const modelName = this._model && this._model.modelName ? this._model.modelName : 'UnknownModel';
      const op = `${modelName}.aggregate`;
      const stages = (() => { try { return this.pipeline ? this.pipeline().length : undefined; } catch { return undefined; } })();
      const start = Date.now();
      return originalExecA.apply(this, args).then((res) => {
        const dur = Date.now() - start;
        const count = Array.isArray(res) ? res.length : 0;
        trackQueryStats(op, dur, count);
        if (dur >= THRESHOLD) {
          logger.warn('Slow Mongoose aggregate', { operation: op, durationMs: dur, model: modelName, stages });
        }
        return res;
      }).catch((err) => {
        const dur = Date.now() - start;
        logger.warn('Mongoose aggregate error', { operation: op, durationMs: dur, error: err.message });
        throw err;
      });
    };
    Aggregate.prototype.__rentifyPatched = true;
  }
}

module.exports = { initMongooseMonitor };

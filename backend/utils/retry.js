'use strict';

/**
 * Retries an async operation with exponential backoff.
 *
 * @param {Function} fn Function returning a promise
 * @param {Object} options
 * @param {number} [options.retries=2] Max retry attempts
 * @param {number} [options.delayMs=500] Initial delay in ms
 * @param {number} [options.backoffFactor=2] Exponential backoff factor
 * @param {Function} [options.onRetry] Callback function(err, attempt, delayMs)
 */
async function withRetry(fn, options = {}) {
  const retries = options.retries ?? 2;
  const delayMs = options.delayMs ?? 500;
  const backoffFactor = options.backoffFactor ?? 2;
  const onRetry = options.onRetry;

  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt > retries) {
        throw err;
      }
      if (typeof onRetry === 'function') {
        onRetry(err, attempt, currentDelay);
      }
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= backoffFactor;
    }
  }
}

module.exports = { withRetry };

'use strict';

function formatMeta(meta) {
  if (!meta || Object.keys(meta).length === 0) return '';
  try {
    return ' ' + JSON.stringify(meta);
  } catch {
    return '';
  }
}

function createLogger(moduleName) {
  const prefix = `[${moduleName}]`;
  return {
    info(message, meta) {
      console.log(`${prefix} [INFO] ${message}${formatMeta(meta)}`);
    },
    warn(message, meta) {
      console.warn(`${prefix} [WARN] ${message}${formatMeta(meta)}`);
    },
    error(message, meta) {
      console.error(`${prefix} [ERROR] ${message}${formatMeta(meta)}`);
    },
    debug(message, meta) {
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
        console.log(`${prefix} [DEBUG] ${message}${formatMeta(meta)}`);
      }
    },
  };
}

module.exports = { createLogger };

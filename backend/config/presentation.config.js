'use strict';
/**
 * presentation.config.js
 * ───────────────────────
 * Central configuration for the AI Presentation Generator.
 * All tuneable constants live here — never scattered in service files.
 */

module.exports = {
  // ── Text Length Guards ─────────────────────────────────────────────────────
  MAX_TITLE_LEN:     80,
  MAX_SUBTITLE_LEN:  120,
  MAX_HEADLINE_LEN:  150,
  MAX_BULLET_LEN:    120,
  MAX_BULLETS:       7,
  MAX_CARDS:         6,
  MAX_TABLE_COLS:    10,
  MAX_TABLE_ROWS:    14,   // per slide; larger tables auto-split

  // ── Pipeline Limits ────────────────────────────────────────────────────────
  MAX_RAW_TEXT_CHARS:  28_000,   // truncate before sending to LLM
  MAX_SLIDES:          35,
  MIN_SLIDES:          10,
  DEFAULT_SLIDES:      18,

  // ── Cache ──────────────────────────────────────────────────────────────────
  INTELLIGENCE_CACHE_TTL_MS: 30 * 60 * 1000,  // 30 minutes

  // ── Supported MIME types ───────────────────────────────────────────────────
  SUPPORTED_MIMES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/tiff',
  ],

  // ── LLM Model Priority ─────────────────────────────────────────────────────
  // Primary: Claude Sonnet (fast + smart), Fallback: Gemini
  LLM_PRIMARY:   'claude-sonnet-4-6',
  LLM_MAX_TOKENS: 4096,

  // ── File Size Limits ───────────────────────────────────────────────────────
  MAX_FILE_SIZE_MB: 25,
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024,

  // ── Presentation TTL (MongoDB auto-delete) ─────────────────────────────────
  PRESENTATION_TTL_DAYS: 7,
};

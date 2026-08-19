'use strict';
/**
 * validatePresentationRequest.js
 * ────────────────────────────────
 * Middleware that validates the incoming /api/presentation/generate request
 * BEFORE it hits the controller.
 *
 * Checks:
 *  1. File is present
 *  2. File mime-type is in the allowed list
 *  3. File size is within limits
 *  4. Required body fields are present and safe
 */

const cfg = require('../config/presentation.config');

function validatePresentationRequest(req, res, next) {
  // File presence
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded. Please attach a document.',
    });
  }

  // MIME type check
  const mime = req.file.mimetype || '';
  if (!cfg.SUPPORTED_MIMES.includes(mime)) {
    return res.status(415).json({
      success: false,
      message: `Unsupported file type: ${mime}. Supported: PDF, DOCX, XLSX, CSV, TXT, PNG, JPG.`,
    });
  }

  // File size check
  if (req.file.size > cfg.MAX_FILE_SIZE_BYTES) {
    return res.status(413).json({
      success: false,
      message: `File too large. Maximum allowed size is ${cfg.MAX_FILE_SIZE_MB} MB.`,
    });
  }

  // Sanitize body fields (prevent injection in LLM prompts)
  const SAFE_MAX = 200;
  const sanitize = (val, fallback = '') =>
    typeof val === 'string' ? val.replace(/[<>{}$]/g, '').slice(0, SAFE_MAX) : fallback;

  req.body.purpose     = sanitize(req.body.purpose,   'executive briefing');
  req.body.audience    = sanitize(req.body.audience,  'senior management');
  req.body.language    = sanitize(req.body.language,  'English');
  req.body.theme       = sanitize(req.body.theme,     'sharyx');

  // slideCount must be a number or empty
  if (req.body.slideCount) {
    const n = parseInt(req.body.slideCount, 10);
    req.body.slideCount = isNaN(n) ? '' : String(Math.min(Math.max(n, cfg.MIN_SLIDES), cfg.MAX_SLIDES));
  }

  // focusAreas must be valid JSON array (or omit)
  if (req.body.focusAreas) {
    try {
      const arr = JSON.parse(req.body.focusAreas);
      if (!Array.isArray(arr)) throw new Error();
      req.body.focusAreas = JSON.stringify(arr.slice(0, 5).map(a => sanitize(a)));
    } catch {
      req.body.focusAreas = '[]';
    }
  }

  next();
}

module.exports = validatePresentationRequest;

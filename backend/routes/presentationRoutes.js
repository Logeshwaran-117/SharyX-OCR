'use strict';
/**
 * presentationRoutes.js
 * ──────────────────────
 * All routes for the AI Presentation Generator module.
 */

const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { requireAuth, requireAdmin } = require('../middleware/adminAuth');
const {
  analyzeDocument,
  planDocument,
  refinePlan,
  generatePresentation,
  getPresentationHistory,
  downloadPresentation,
  deletePresentation,
  getCacheStatistics,
  clearCache,
} = require('../controllers/presentationController');

// ── POST /api/presentation/analyze
// Upload a document → return extracted content for preview / selection
router.post(
  '/analyze',
  requireAuth,
  upload.single('file'),
  analyzeDocument
);

// ── POST /api/presentation/plan
// Build slide-by-slide blueprint for user review (no PPTX yet)
router.post(
  '/plan',
  requireAuth,
  upload.single('file'),
  planDocument
);

// ── POST /api/presentation/refine-plan
// Natural-language edit of an existing blueprint
router.post(
  '/refine-plan',
  requireAuth,
  refinePlan
);

// ── POST /api/presentation/generate
// Upload a document and receive a generated PPTX
// Optional: contentSelection, customBlueprint (JSON)
router.post(
  '/generate',
  requireAuth,
  upload.single('file'),
  generatePresentation
);

// ── GET /api/presentation/history
// Get current user's presentation history (paginated)
router.get('/history', requireAuth, getPresentationHistory);

// ── GET /api/presentation/:id
// Download a previously generated presentation
router.get('/:id/download', requireAuth, downloadPresentation);

// ── DELETE /api/presentation/:id
// Delete a saved presentation
router.delete('/:id', requireAuth, deletePresentation);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get('/admin/cache', requireAuth, requireAdmin, getCacheStatistics);
router.delete('/admin/cache', requireAuth, requireAdmin, clearCache);

module.exports = router;

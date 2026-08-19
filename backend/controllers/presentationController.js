'use strict';
/**
 * presentationController.js
 * ──────────────────────────
 * HTTP controller for the AI Presentation Generator.
 *
 * Routes handled:
 *   POST /api/presentation/analyze     → Upload document → return content preview
 *   POST /api/presentation/generate    → Upload document → return PPTX
 *   GET  /api/presentation/history     → User's presentation history
 *   GET  /api/presentation/:id         → Download a saved presentation
 *   DELETE /api/presentation/:id       → Delete a saved presentation
 *   GET  /api/presentation/cache/stats → Admin: cache statistics
 *   DELETE /api/presentation/cache     → Admin: clear cache
 */

const {
  runPresentationPipeline,
  analyzeDocumentOnly,
  clearIntelligenceCache,
  getCacheStats,
} = require('../services/presentation/presentationPipeline');
const { emitProgress } = require('../routes/progressRoutes');
const { incrementUsage } = require('../middleware/planLimit');
const Presentation = require('../models/Presentation');

// ── Analyze Document (preview / content selection) ────────────────────────────
async function analyzeDocument(req, res) {
  const jobId = req.body?.jobId || null;

  try {
    if (!req.user) {
      emitProgress(jobId, 'error', 0, 'Not authenticated.');
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    if (!req.file) {
      emitProgress(jobId, 'error', 0, 'No file uploaded.');
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    emitProgress(jobId, 'starting', 5, 'Analyzing document for content preview…');

    const preview = await analyzeDocumentOnly(req.file, { jobId });

    return res.json({
      success: true,
      intelligence: preview,
    });
  } catch (err) {
    console.error('[PresentationController] Analyze error:', err);
    emitProgress(jobId, 'error', 0, `Analysis failed: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: err.message || 'Document analysis failed. Please try again.',
    });
  }
}

// ── Generate Presentation ─────────────────────────────────────────────────────
async function generatePresentation(req, res) {
  const jobId = req.body?.jobId || null;

  try {
    // Auth check
    if (!req.user) {
      emitProgress(jobId, 'error', 0, 'Not authenticated.');
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    // File check
    if (!req.file) {
      emitProgress(jobId, 'error', 0, 'No file uploaded.');
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    // Parse optional content selection from the preview UI
    let contentSelection = null;
    if (req.body.contentSelection) {
      try {
        contentSelection =
          typeof req.body.contentSelection === 'string'
            ? JSON.parse(req.body.contentSelection)
            : req.body.contentSelection;
      } catch {
        contentSelection = null;
      }
    }

    // Parse user options from request body
    let customBlueprint = null;
    if (req.body.customBlueprint) {
      try {
        customBlueprint =
          typeof req.body.customBlueprint === 'string'
            ? JSON.parse(req.body.customBlueprint)
            : req.body.customBlueprint;
        if (!Array.isArray(customBlueprint)) customBlueprint = null;
      } catch {
        customBlueprint = null;
      }
    }

    const options = {
      jobId,
      purpose: req.body.purpose || 'executive briefing',
      audience: req.body.audience || 'senior management',
      slideCountHint: req.body.slideCount ? parseInt(req.body.slideCount, 10) : null,
      language: req.body.language || 'English',
      focusAreas: req.body.focusAreas
        ? typeof req.body.focusAreas === 'string'
          ? JSON.parse(req.body.focusAreas)
          : req.body.focusAreas
        : [],
      theme: req.body.theme || 'sharyx',
      watermarkText: (req.body.watermarkText || '').toString().slice(0, 80),
      watermarkImage: req.body.watermarkImage || null,
      contentSelection,
      customBlueprint,
    };

    emitProgress(jobId, 'starting', 5, 'AI Presentation Engine activated…');

    // ── Run Pipeline ────────────────────────────────────────────────────────
    const result = await runPresentationPipeline(req.file, options);

    // ── Track Usage ─────────────────────────────────────────────────────────
    try {
      await incrementUsage(req.user._id || req.user.id, 'presentation');
    } catch {}

    // ── Save to History ─────────────────────────────────────────────────────
    let savedRecord = null;
    try {
      savedRecord = await Presentation.create({
        userId: req.user._id || req.user.id,
        filename: req.file.originalname,
        title: result.intelligence.title || req.file.originalname,
        documentType: result.intelligence.documentType,
        slideCount: result.slideCount,
        options: {
          purpose: options.purpose,
          audience: options.audience,
          language: options.language,
          theme: options.theme,
        },
        intelligence: result.intelligence,
        blueprint: result.blueprint,
        fileBuffer: result.buffer,
        createdAt: new Date(),
      });
    } catch (histErr) {
      console.warn('[PresentationController] Failed to save history:', histErr.message);
    }

    emitProgress(jobId, 'complete', 100, `Presentation ready — ${result.slideCount} slides`);

    // ── Stream PPTX to client ───────────────────────────────────────────────
    const safeName = (result.intelligence.title || req.file.originalname || 'presentation')
      .replace(/[^a-z0-9_\-\s]/gi, '')
      .replace(/\s+/g, '_')
      .slice(0, 60);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pptx"`);
    res.setHeader('X-Slide-Count', String(result.slideCount));
    res.setHeader('X-Document-Type', result.intelligence.documentType || 'document');
    res.setHeader('X-Presentation-Id', savedRecord?._id?.toString() || '');

    return res.end(result.buffer);
  } catch (err) {
    console.error('[PresentationController] Error:', err);
    emitProgress(jobId, 'error', 0, `Generation failed: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: err.message || 'Presentation generation failed. Please try again.',
    });
  }
}

// ── Get Presentation History ──────────────────────────────────────────────────
async function getPresentationHistory(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false });

    const userId = req.user._id || req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

    const records = await Presentation.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-fileBuffer')
      .lean();

    const total = await Presentation.countDocuments({ userId });

    return res.json({
      success: true,
      presentations: records,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ── Download Saved Presentation ───────────────────────────────────────────────
async function downloadPresentation(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false });

    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    const record = await Presentation.findOne({ _id: id, userId });
    if (!record) return res.status(404).json({ success: false, message: 'Not found' });

    if (!record.fileBuffer) {
      return res
        .status(410)
        .json({ success: false, message: 'File no longer available. Please regenerate.' });
    }

    const safeName = (record.title || 'presentation')
      .replace(/[^a-z0-9_\-\s]/gi, '')
      .replace(/\s+/g, '_');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pptx"`);

    return res.end(record.fileBuffer);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ── Delete Presentation ───────────────────────────────────────────────────────
async function deletePresentation(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false });

    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    const result = await Presentation.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    return res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ── Admin: Cache Stats ────────────────────────────────────────────────────────
async function getCacheStatistics(req, res) {
  return res.json({ success: true, cache: getCacheStats() });
}

async function clearCache(req, res) {
  clearIntelligenceCache();
  return res.json({ success: true, message: 'Intelligence cache cleared' });
}


// ── Plan slides (blueprint preview, no PPTX) ─────────────────────────────────
async function planDocument(req, res) {
  const jobId = req.body?.jobId || null;
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    let contentSelection = null;
    if (req.body.contentSelection) {
      try {
        contentSelection =
          typeof req.body.contentSelection === 'string'
            ? JSON.parse(req.body.contentSelection)
            : req.body.contentSelection;
      } catch {
        contentSelection = null;
      }
    }

    const options = {
      jobId,
      purpose: req.body.purpose || 'executive briefing',
      audience: req.body.audience || 'senior management',
      slideCountHint: req.body.slideCount ? parseInt(req.body.slideCount, 10) : null,
      language: req.body.language || 'English',
      focusAreas: req.body.focusAreas
        ? typeof req.body.focusAreas === 'string'
          ? JSON.parse(req.body.focusAreas)
          : req.body.focusAreas
        : [],
      contentSelection,
    };

    const { planPresentationSlides } = require('../services/presentation/presentationPipeline');
    const result = await planPresentationSlides(req.file, options);

    return res.json({
      success: true,
      intelligence: result.intelligence,
      blueprint: result.blueprint,
      slideCount: result.slideCount,
    });
  } catch (err) {
    console.error('[PresentationController] Plan error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to plan slides.',
    });
  }
}

// ── Refine blueprint with natural-language instruction ───────────────────────
async function refinePlan(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    let blueprint = req.body.blueprint;
    if (typeof blueprint === 'string') {
      try { blueprint = JSON.parse(blueprint); } catch { blueprint = null; }
    }
    const instruction = (req.body.instruction || '').toString().trim();
    if (!Array.isArray(blueprint) || !blueprint.length) {
      return res.status(400).json({ success: false, message: 'blueprint array required' });
    }
    if (!instruction) {
      return res.status(400).json({ success: false, message: 'instruction required' });
    }

    let context = req.body.context || {};
    if (typeof context === 'string') {
      try { context = JSON.parse(context); } catch { context = {}; }
    }

    const { refineBlueprint } = require('../services/presentation/presentationPipeline');
    const updated = await refineBlueprint(blueprint, instruction, context);

    return res.json({
      success: true,
      blueprint: updated,
      slideCount: updated.length,
    });
  } catch (err) {
    console.error('[PresentationController] Refine error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to refine slide plan.',
    });
  }
}

module.exports = {
  analyzeDocument,
  planDocument,
  refinePlan,
  generatePresentation,
  getPresentationHistory,
  downloadPresentation,
  deletePresentation,
  getCacheStatistics,
  clearCache,
};


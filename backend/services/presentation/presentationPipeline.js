'use strict';
/**
 * presentationPipeline.js
 * ────────────────────────
 * The Master AI Presentation Pipeline Orchestrator.
 *
 * Executes all 10 stages in sequence:
 *   Stage 1-3  → Document Intelligence (parse → understand → JSON)
 *   Stage 4-6  → Presentation Strategy (strategy → outline → content)
 *   Stage 7-8  → Visual Planning + Layout Engine
 *   Stage 9    → Rendering Engine (PPTX generation)
 *   Stage 10   → Quality Validation
 *
 * Supports SSE progress emission for real-time frontend updates.
 * Supports analyze-only mode for content-preview selection UI.
 */

const { buildDocumentIntelligence, buildDocumentIntelligenceFromImage } = require('./documentIntelligence');
const { buildPresentationStrategy } = require('./presentationStrategy');
const { applyVisualPlanningAndLayout } = require('./visualPlanner');
const { validateBlueprint } = require('./qualityValidator');
const { applyTheme } = require('./designConstitution');
const { renderPresentation } = require('./renderEngine');
const { extractText, isEmptyContent } = require('../extractText');

// ── In-Memory Cache ───────────────────────────────────────────────────────────
const intelligenceCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCacheKey(filename, fileSize) {
  return `${filename}_${fileSize}`;
}

// ── Progress Emitter ──────────────────────────────────────────────────────────
function emit(jobId, status, progress, message) {
  try {
    const { emitProgress } = require('../../routes/progressRoutes');
    emitProgress(jobId, status, progress, message);
  } catch {
    console.log(`[Pipeline] [${progress}%] ${message}`);
  }
}

// ── Content selection filter ──────────────────────────────────────────────────
/**
 * Filter DocumentIntelligence based on user contentSelection from the preview UI.
 * Indices are 0-based. Missing / null arrays mean "keep all".
 */
function applyContentSelection(intelligence, contentSelection) {
  if (!contentSelection || typeof contentSelection !== 'object') {
    return intelligence;
  }

  const filtered = { ...intelligence };
  const chartOverrides = contentSelection.chartOverrides || {};
  const tableOverrides = contentSelection.tableOverrides || {};
  const preferredTypes = Array.isArray(contentSelection.preferredChartTypes)
    ? contentSelection.preferredChartTypes.map((t) => String(t).toLowerCase())
    : null;

  if (contentSelection.includeExecutiveSummary === false) {
    filtered.executiveSummary = '';
  }

  if (Array.isArray(contentSelection.selectedKpiIndices)) {
    const set = new Set(contentSelection.selectedKpiIndices.map(Number));
    filtered.kpis = (intelligence.kpis || []).filter((_, i) => set.has(i));
  }

  if (Array.isArray(contentSelection.selectedFindingIndices)) {
    const set = new Set(contentSelection.selectedFindingIndices.map(Number));
    filtered.keyFindings = (intelligence.keyFindings || []).filter((_, i) => set.has(i));
  }

  if (Array.isArray(contentSelection.selectedRecommendationIndices)) {
    const set = new Set(contentSelection.selectedRecommendationIndices.map(Number));
    filtered.recommendations = (intelligence.recommendations || []).filter((_, i) => set.has(i));
  }

  if (Array.isArray(contentSelection.selectedRiskIndices)) {
    const set = new Set(contentSelection.selectedRiskIndices.map(Number));
    filtered.risks = (intelligence.risks || []).filter((_, i) => set.has(i));
  }

  // Keep original section indices for override keys (sectionIdx-chartIdx)
  const originalSections = intelligence.sections || [];
  let selectedOriginalIndices = null;
  if (Array.isArray(contentSelection.selectedSectionIndices)) {
    selectedOriginalIndices = contentSelection.selectedSectionIndices.map(Number);
    filtered.sections = originalSections
      .map((sec, origIdx) => ({ sec, origIdx }))
      .filter(({ origIdx }) => selectedOriginalIndices.includes(origIdx));
  } else {
    filtered.sections = originalSections.map((sec, origIdx) => ({ sec, origIdx }));
  }

  filtered.sections = filtered.sections.map(({ sec, origIdx }) => {
    const next = { ...sec };

    // Tables: global off, or per-table overrides
    if (contentSelection.includeTables === false) {
      next.tables = [];
    } else if (Array.isArray(sec.tables)) {
      next.tables = sec.tables
        .map((t, ti) => {
          const key = `${origIdx}-${ti}`;
          const ov = tableOverrides[key];
          if (ov && ov.include === false) return null;
          return t;
        })
        .filter(Boolean);
    }

    // Charts: global off, per-chart include + type override, preferred type filter
    if (contentSelection.includeCharts === false) {
      next.charts = [];
    } else if (Array.isArray(sec.charts)) {
      next.charts = sec.charts
        .map((c, ci) => {
          const key = `${origIdx}-${ci}`;
          const ov = chartOverrides[key];
          if (ov && ov.include === false) return null;
          const chart = { ...c };
          if (ov && ov.chartType) {
            chart.chartType = ov.chartType;
          } else if (preferredTypes && preferredTypes.length && chart.chartType) {
            // If preferred list is set and current type not in it, remap to first preferred
            const cur = String(chart.chartType).toLowerCase();
            if (!preferredTypes.includes(cur)) {
              chart.chartType = preferredTypes[0];
            }
          }
          return chart;
        })
        .filter(Boolean);
    }

    return next;
  });

  // Attach generation preferences for strategy layer
  filtered._genPrefs = {
    chartDensity: contentSelection.chartDensity || 'balanced',
    preferredChartTypes: preferredTypes || [],
    includeProcessSlides: contentSelection.includeProcessSlides !== false,
    includeComparisonSlides: contentSelection.includeComparisonSlides !== false,
    includeKpiOverview: contentSelection.includeKpiOverview !== false,
    includeAgenda: contentSelection.includeAgenda !== false,
    includeSummarySlide: contentSelection.includeSummarySlide !== false,
    includeRecommendationsSlide: contentSelection.includeRecommendationsSlide !== false,
    narrativeStyle: contentSelection.narrativeStyle || 'executive',
    visualEmphasis: contentSelection.visualEmphasis || 'balanced', // data | narrative | balanced
  };

  return filtered;
}

// ── Shared: parse file + build / cache intelligence ───────────────────────────
async function resolveIntelligence(file, jobId = null, isPreviewOnly = true) {
  const meta = {
    filename: file.originalname || 'document',
    mimeType: file.mimetype || 'application/octet-stream',
    fileSize: file.size || 0,
  };

  const parseStart = isPreviewOnly ? 10 : 5;
  const parseEnd = isPreviewOnly ? 20 : 15;
  const analyzeStart = isPreviewOnly ? 25 : 20;
  const cacheStart = isPreviewOnly ? 35 : 30;
  const tickerStart = isPreviewOnly ? 25 : 20;
  const tickerEnd = isPreviewOnly ? 90 : 35;
  const analyzeEnd = isPreviewOnly ? 95 : 40;

  emit(jobId, 'parsing', parseStart, 'Parsing document…');

  let rawText = null;
  let isImageFile = false;
  let imageBase64 = null;
  let imageMimeType = null;

  const extracted = await extractText(file);

  if (isEmptyContent(extracted)) {
    throw new Error('The uploaded document appears to be empty or could not be read.');
  }

  if (extracted && extracted.isImage) {
    const fs = require('fs');
    const buf = file.buffer || fs.readFileSync(file.path);
    imageBase64 = buf.toString('base64');
    imageMimeType = meta.mimeType;
    isImageFile = true;
  } else if (typeof extracted === 'string') {
    rawText = extracted;
  } else if (extracted && extracted.rawText) {
    rawText = extracted.rawText;
  } else {
    rawText = JSON.stringify(extracted);
  }

  emit(jobId, 'parsing', parseEnd, 'Document content extracted successfully');
  emit(jobId, 'analyzing', analyzeStart, 'AI is understanding your document…');

  const cacheKey = getCacheKey(meta.filename, meta.fileSize);
  let intelligence = null;
  const cached = intelligenceCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    intelligence = cached.data;
    emit(jobId, 'analyzing', cacheStart, 'Using cached document analysis');
  } else {
    let stopTicker1 = null;
    try {
      const { startProgressTicker } = require('../../routes/progressRoutes');
      stopTicker1 = startProgressTicker(jobId, {
        from: tickerStart,
        to: tickerEnd,
        intervalMs: 1500,
        stage: 'analyzing',
        messages: [
          'Analyzing document sections and data points…',
          'Extracting key metrics, insights, and facts…',
          'Synthesizing presentation core structure…',
        ],
      });
    } catch (_) {}

    try {
      if (isImageFile) {
        intelligence = await buildDocumentIntelligenceFromImage(imageBase64, imageMimeType, meta);
      } else {
        intelligence = await buildDocumentIntelligence(rawText, meta);
      }
    } finally {
      if (stopTicker1) stopTicker1();
    }
    intelligenceCache.set(cacheKey, { data: intelligence, ts: Date.now() });
  }

  emit(
    jobId,
    'analyzing',
    analyzeEnd,
    `Document understood: ${intelligence.documentType || 'document'} — ${intelligence.sections?.length || 0} sections found`
  );

  return { intelligence, meta };
}

/**
 * Analyze-only path (Stages 1–3). Used by the content-preview UI so the user
 * can choose what to include before PPTX generation.
 */
async function analyzeDocumentOnly(file, options = {}) {
  const { jobId = null } = options;
  console.log(`[Pipeline] Analyze-only for: ${file.originalname || 'document'}`);

  const { intelligence, meta } = await resolveIntelligence(file, jobId, true);

  const preview = {
    title: intelligence.title || meta.filename,
    subtitle: intelligence.subtitle || '',
    documentType: intelligence.documentType || 'document',
    industry: intelligence.industry || '',
    domain: intelligence.domain || '',
    organization: intelligence.organization || '',
    period: intelligence.period || '',
    executiveSummary: intelligence.executiveSummary || '',
    keyFindings: Array.isArray(intelligence.keyFindings) ? intelligence.keyFindings : [],
    recommendations: Array.isArray(intelligence.recommendations) ? intelligence.recommendations : [],
    risks: Array.isArray(intelligence.risks) ? intelligence.risks : [],
    kpis: (intelligence.kpis || []).map((k) => ({
      label: k.label || '',
      value: k.value || '',
      unit: k.unit || '',
      trend: k.trend || null,
      context: k.context || '',
    })),
    sections: (intelligence.sections || []).map((s, idx) => ({
      index: idx,
      title: s.title || `Section ${idx + 1}`,
      summary: s.summary || '',
      insights: s.insights || [],
      tableCount: Array.isArray(s.tables) ? s.tables.length : 0,
      chartCount: Array.isArray(s.charts) ? s.charts.length : 0,
      tables: (s.tables || []).map((t) => ({
        title: t.title || 'Table',
        headers: t.headers || [],
        rowCount: Array.isArray(t.rows) ? t.rows.length : 0,
        summary: t.summary || '',
      })),
      charts: (s.charts || []).map((c) => ({
        title: c.title || 'Chart',
        chartType: c.chartType || 'bar',
        insight: c.insight || '',
      })),
    })),
    stats: {
      sectionCount: (intelligence.sections || []).length,
      kpiCount: (intelligence.kpis || []).length,
      findingCount: (intelligence.keyFindings || []).length,
      recommendationCount: (intelligence.recommendations || []).length,
      riskCount: (intelligence.risks || []).length,
      tableCount: (intelligence.sections || []).reduce((n, s) => n + (s.tables?.length || 0), 0),
      chartCount: (intelligence.sections || []).reduce((n, s) => n + (s.charts?.length || 0), 0),
    },
  };

  emit(jobId, 'complete', 100, 'Document analysis ready for preview');
  return preview;
}

// ── Main Pipeline ─────────────────────────────────────────────────────────────
/**
 * Run the complete AI Presentation Generation Pipeline.
 *
 * @param {object} file      - Multer file object (buffer or path)
 * @param {object} options   - User preferences + jobId + optional contentSelection
 */
async function runPresentationPipeline(file, options = {}) {
  const {
    jobId = null,
    purpose = 'executive briefing',
    audience = 'senior management',
    slideCountHint = null,
    language = 'English',
    focusAreas = [],
    theme = 'sharyx',
    watermarkText = '',
    watermarkImage = null,
    contentSelection = null,
    customBlueprint = null,
  } = options;

  console.log(`[Pipeline] Starting for: ${file.originalname || 'document'}`);

  const { intelligence: rawIntelligence, meta } = await resolveIntelligence(file, jobId, false);

  // Apply user content filters from the preview step (if any)
  const intelligence = applyContentSelection(rawIntelligence, contentSelection);
  emit(
    jobId,
    'analyzing',
    42,
    `Document understood: ${intelligence.documentType || 'document'} — ${intelligence.sections?.length || 0} sections selected`
  );

  // ── Stage 4-6: Presentation Strategy (or user-edited blueprint) ───────────
  let blueprint = null;

  if (Array.isArray(customBlueprint) && customBlueprint.length > 0) {
    emit(jobId, 'planning', 50, `Using your slide plan (${customBlueprint.length} slides)…`);
    // Pull real tables/charts from intelligence to flesh out empty client placeholders
    const allTables = [];
    const allCharts = [];
    (intelligence.sections || []).forEach((sec) => {
      (sec.tables || []).forEach((t) => allTables.push(t));
      (sec.charts || []).forEach((c) => allCharts.push(c));
    });
    let tCursor = 0;
    let cCursor = 0;

    blueprint = customBlueprint
      .filter((s) => s && s.included !== false)
      .map((s, i) => {
        const slide = {
          ...s,
          slideIndex: i + 1,
          included: undefined,
        };
        const type = String(slide.slideType || '').toLowerCase();
        // Attach real table data when client sent an empty table shell
        if ((type === 'table') && !(slide.table && slide.table.rows && slide.table.rows.length) && allTables[tCursor]) {
          slide.table = allTables[tCursor++];
        }
        if ((type === 'chart' || type === 'dualchart') && !(slide.chart && slide.chart.series && slide.chart.series.length) && allCharts[cCursor]) {
          slide.chart = allCharts[cCursor++];
        }
        // Guarantee bullets on content slides so validator keeps them
        if (!slide.bullets || !slide.bullets.length) {
          if (['cover', 'thankyou', 'thank_you', 'closing'].includes(type)) {
            slide.bullets = slide.bullets || [];
          } else if (slide.kpiCards && slide.kpiCards.length) {
            slide.bullets = slide.kpiCards.map(
              (k) => `${k.label}: ${k.value}${k.unit ? ' ' + k.unit : ''}`
            );
          } else if (slide.subtitle) {
            slide.bullets = [slide.subtitle, 'See source document for supporting detail.'];
          } else {
            slide.bullets = [
              slide.title || 'Content slide',
              'Drawn from selected source material.',
              'Figures appear in neighbouring table/chart slides where available.',
            ];
          }
        }
        return slide;
      });
    
    // Drop client placeholder slides ("New slide" / "Add your points here")
    blueprint = blueprint.filter((s) => {
      const title = String(s.title || '').trim();
      const bullets = (s.bullets || []).map(b => String(b || '').trim());
      if (/^new slide$/i.test(title) && bullets.every(b => !b || /add your points|edit me|custom content/i.test(b))) {
        return false;
      }
      if (bullets.length && bullets.every(b => /add your points here|edit me/i.test(b))) {
        return false;
      }
      return true;
    }).map((s, i) => ({ ...s, slideIndex: i + 1 }));

    emit(jobId, 'planning', 60, `${blueprint.length} slides from your plan`);
  } else {
    emit(jobId, 'planning', 45, 'Designing presentation structure…');

    let stopTicker2 = null;
    try {
      const { startProgressTicker } = require('../../routes/progressRoutes');
      stopTicker2 = startProgressTicker(jobId, {
        from: 45,
        to: 60,
        intervalMs: 1500,
        stage: 'planning',
        messages: [
          'Architecting slide deck outline…',
          'Crafting executive summaries and key stats…',
          'Generating slide layouts and content blocks…',
        ],
      });
    } catch (_) {}

    try {
      const genPrefs = intelligence._genPrefs || {};
      const extraFocus = [];
      if (genPrefs.preferredChartTypes?.length) {
        extraFocus.push(`preferred chart types: ${genPrefs.preferredChartTypes.join(', ')}`);
      }
      if (genPrefs.chartDensity) extraFocus.push(`chart density: ${genPrefs.chartDensity}`);
      if (genPrefs.narrativeStyle) extraFocus.push(`narrative style: ${genPrefs.narrativeStyle}`);
      if (genPrefs.visualEmphasis) extraFocus.push(`visual emphasis: ${genPrefs.visualEmphasis}`);
      if (genPrefs.includeProcessSlides === false) extraFocus.push('skip process/flow slides');
      if (genPrefs.includeComparisonSlides === false) extraFocus.push('skip comparison slides');
      if (genPrefs.includeKpiOverview === false) extraFocus.push('skip KPI overview slide');
      if (genPrefs.includeAgenda === false) extraFocus.push('skip agenda slide');

      blueprint = await buildPresentationStrategy(intelligence, {
        purpose,
        audience,
        slideCountHint,
        language,
        focusAreas: [...(focusAreas || []), ...extraFocus],
        genPrefs,
      });
    } finally {
      if (stopTicker2) stopTicker2();
    }

    emit(jobId, 'planning', 60, `${blueprint.length} slides planned`);
  }

  // ── Stage 10 (pre-render): Quality Validation ─────────────────────────────
  emit(jobId, 'validating', 62, 'Validating slide content…');
  blueprint = validateBlueprint(blueprint);
  emit(jobId, 'validating', 66, `${blueprint.length} slides validated`);

  // ── Stage 7-8: Visual Planning + Layout ──────────────────────────────────
  emit(jobId, 'layouting', 72, 'Applying visual design system…');
  try { applyTheme(theme || 'sharyx'); } catch (_) {}
  blueprint = applyVisualPlanningAndLayout(blueprint);
  emit(jobId, 'layouting', 78, 'Layout engine complete');

  // ── Stage 9: Rendering ────────────────────────────────────────────────────
  emit(jobId, 'rendering', 82, 'Rendering PowerPoint file…');
  const buffer = await renderPresentation(blueprint, {
    theme,
    watermarkText,
    watermarkImage,
    purpose,
    audience,
    language,
    department: intelligence.organization || intelligence.title || 'Programme Report',
    organization: intelligence.organization || intelligence.title || '',
    period: intelligence.period || intelligence.dateRange || '',
    presenter: options.presenter || '',
    designation: options.designation || '',
    filename: meta.filename || 'document',
  });
  emit(jobId, 'rendering', 95, 'Presentation rendered successfully');

  console.log(`[Pipeline] Complete. ${blueprint.length} slides, ${buffer.length} bytes`);

  return {
    buffer,
    slideCount: blueprint.length,
    intelligence: {
      title: intelligence.title,
      documentType: intelligence.documentType,
      industry: intelligence.industry,
      executiveSummary: intelligence.executiveSummary,
      kpiCount: intelligence.kpis?.length || 0,
      sectionCount: intelligence.sections?.length || 0,
    },
    blueprint: blueprint.map((s) => ({
      slideIndex: s.slideIndex,
      slideType: s.slideType,
      title: s.title,
    })),
  };
}

// ── Cache Management ──────────────────────────────────────────────────────────
function clearIntelligenceCache() {
  intelligenceCache.clear();
  console.log('[Pipeline] Intelligence cache cleared');
}

function getCacheStats() {
  return {
    size: intelligenceCache.size,
    keys: Array.from(intelligenceCache.keys()),
  };
}

/**
 * Plan slides only — returns full editable blueprint (no PPTX render).
 */
async function planPresentationSlides(file, options = {}) {
  const {
    jobId = null,
    purpose = 'executive briefing',
    audience = 'senior management',
    slideCountHint = null,
    language = 'English',
    focusAreas = [],
    contentSelection = null,
  } = options;

  const { intelligence: rawIntelligence } = await resolveIntelligence(file, jobId, false);
  const intelligence = applyContentSelection(rawIntelligence, contentSelection);
  emit(jobId, 'planning', 50, 'Building slide-by-slide plan…');

  const genPrefs = intelligence._genPrefs || {};
  const extraFocus = [];
  if (genPrefs.preferredChartTypes?.length) {
    extraFocus.push(`preferred chart types: ${genPrefs.preferredChartTypes.join(', ')}`);
  }
  if (genPrefs.chartDensity) extraFocus.push(`chart density: ${genPrefs.chartDensity}`);
  if (genPrefs.narrativeStyle) extraFocus.push(`narrative style: ${genPrefs.narrativeStyle}`);
  if (genPrefs.visualEmphasis) extraFocus.push(`visual emphasis: ${genPrefs.visualEmphasis}`);
  if (genPrefs.includeProcessSlides === false) extraFocus.push('skip process/flow slides');
  if (genPrefs.includeComparisonSlides === false) extraFocus.push('skip comparison slides');
  if (genPrefs.includeKpiOverview === false) extraFocus.push('skip KPI overview slide');
  if (genPrefs.includeAgenda === false) extraFocus.push('skip agenda slide');

  let blueprint = await buildPresentationStrategy(intelligence, {
    purpose,
    audience,
    slideCountHint,
    language,
    focusAreas: [...(focusAreas || []), ...extraFocus],
    genPrefs,
  });

  const { validateBlueprint } = require('./qualityValidator');
  blueprint = validateBlueprint(blueprint);

  // Attach included flag for UI
  blueprint = (blueprint || []).map((s, i) => ({
    ...s,
    slideIndex: s.slideIndex || i + 1,
    included: true,
  }));

  emit(jobId, 'planning', 100, `Plan ready: ${blueprint.length} slides`);

  return {
    intelligence: {
      title: intelligence.title,
      documentType: intelligence.documentType,
      organization: intelligence.organization,
      period: intelligence.period,
    },
    blueprint,
    slideCount: blueprint.length,
  };
}

/**
 * Refine an existing blueprint with a natural-language instruction.
 * Does not re-parse the document — works purely on the slide plan + instruction.
 */
async function refineBlueprint(blueprint, instruction, context = {}) {
  const { parseJSON } = require('../../utils/jsonParser');
  const { callWithRotation, GEMINI_MODEL } = require('../geminiService');

  const compact = (blueprint || []).map((s, i) => ({
    slideIndex: s.slideIndex || i + 1,
    included: s.included !== false,
    slideType: s.slideType,
    title: s.title,
    subtitle: s.subtitle || '',
    bullets: (s.bullets || []).slice(0, 8),
    insightHeadline: s.insightHeadline || '',
    kpiCards: (s.kpiCards || []).slice(0, 6).map((k) => ({
      label: k.label,
      value: k.value,
      unit: k.unit,
    })),
    hasChart: !!(s.chart || s.charts),
    hasTable: !!(s.table || s.tables),
  }));

  const system = `You are a presentation planning assistant.
The user has a slide blueprint and wants changes described in natural language.
Return ONLY a valid JSON array of slides (same schema). Rules:
- Preserve factual content; do not invent numbers not present in the existing plan.
- Honour include/exclude, reorder, rename, merge, split, add summary bullets when asked.
- Keep slideType one of: cover, agenda, kpi, chart, dualChart, table, insights, process, comparison, summary, recommendations, thankYou, cards, scorecard.
- Always end with recommendations (if present) then thankYou/cover-style close if present.
- Each slide needs: slideIndex, slideType, title, included (boolean). Optional: subtitle, bullets, insightHeadline, kpiCards.
- Return the FULL updated blueprint array, not a partial patch.`;

  const user = `Document context: ${JSON.stringify(context || {})}
Current blueprint (${compact.length} slides):
${JSON.stringify(compact, null, 2)}

User instruction:
${String(instruction || '').slice(0, 1500)}

Return the complete updated JSON array of slides now.`;

  const raw = await callWithRotation(
    () => [{ text: `${system}\n\n${user}` }],
    12000,
    GEMINI_MODEL,
    null,
    'presentation',
    'application/json'
  );

  let updated = parseJSON(raw, 'Refine blueprint', 'PresentationRefine');
  if (!Array.isArray(updated)) {
    if (Array.isArray(updated?.slides)) updated = updated.slides;
    else if (Array.isArray(updated?.blueprint)) updated = updated.blueprint;
    else throw new Error('AI did not return a slide array');
  }

  // Merge rich fields from original where possible (charts/tables stay unless removed)
  const byIndex = new Map();
  (blueprint || []).forEach((s, i) => {
    byIndex.set(s.slideIndex || i + 1, s);
    byIndex.set(String(s.title || '').toLowerCase(), s);
  });

  return updated.map((s, i) => {
    const prev =
      byIndex.get(s.slideIndex) ||
      byIndex.get(String(s.title || '').toLowerCase()) ||
      {};
    return {
      ...prev,
      ...s,
      slideIndex: i + 1,
      included: s.included !== false,
      // Keep heavy visual payloads from previous version when titles match
      chart: s.chart || prev.chart,
      charts: s.charts || prev.charts,
      table: s.table || prev.table,
      tables: s.tables || prev.tables,
      kpiCards: s.kpiCards || prev.kpiCards,
    };
  });
}

module.exports = {
  runPresentationPipeline,
  analyzeDocumentOnly,
  planPresentationSlides,
  refineBlueprint,
  applyContentSelection,
  clearIntelligenceCache,
  getCacheStats,
};


'use strict';
/**
 * qualityValidator.js
 * ────────────────────
 * STAGE 10 — Quality Validation Engine
 *
 * Validates the presentation blueprint BEFORE rendering to catch and fix:
 * - Text overflow (titles/bullets too long)
 * - Missing required elements
 * - Empty slides
 * - Chart data integrity
 * - Table overflow
 * - Inconsistent slide numbering
 *
 * Returns a cleaned, validated blueprint.
 */

const { DESIGN } = require('./designConstitution');

// ── Hardcoded limits (self-contained, no external config) ─────────────────────
const LIMITS = {
  MAX_TITLE_LEN: 68,
  MAX_SUBTITLE_LEN: 100,
  MAX_HEADLINE_LEN: 120,
  MAX_BULLETS: 10,
  MAX_BULLET_LEN: 130,
  MAX_CARDS: 6,
  MAX_TABLE_COLS: 8,
  MAX_TABLE_ROWS: 14,
  MAX_KPI_LABEL: 32,
  MAX_KPI_VALUE: 18,
  MAX_KPI_CONTEXT: 60,
};

// ── Text Length Guards ────────────────────────────────────────────────────────
function clamp(str, max) {
  if (!str) return '';
  const s = String(str).trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function validateSlideText(slide) {
  const fixed = { ...slide };

  fixed.title = clamp(slide.title, LIMITS.MAX_TITLE_LEN);
  fixed.subtitle = clamp(slide.subtitle, LIMITS.MAX_SUBTITLE_LEN);
  fixed.insightHeadline = clamp(slide.insightHeadline, LIMITS.MAX_HEADLINE_LEN);
  fixed.bodyText = clamp(slide.bodyText, 400);
  fixed.callout = clamp(slide.callout, 200);
  fixed.speakerNotes = clamp(slide.speakerNotes, 1000);

  // Clamp bullet lengths
  if (fixed.bullets && Array.isArray(fixed.bullets)) {
    fixed.bullets = fixed.bullets
      .filter(b => b && String(b).trim())
      .slice(0, LIMITS.MAX_BULLETS)
      .map(b => clamp(b, LIMITS.MAX_BULLET_LEN));
  }

  // Clamp KPI card values — short labels survive card rendering without ellipsis spam
  if (fixed.kpiCards && Array.isArray(fixed.kpiCards)) {
    fixed.kpiCards = fixed.kpiCards.slice(0, LIMITS.MAX_CARDS).map(card => ({
      ...card,
      label: clamp(card.label, LIMITS.MAX_KPI_LABEL),
      value: clamp(card.value, LIMITS.MAX_KPI_VALUE),
      unit: clamp(card.unit, 12),
      context: clamp(card.context, LIMITS.MAX_KPI_CONTEXT),
    }));
  }

  return fixed;
}

// ── Chart Integrity ───────────────────────────────────────────────────────────
function validateChart(chart) {
  if (!chart) return null;

  const series = (chart.series || []).map(s => ({
    name: String(s.name || 'Series'),
    values: (s.values || []).map(v => {
      const n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    }),
  }));

  // Must have at least 1 series with values
  if (!series.length || !series[0].values.length) return null;

  // Categories count must match values count (use first series as reference)
  const valCount = series[0].values.length;
  const categories = (chart.categories || []).slice(0, valCount);

  // Pad or trim all series to match categories count
  const normalizedSeries = series.map(s => ({
    name: s.name,
    values: s.values.slice(0, categories.length).concat(
      Array(Math.max(0, categories.length - s.values.length)).fill(0)
    ),
  }));

  // Normalize chartType
  let chartType = (chart.chartType || 'bar').toLowerCase();
  if (chartType === 'doughnut') chartType = 'donut';
  if (chartType === 'stacked') chartType = 'stackedBar';
  if (chartType === 'horizontal') chartType = 'horizontalBar';

  return {
    ...chart,
    chartType,
    categories,
    series: normalizedSeries,
  };
}

// ── Table Integrity ───────────────────────────────────────────────────────────
function validateTable(table) {
  if (!table || !table.headers || !table.headers.length) return null;

  // Strip PII / identity columns that must never appear on slides
  const DROP_COL = /^(name|patient|father|mother|address|mobile|phone|contact|dob|sex|gender|remark|comment)$|patient\s*name|date\s*of\s*birth|locality/i;
  const keepIdx = [];
  const rawHeaders = (table.headers || []).map((h) => String(h || '').trim());
  for (let i = 0; i < rawHeaders.length; i++) {
    if (DROP_COL.test(rawHeaders[i])) continue;
    keepIdx.push(i);
  }
  if (!keepIdx.length) return null;

  let headers = keepIdx.map((i) => rawHeaders[i]).slice(0, LIMITS.MAX_TABLE_COLS);
  const colCount = headers.length;

  // Prefer programme columns when register is very wide
  if (headers.length > 8) {
    const prefer = /epid|phc|uphc|hsc|sector|age|immun|mr\s*i|mr\s*ii|dropout|house|survey|expected|confirm|disease|condition|maturity|gestation|weight|block|date of report|adm/i;
    const preferred = [];
    const rest = [];
    headers.forEach((h, i) => {
      if (prefer.test(h)) preferred.push(i);
      else rest.push(i);
    });
    const ordered = preferred.concat(rest).slice(0, 8);
    headers = ordered.map((i) => headers[i]);
    // rebuild keepIdx alignment is complex — re-slice rows by preferred header names later
  }

  // Normalize rows
  let rows = (table.rows || [])
    .map((row) => {
      const arr = Array.isArray(row) ? row : Object.values(row);
      return keepIdx.slice(0, colCount).map((i) => String(arr[i] ?? '').trim());
    })
    .filter((row) => row.some((cell) => cell.trim() !== ''));

  // Cap rows: case registers can be 50+; show a representative sample only
  const maxRows = LIMITS.MAX_TABLE_ROWS;
  if (rows.length > maxRows) {
    rows = rows.slice(0, maxRows);
  }

  if (!rows.length) return null;

  // If title is a bare place name ("Vellore") and this looks like a case dump,
  // retitle to a meaningful surveillance label
  let title = table.title;
  if (/^(vellore|chennai|district|sheet\s*1|data)$/i.test(String(title || '').trim())) {
    title = 'Case register sample (key fields)';
  }

  return { ...table, title, headers, rows };
}

// ── Slide Type Validation ─────────────────────────────────────────────────────
function validateSlideType(slide) {
  const raw = String(slide.slideType || 'insights');
  const normalized = raw === 'thankYou' || raw === 'thank_you' ? 'thankyou' : raw;
  const valid = ['cover', 'agenda', 'section', 'kpi', 'chart', 'table',
                 'insights', 'comparison', 'timeline', 'recommendations', 'summary',
                 'dualChart', 'overview', 'process', 'framework', 'thankyou', 'closing',
                 'conclusion', 'scorecard', 'cards'];

  if (!valid.includes(normalized)) {
    return 'insights'; // safe default
  }
  return normalized;
}

function isSlideEmpty(slide) {
  const type = (slide.slideType || '').toLowerCase();
  if (['cover', 'section', 'agenda', 'thankyou', 'thank_you', 'closing', 'conclusion', 'recommendations', 'summary'].includes(type)) {
    return false;
  }

  const hasVisual =
    (slide.kpiCards && slide.kpiCards.length > 0) ||
    (slide.chart && slide.chart.series && slide.chart.series.length > 0) ||
    (slide.secondaryChart && slide.secondaryChart.series && slide.secondaryChart.series.length > 0) ||
    (slide.table && slide.table.rows && slide.table.rows.length > 0) ||
    (slide.processSteps && slide.processSteps.length > 0);

  const realBullets = (slide.bullets || []).filter((b) => {
    const s = String(b || '').trim();
    if (!s || s.length < 8) return false;
    // Treat generic placeholder bullets as non-content
    if (/refer to source|no additional metrics|content not available|figures should be validated|review related tables/i.test(s)) {
      return false;
    }
    return true;
  });

  const hasText =
    realBullets.length > 0 ||
    (slide.insightHeadline && String(slide.insightHeadline).trim().length > 12) ||
    (slide.bodyText && String(slide.bodyText).trim().length > 20);

  return !hasVisual && !hasText;
}

/** Fingerprint for near-duplicate content detection (bullets + insight + title stem). */
function contentFingerprint(slide) {
  const title = String(slide.title || '')
    .toLowerCase()
    .replace(/\s*\(cont\.?\)\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
  const bullets = (slide.bullets || [])
    .map((b) => String(b || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 50))
    .filter(Boolean)
    .sort()
    .join('|');
  const insight = String(slide.insightHeadline || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
  return `${title}::${insight}::${bullets}`;
}

/** Fingerprint chart data so identical charts are not repeated across slides. */
function chartFingerprint(chart) {
  if (!chart || !chart.series || !chart.series.length) return null;
  const cats = (chart.categories || []).map(String).join(',');
  const series = chart.series
    .map((s) => `${s.name || ''}:${(s.values || []).map((v) => Number(v) || 0).join(',')}`)
    .join(';');
  return `${cats}|${series}`.toLowerCase();
}

function contentScore(slide) {
  let score = 0;
  if (slide.table && slide.table.rows && slide.table.rows.length) score += 8 + Math.min(slide.table.rows.length, 10);
  if (slide.chart && slide.chart.series && slide.chart.series.length) score += 8;
  if (slide.secondaryChart && slide.secondaryChart.series && slide.secondaryChart.series.length) score += 5;
  if (slide.kpiCards && slide.kpiCards.length) score += 4 + slide.kpiCards.length;
  if (slide.processSteps && slide.processSteps.length) score += 3;
  score += (slide.bullets || []).length;
  if (slide.insightHeadline) score += 1;
  return score;
}

// ── Main Validator ────────────────────────────────────────────────────────────
/**
 * Validate and auto-fix a presentation blueprint.
 * @param {Array} blueprint
 * @returns {Array} cleaned blueprint
 */
function validateBlueprint(blueprint) {
  if (!Array.isArray(blueprint) || !blueprint.length) {
    throw new Error('Blueprint is empty or invalid');
  }

  const results = [];
  const warnings = [];

  blueprint.forEach((slide, i) => {
    let fixed = { ...slide };

    fixed.slideIndex = i + 1;
    fixed.slideType = validateSlideType(fixed);
    fixed = validateSlideText(fixed);
    // Humanize Excel sheet-style titles
    if (fixed.title) {
      let t = String(fixed.title);
      t = t.replace(/\b\d{1,2}\s*[-–]\s*\d{1,2}\b/g, '').replace(/\s{2,}/g, ' ').trim();
      t = t.replace(/^block\s*wise\s*[-–:]?\s*/i, 'Block-wise ');
      if (/^block-wise\s*$/i.test(t) || /^block wise$/i.test(t)) t = 'Condition-wise performance';
      if (/block.?wise/i.test(t) && /expected vs confirm/i.test(t)) t = 'Expected vs confirmed cases';
      if (/block.?wise/i.test(t) && /medical vs surg/i.test(t)) t = 'Medical vs surgical management';
      if (/block.?wise/i.test(t) && /expected cases$/i.test(t)) t = 'Expected cases by condition';
      if (/^block-wise/i.test(t) && t.length < 25) t = 'RBSK condition-wise overview';
      fixed.title = t.slice(0, 68);
    }
    // Strip generic / placeholder insight headlines
    if (fixed.insightHeadline && /key analytical finding|priority focus area|no additional metrics/i.test(String(fixed.insightHeadline))) {
      fixed.insightHeadline = null;
    }
    // Strip filler bullets early
    if (Array.isArray(fixed.bullets)) {
      fixed.bullets = fixed.bullets.filter(b => {
        const s = String(b || '').trim();
        if (!s || s.length < 6) return false;
        if (/^---\s*Sheet:/i.test(s)) return false;
        if (/^\d+\s*rows?\s*[×x]\s*\d+\s*columns?/i.test(s)) return false;
        return !/see (source|related)|refer to (the )?(source|data)|no additional metrics|content not available|supporting detail|drawn from selected|expanded to meet target|added to (reach|meet)|review neighbouring|cross-check figures|see source document for supporting|validate data gaps and discrepancies for|cross-check population denominators/i.test(s);
      });
    }

    // Clean professional tables: never show bullets under a data table
    if (fixed.slideType === 'table' || (fixed.table && !fixed.chart)) {
      fixed.bullets = [];
      fixed.insightHeadline = null;
    }
    // Drop recycled percentage callouts from chart side panels
    if ((fixed.chart || fixed.secondaryChart) && Array.isArray(fixed.bullets)) {
      fixed.bullets = fixed.bullets.filter(b => {
        const s = String(b || '');
        if (/%/.test(s) && /preterm|birth weight|elbw|lbw|of the register|recorded birth/i.test(s)) return false;
        return true;
      }).slice(0, 2);
    }

    if (fixed.chart) fixed.chart = validateChart(fixed.chart);
    if (fixed.secondaryChart) fixed.secondaryChart = validateChart(fixed.secondaryChart);

    // Fix table + sanitize broken completion % cells (#DIV/0!, false 0.0%)
    if (fixed.table) {
      fixed.table = validateTable(fixed.table);
      if (fixed.table && fixed.table.headers && fixed.table.rows) {
        try {
          const { sanitizeCompletionCells } = require('./factGrounding');
          if (typeof sanitizeCompletionCells === 'function') {
            fixed.table.rows = sanitizeCompletionCells(fixed.table.headers, fixed.table.rows);
          }
        } catch (_) { /* factGrounding optional at validate time */ }
      }
    }

    // Mark empty slides for removal — do NOT inject placeholder bullets
    // (placeholder text was the source of empty "Analysis Detail" pages).
    if (isSlideEmpty(fixed) && !['cover', 'section', 'agenda', 'thankyou', 'closing', 'conclusion', 'summary', 'recommendations'].includes(fixed.slideType)) {
      warnings.push(`Slide ${i + 1} (${fixed.slideType}): "${fixed.title}" empty — will drop`);
      fixed._dropEmpty = true;
    }

    if (fixed.slideType === 'kpi' && (!fixed.kpiCards || !fixed.kpiCards.length)) {
      fixed.slideType = 'insights';
      warnings.push(`Slide ${i + 1}: KPI slide has no cards, converted to insights`);
    }
    if (fixed.slideType === 'chart' && !fixed.chart) {
      fixed.slideType = 'insights';
      warnings.push(`Slide ${i + 1}: Chart slide has no valid chart data, converted to insights`);
    }
    if (fixed.slideType === 'dualChart' && !fixed.chart && !fixed.secondaryChart) {
      fixed.slideType = 'insights';
      warnings.push(`Slide ${i + 1}: dualChart has no charts, converted to insights`);
    }

    // Generic "Analysis Detail N" titles with no unique content → drop
    if (/^analysis\s+detail\s*\d*$/i.test(String(fixed.title || '').trim()) && isSlideEmpty(fixed)) {
      fixed._dropEmpty = true;
      warnings.push(`Slide ${i + 1}: generic Analysis Detail empty — drop`);
    }

    results.push(fixed);
  });

  // Must start with cover
  if (results[0]?.slideType !== 'cover') {
    results.unshift({
      slideIndex: 0,
      slideType: 'cover',
      title: results[0]?.title || 'Presentation',
      subtitle: '',
      speakerNotes: '',
    });
  }

  // Prefer fewer accurate slides over padded empty ones
  const STRUCTURAL = new Set([
    'cover', 'agenda', 'section', 'summary', 'recommendations',
    'thankyou', 'thank_you', 'closing', 'conclusion',
  ]);

  const kept = results.filter((slide, idx) => {
    if (slide._dropEmpty) {
      warnings.push(`Slide ${idx + 1} dropped (_dropEmpty): "${slide.title}"`);
      return false;
    }

    const type = String(slide.slideType || '').toLowerCase();
    if (STRUCTURAL.has(type)) {
      if (!slide.bullets || !slide.bullets.length) {
        if (type === 'thankyou' || type === 'thank_you' || type === 'closing') {
          slide.bullets = slide.bullets || [];
        }
      }
      return true;
    }

    // Drop Excel duplicate-sheet slides entirely
    if (/^copy\s+of\b/i.test(String(slide.title || ''))) {
      warnings.push(`Slide ${idx + 1} dropped (duplicate sheet): "${slide.title}"`);
      return false;
    }
    // Drop padding / generic analysis shells
    if (
      /^Supporting Detail/i.test(String(slide.title || '')) ||
      /^Analysis Detail/i.test(String(slide.title || '')) ||
      /^Focus Metric:/i.test(String(slide.title || '')) ||
      /Added to meet target/i.test(String(slide.subtitle || ''))
    ) {
      warnings.push(`Slide ${idx + 1} dropped (padding): "${slide.title}"`);
      return false;
    }
    // Bare place-name titles: retitle into a usable sample table instead of dropping
    // (dropping the only table left measles decks with 0 visuals)
    if (
      /^(vellore|chennai|district|sheet\s*\d+|data|table)$/i.test(String(slide.title || '').trim()) &&
      slide.table
    ) {
      slide.title = 'Case register sample';
      slide.subtitle = slide.subtitle || 'Key fields from the source line list';
      if (!slide.bullets || !slide.bullets.length) {
        const n = (slide.table.rows || []).length;
        slide.bullets = [
          `${n} rows shown from the source register (PII columns removed).`,
          'Use charts and KPI slides for aggregated programme metrics.',
        ];
      }
      warnings.push(`Slide ${idx + 1}: retitled raw register dump → "Case register sample"`);
    }

    if (isSlideEmpty(slide)) {
      warnings.push(`Slide ${idx + 1} dropped (empty): "${slide.title}"`);
      return false;
    }

    const hasVisual =
      (slide.kpiCards && slide.kpiCards.length > 0) ||
      (slide.chart && slide.chart.series && slide.chart.series.length > 0) ||
      (slide.secondaryChart && slide.secondaryChart.series && slide.secondaryChart.series.length > 0) ||
      (slide.table && slide.table.headers && slide.table.headers.length > 0) ||
      (slide.processSteps && slide.processSteps.length > 0);

    let bulletCount = (slide.bullets || []).filter((b) => b && String(b).trim()).length;

    const isFluff = (s) => {
      const t = String(s || '').trim();
      if (!t) return true;
      if (/^expanded section view$/i.test(t)) return true;
      if (/^copy\s+of\b/i.test(t)) return true;
      if (/^\d+\s*rows?\s*[×x]\s*\d+\s*columns?/i.test(t)) return true;
      if (/^overview$/i.test(t)) return true;
      if (/figures should be validated|review related tables for supporting/i.test(t)) return true;
      return false;
    };

    // Sparse non-visual slides: keep only with real non-fluff bullets
    if (!hasVisual && bulletCount < 3) {
      const real = (slide.bullets || []).filter((b) => {
        const s = String(b || '').trim();
        if (!s || isFluff(s)) return false;
        if (s === String(slide.title || '').trim()) return false;
        return !/see (source|related)|refer to|no additional|content not available|supporting detail|drawn from selected|expanded to meet|added to (reach|meet)|review neighbouring|cross-check figures|details are drawn|figures should be validated/i.test(s);
      });
      if (real.length === 0) {
        const sub = String(slide.subtitle || '').trim();
        if (sub.length > 30 && !isFluff(sub) && sub !== String(slide.title || '').trim()) {
          slide.bullets = [sub];
          warnings.push(`Slide ${idx + 1} sparse content cleaned (kept): "${slide.title}"`);
          return true;
        }
        warnings.push(`Slide ${idx + 1} dropped (sparse): "${slide.title}"`);
        return false;
      }
      slide.bullets = real.slice(0, 6);
      if (['table', 'chart', 'dualchart'].includes(String(slide.slideType || '').toLowerCase())) {
        slide.slideType = 'insights';
        slide.chart = null;
        slide.table = null;
      }
      if (slide.insightHeadline && /key analytical finding|priority focus/i.test(String(slide.insightHeadline))) {
        slide.insightHeadline = null;
      }
      warnings.push(`Slide ${idx + 1} sparse content cleaned (kept): "${slide.title}"`);
      return true;
    }

    // Clean CSV / case-register dumps from bullets
    if (bulletCount >= 2) {
      const cleaned = (slide.bullets || []).filter((b) => {
        const s = String(b || '');
        return (s.match(/,/g) || []).length < 4
          && (s.match(/\|/g) || []).length < 3
          && !/^TN-[A-Z]{2,4}-\d{2}-\d+/i.test(s);
      });
      if (cleaned.length < bulletCount) {
        if (cleaned.length >= 1) {
          slide.bullets = cleaned;
          warnings.push(`Slide ${idx + 1}: cleaned CSV/register bullets (kept slide)`);
        } else if (!hasVisual) {
          warnings.push(`Slide ${idx + 1} dropped after CSV clean (no content left)`);
          return false;
        } else {
          slide.bullets = [];
        }
      }
    }
    return true;
  });

  // Fix bad chart titles like "Vellore: 100% vs 100%" and series named "100%"
  kept.forEach((slide) => {
    if (slide.chart) {
      if (slide.chart.title && /100%\s*vs\s*100%|^vellore:\s*100%/i.test(slide.chart.title)) {
        const seriesNames = (slide.chart.series || []).map((s) => s.name).filter((n) => n && !/^\d+%$/.test(n));
        slide.chart.title = seriesNames.length
          ? `Performance: ${seriesNames.slice(0, 2).join(' vs ')}`
          : 'Facility Performance Comparison';
      }
      (slide.chart.series || []).forEach((s, i) => {
        if (s.name && /^\d+(\.\d+)?%$/.test(String(s.name).trim())) {
          s.name = i === 0 ? 'Series A' : 'Series B';
        }
      });
    }
    if (slide.insightHeadline && slide.subtitle &&
        String(slide.insightHeadline).slice(0, 40) === String(slide.subtitle).slice(0, 40)) {
      slide.insightHeadline = null;
    }
  });

  // ── Strong deduplication: title, content fingerprint, chart fingerprint ──
  const deduped = [];
  const seenTitles = new Set();
  const seenContent = new Set();
  const seenCharts = new Set();
  const seenBulletSnippets = new Map(); // snippet → first slide index in deduped

  for (const slide of kept) {
    const type = String(slide.slideType || '').toLowerCase();
    const isStruct = STRUCTURAL.has(type);
    const titleKey = String(slide.title || '')
      .toLowerCase()
      .replace(/\s*\(cont\.?\)\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Same title → keep richer version only
    if (!isStruct && titleKey && seenTitles.has(titleKey)) {
      const isContinuation = /\bcont\b|\bcont\.|part|\(\d+\/\d+\)/i.test(slide.title) ||
                            (slide.table && deduped.some(s => s.table && String(s.title || '').toLowerCase().replace(/\s*\(cont\.?\)\s*/gi, '').replace(/\s+/g, ' ').trim() === titleKey));
      if (!isContinuation) {
        const prevIdx = deduped.findIndex(
          (s) => String(s.title || '').toLowerCase().replace(/\s*\(cont\.?\)\s*/gi, '').replace(/\s+/g, ' ').trim() === titleKey
        );
        if (prevIdx >= 0 && contentScore(slide) > contentScore(deduped[prevIdx])) {
          deduped[prevIdx] = slide;
        }
        warnings.push(`Dedup title: dropped duplicate "${slide.title}"`);
        continue;
      }
    }

    // Near-identical content body (same bullets/insight) even if titles differ
    const fp = contentFingerprint(slide);
    if (!isStruct && fp && fp.length > 20 && seenContent.has(fp)) {
      warnings.push(`Dedup content: dropped near-identical "${slide.title}"`);
      continue;
    }

    // Identical chart data already used → strip chart from this slide (or drop if chart-only)
    const cfp = chartFingerprint(slide.chart);
    if (cfp && seenCharts.has(cfp)) {
      warnings.push(`Dedup chart: removed repeated chart on "${slide.title}"`);
      slide.chart = null;
      if (slide.slideType === 'chart' || slide.slideType === 'dualChart') {
        // If no other content remains, drop
        if (isSlideEmpty(slide)) {
          warnings.push(`Dedup chart: dropped chart-only duplicate "${slide.title}"`);
          continue;
        }
        slide.slideType = 'insights';
      }
    }
    const cfp2 = chartFingerprint(slide.secondaryChart);
    if (cfp2 && (seenCharts.has(cfp2) || cfp2 === cfp)) {
      slide.secondaryChart = null;
    }

    // HARD unique bullets across content slides. Only summary/recommendations/thankyou may restate.
    // This stops the same RHD 100% / Cleft 97.4% lines appearing on slides 6–10.
    const mayRestate = /summary|recommend|thank|closing|conclusion|action pathway/i.test(
      String(slide.title || '') + ' ' + type
    );
    if (!isStruct && !mayRestate && Array.isArray(slide.bullets) && slide.bullets.length) {
      const uniquePool = [];
      for (const b of slide.bullets) {
        const snip = String(b || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);
        if (!snip) continue;
        // Also block near-duplicates sharing first 50 chars of a previously used bullet
        let isDup = seenBulletSnippets.has(snip);
        if (!isDup) {
          const head = snip.slice(0, 50);
          for (const prev of seenBulletSnippets.keys()) {
            if (prev.startsWith(head) || head.startsWith(prev.slice(0, 50))) {
              isDup = true;
              break;
            }
          }
        }
        if (isDup) continue;
        uniquePool.push({ bullet: b, snip });
      }
      for (const item of uniquePool) {
        seenBulletSnippets.set(item.snip, deduped.length);
      }
      const finalBullets = uniquePool.map(item => item.bullet);
      if (finalBullets.length > 0) {
        slide.bullets = finalBullets;
      } else if (!slide.chart && !slide.table && !slide.kpiCards?.length) {
        warnings.push(`Dedup bullets: dropped empty after strip "${slide.title}"`);
        continue;
      } else {
        // Chart/table slides can stand without bullets if all were duplicates
        slide.bullets = [];
        warnings.push(`Dedup bullets: cleared recycled bullets on visual slide "${slide.title}"`);
      }
    } else if (Array.isArray(slide.bullets)) {
      for (const b of slide.bullets) {
        const snip = String(b || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);
        if (snip && !seenBulletSnippets.has(snip)) seenBulletSnippets.set(snip, deduped.length);
      }
    }

    if (titleKey) seenTitles.add(titleKey);
    if (fp && fp.length > 20) seenContent.add(fp);
    if (cfp) seenCharts.add(cfp);
    if (cfp2) seenCharts.add(cfp2);

    deduped.push(slide);
  }
  kept.length = 0;
  kept.push(...deduped);

  // Merge consecutive sparse insight/finding slides into one denser slide
  {
    const merged = [];
    for (const slide of kept) {
      const prev = merged[merged.length - 1];
      const isSparseInsights = (s) => {
        const t = String(s.slideType || '').toLowerCase();
        if (!['insights', 'finding', 'findings'].includes(t) && !/finding/i.test(s.title || '')) return false;
        if (s.chart || s.table || (s.kpiCards && s.kpiCards.length)) return false;
        return (s.bullets || []).length > 0 && (s.bullets || []).length <= 2;
      };
      if (prev && isSparseInsights(prev) && isSparseInsights(slide)) {
        const combined = [...(prev.bullets || []), ...(slide.bullets || [])];
        const seen = new Set();
        prev.bullets = combined.filter((b) => {
          const k = String(b).toLowerCase().slice(0, 60);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        }).slice(0, 7);
        if (!/key finding/i.test(prev.title || '')) prev.title = 'Key Findings';
        warnings.push(`Merged sparse findings into "${prev.title}"`);
        continue;
      }
      merged.push(slide);
    }
    kept.length = 0;
    kept.push(...merged);
  }

  // ── Merge thin KPI / "Key Metrics (N)" slides into one dense overview ──
  // Prevents 3 half-empty KPI pages (e.g. Metrics, Metrics (2), Metrics (3)).
  {
    const isKpiLike = (s) => {
      const t = String(s.slideType || '').toLowerCase();
      // Never absorb closing / structural slides into the KPI merge
      if (['summary', 'recommendations', 'cover', 'agenda', 'thankyou', 'thank_you', 'closing', 'conclusion'].includes(t)) {
        return false;
      }
      if (t === 'kpi' || t === 'overview') return true;
      if (/^key\s+(performance\s+)?indicators|^key\s+metrics(\s*\(\d+\))?$/i.test(String(s.title || ''))) return true;
      // Only absorb pure KPI-card pages (no chart/table)
      return !!(s.kpiCards && s.kpiCards.length && !s.chart && !s.table && !s.processSteps?.length);
    };
    const kpiSlides = kept.filter(isKpiLike);
    if (kpiSlides.length >= 2) {
      const allCards = [];
      const seenLabels = new Set();
      for (const s of kpiSlides) {
        for (const c of (s.kpiCards || [])) {
          const key = String(c.label || '').toLowerCase().trim();
          if (!key || seenLabels.has(key)) continue;
          seenLabels.add(key);
          allCards.push(c);
          if (allCards.length >= 6) break;
        }
        if (allCards.length >= 6) break;
      }
      // Also harvest bullet "Label: value" lines into cards when cards are still thin
      if (allCards.length < 4) {
        for (const s of kpiSlides) {
          for (const b of (s.bullets || [])) {
            const m = String(b).match(/^(.{4,40}?):\s*(.+)$/);
            if (!m) continue;
            const key = m[1].toLowerCase().trim();
            if (seenLabels.has(key)) continue;
            seenLabels.add(key);
            allCards.push({ label: m[1].trim().slice(0, 28), value: m[2].trim().slice(0, 16), unit: '', context: '' });
            if (allCards.length >= 6) break;
          }
          if (allCards.length >= 6) break;
        }
      }
      if (allCards.length >= 2) {
        const keepFirst = kpiSlides[0];
        keepFirst.slideType = 'kpi';
        keepFirst.title = /key performance|kpi/i.test(String(keepFirst.title || ''))
          ? keepFirst.title
          : 'Key Performance Indicators';
        keepFirst.subtitle = keepFirst.subtitle || 'Selected indicators from source data';
        keepFirst.kpiCards = allCards.slice(0, 6);
        // Prefer real insight bullets; drop pure label:value echoes of the cards
        const cardEcho = new Set(allCards.map((c) => String(c.label || '').toLowerCase().slice(0, 24)));
        const mergedBullets = [];
        for (const s of kpiSlides) {
          for (const b of (s.bullets || [])) {
            const t = String(b || '').trim();
            if (!t || t.length < 12) continue;
            if (cardEcho.has(t.toLowerCase().slice(0, 24))) continue;
            if (/^[\w\s/()<>.-]{4,40}:\s*/.test(t) && t.length < 80) continue; // card echo lines
            if (mergedBullets.some((x) => x.slice(0, 40) === t.slice(0, 40))) continue;
            mergedBullets.push(t);
          }
        }
        keepFirst.bullets = mergedBullets.slice(0, 5);
        const dropIds = new Set(kpiSlides.slice(1).map((s) => s));
        const next = kept.filter((s) => !dropIds.has(s));
        // Ensure keepFirst is still present (it is)
        kept.length = 0;
        kept.push(...next);
        warnings.push(`Merged ${kpiSlides.length} thin KPI slides → 1 dense overview (${allCards.length} cards)`);
      }
    }
  }

  // Drop hollow content slides (title + repeated subtitle only — no chart/table/kpi/bullets)
  {
    const next = [];
    for (const slide of kept) {
      const type = String(slide.slideType || '').toLowerCase();
      const structural = new Set(['cover', 'agenda', 'section', 'summary', 'recommendations', 'thankyou', 'thank_you', 'closing', 'conclusion']);
      if (structural.has(type)) {
        next.push(slide);
        continue;
      }
      const hasVisual =
        (slide.kpiCards && slide.kpiCards.length > 0) ||
        (slide.chart && slide.chart.series && slide.chart.series.length > 0) ||
        (slide.secondaryChart && slide.secondaryChart.series && slide.secondaryChart.series.length > 0) ||
        (slide.table && slide.table.rows && slide.table.rows.length > 0) ||
        (slide.processSteps && slide.processSteps.length > 0);
      const bullets = (slide.bullets || []).filter((b) => {
        const t = String(b || '').trim();
        if (!t || t.length < 12) return false;
        // Subtitle / title echo is not content
        if (slide.subtitle && t.slice(0, 40) === String(slide.subtitle).slice(0, 40)) return false;
        if (slide.insightHeadline && t.slice(0, 40) === String(slide.insightHeadline).slice(0, 40)) return false;
        if (slide.title && t.slice(0, 40) === String(slide.title).slice(0, 40)) return false;
        // Generic line-list filler
        if (/detailed records of infant|clinical parameters, diagnoses|source document contains/i.test(t)) return false;
        return true;
      });
      if (!hasVisual && bullets.length === 0) {
        warnings.push(`Dropped hollow slide: "${slide.title}"`);
        continue;
      }
      // Insights with only 1 weak bullet and no visual → drop (empty-looking page)
      // Never apply to structural closing slides
      if (
        !hasVisual &&
        type === 'insights' &&
        bullets.length <= 1 &&
        !/thank\s*you|conclusion|closing/i.test(String(slide.title || ''))
      ) {
        warnings.push(`Dropped sparse insights: "${slide.title}"`);
        continue;
      }
      // Single-KPI page with no supporting text → fold is better than empty canvas
      if (
        (type === 'kpi' || type === 'overview') &&
        (slide.kpiCards || []).length === 1 &&
        bullets.length === 0 &&
        !slide.chart
      ) {
        warnings.push(`Dropped single-KPI empty page: "${slide.title}"`);
        continue;
      }
      // Chart slides: strip bullets that only repeat the chart title/subtitle
      if ((slide.chart || slide.secondaryChart) && bullets.length) {
        slide.bullets = bullets.filter((b) => {
          const t = String(b).toLowerCase();
          const title = String(slide.title || '').toLowerCase();
          const sub = String(slide.subtitle || '').toLowerCase();
          if (title && t.includes(title.slice(0, 30))) return false;
          if (sub && t.slice(0, 50) === sub.slice(0, 50)) return false;
          return true;
        }).slice(0, 3);
      } else {
        slide.bullets = bullets;
      }
      next.push(slide);
    }
    kept.length = 0;
    kept.push(...next);
  }

  // Auto-sync agenda bullets from real subsequent slide titles (up to 10)
  const agendaIdx = kept.findIndex((s) => s.slideType === 'agenda');
  if (agendaIdx >= 0) {
    const skipTypes = new Set(['thankyou', 'closing', 'conclusion', 'summary', 'recommendations', 'actions']);
    const realTitles = kept
      .slice(agendaIdx + 1)
      .filter((s) => !skipTypes.has(String(s.slideType || '').toLowerCase()))
      .map((s) => s.title)
      .filter(Boolean)
      .slice(0, 10);
    if (realTitles.length >= 3) {
      kept[agendaIdx].bullets = realTitles;
      kept[agendaIdx].title = kept[agendaIdx].title || 'Briefing Agenda';
      kept[agendaIdx].subtitle = kept[agendaIdx].subtitle || 'Structured overview of this deck';
    }
  }

  kept.forEach((s, i) => {
    s.slideIndex = i + 1;
    delete s._dropEmpty;
  });

  let chartCount = 0;
  let tableCount = 0;
  let kpiCount = 0;
  kept.forEach((s) => {
    if (s.chart) chartCount++;
    if (s.secondaryChart) chartCount++;
    if (s.table) tableCount++;
    if (s.kpiCards && s.kpiCards.length) kpiCount++;
  });
  console.log(`[QualityValidator] Visual inventory: ${chartCount} charts, ${tableCount} tables, ${kpiCount} KPI slides across ${kept.length} slides`);

  const visualCount = chartCount + tableCount;
  const visualPct = kept.length ? Math.round((visualCount / kept.length) * 100) : 0;
  console.log(`[QualityValidator] Visual mix: ${visualPct}% charts+tables (${chartCount} charts, ${tableCount} tables) of ${kept.length} slides`);
  if (visualPct < 50 && kept.length > 6) {
    console.warn(`[QualityValidator] WARNING: visual mix ${visualPct}% is below 50% target — strategy should produce more charts/tables`);
  }
  if (chartCount < 3 && kept.length > 8) {
    console.warn(`[QualityValidator] WARNING: only ${chartCount} charts in a ${kept.length}-slide deck`);
  }
  if (warnings.length > 0) {
    console.warn('[QualityValidator] Warnings:', warnings.slice(0, 40));
  }
  console.log(`[QualityValidator] Validated ${kept.length} slides, ${warnings.length} auto-fixes applied`);
  return kept;
}

module.exports = { validateBlueprint };

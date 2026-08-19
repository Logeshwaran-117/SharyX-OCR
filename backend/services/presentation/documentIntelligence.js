
'use strict';
/**
 * documentIntelligence.js
 * ────────────────────────
 * STAGES 1-3 of the AI Presentation Pipeline.
 *
 * Stage 1 — Raw extraction (text, tables, headings, metadata)
 * Stage 2 — AI-powered semantic understanding via Claude/Gemini
 * Stage 3 — Universal Semantic JSON construction
 *
 * Output is a rich DocumentIntelligence object that every downstream
 * pipeline stage consumes as the single source of truth.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { parseJSON } = require('../../utils/jsonParser');

// ── Anthropic client ──────────────────────────────────────────────────────────
let _anthropic = null;
function getAnthropicClient() {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

// ── Gemini call ───────────────────────────────────────────────────────────────
async function callGemini(prompt) {
  const { callWithRotation, GEMINI_MODEL } = require('../geminiService');
  return callWithRotation(() => [{ text: prompt }], 8192, GEMINI_MODEL, null, 'presentation', 'application/json');
}

// ── LLM Orchestrator ──────────────────────────────────────────────────────────
/**
 * Uses Gemini as primary LLM (or Claude if PREFER_CLAUDE is set and key is available).
 * Returns parsed JSON object.
 */
async function callLLMForJSON(systemPrompt, userPrompt) {
  const useClaude = process.env.PREFER_CLAUDE === 'true' && process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== '';

  if (useClaude) {
    try {
      const client = getAnthropicClient();
      const resp = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      const text = resp.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('');
      return parseJSON(text, 'LLM output', 'DocumentIntelligence');
    } catch (claudeErr) {
      console.warn('[DocumentIntelligence] Claude failed, falling back to Gemini:', claudeErr.message);
    }
  }

  // Primary / Fallback: Gemini
  const geminiResp = await callGemini(`${systemPrompt}\n\n${userPrompt}`);
  return parseJSON(geminiResp, 'LLM output', 'DocumentIntelligence');
}

// ── Stage 2 + 3: Semantic Intelligence Extraction ─────────────────────────────
const INTELLIGENCE_SYSTEM_PROMPT = `You are a world-class Document Intelligence Engine and Senior Business Analyst.
You handle ANY domain: public health, finance (P&L), banking, operations, programme evaluation.
Your job is to deeply understand any document uploaded and extract ALL meaningful information into a rich structured JSON.

CRITICAL EXTRACTION RULES:
1. To prevent JSON truncation, the "rows" array MUST be empty [] in your JSON for any table containing more than 10 rows. Headers, title, and summary must still be populated. Raw rows are merged locally.
2. Every synthesized chart must have at most 10 categories/values. Never output a chart with more than 10 categories (if more exist, filter or group them to the top 10).
3. From every multi-column numeric table, ALSO synthesize ready-to-plot chart objects (MINIMUM 4–6 charts when data supports it):
   - Comparison of two key metrics by category/block → chartType "bar", multi-series
   - Ranked rates / percentages → chartType "horizontal"
   - Composition / management mix → chartType "stacked"
   - Share of total / completion status → chartType "donut" or "pie"
   - Time series if dates exist → chartType "line"
   - For health programmes: Expected vs Confirmed, Medical vs Surgery, detection %, Done vs Pending
   - For financial docs: inflow vs outflow by period, category spend pie, balance trend line, top merchants bar
4. Create a rich KPI list (6–10 items when possible) with exact numbers and short context.
5. Keep the "rawMetrics" object small and minimal (at most 10 key summary metrics). Do NOT list every row, transaction, or cell as a metric.
6. Preserve exact numbers. Do not round or invent.
7. Identify entity names (blocks, categories, merchants, conditions) exactly as written.
8. Flag data anomalies, gaps, and risks with concrete numbers.
9. Executive summary 3-5 sentences. Key findings (5–8) and recommendations (4–6) must be concrete and numeric where possible.
10. Always populate sections[].charts[] aggressively so the strategy layer can place ≥5 charts without inventing data.

Output ONLY valid JSON matching this exact schema:
{
  "documentType": string,
  "industry": string,
  "domain": string,
  "purpose": string,
  "audience": string,
  "title": string,
  "subtitle": string,
  "period": string,
  "organization": string,
  "executiveSummary": string,
  "keyFindings": string[],
  "recommendations": string[],
  "risks": string[],
  "kpis": [{ "label": string, "value": string, "unit": string, "trend": "up"|"down"|"stable"|null, "context": string }],
  "sections": [{
    "title": string,
    "level": number,
    "summary": string,
    "insights": string[],
    "tables": [{
      "title": string,
      "headers": string[],
      "rows": string[][],
      "summary": string
    }],
    "charts": [{
      "title": string,
      "chartType": "bar"|"line"|"pie"|"donut"|"stacked"|"horizontal"|"area"|"scatter",
      "categories": string[],
      "series": [{ "name": string, "values": number[] }],
      "unit": string,
      "insight": string
    }],
    "comparisons": [{ "item": string, "value": string, "vs": string, "change": string }],
    "timelines": [{ "event": string, "date": string, "description": string }]
  }],
  "appendix": string[],
  "rawMetrics": { [key: string]: string }
}

Be exhaustive. Synthesize charts from tables so the presentation layer can render bars, stacked bars, and donuts without guessing.

ANTI-HALLUCINATION (CRITICAL — non-negotiable):
- ONLY extract numbers, percentages, dates, names, and facts that APPEAR VERBATIM in the document text above.
- NEVER invent, estimate, extrapolate, or "typical" values. If a metric is missing, omit it.
- Chart series values MUST come from table cells or explicit figures in the document.
- keyFindings / recommendations must cite only evidence present in the document.
- If the document is thin, return fewer KPIs/sections — sparsity is correct; fabrication is not.`;

/**
 * Build a DocumentIntelligence object from raw extracted text.
 *
 * @param {string} rawText  - Full document text
 * @param {object} meta     - { filename, mimeType, fileSize }
 * @returns {Promise<object>} DocumentIntelligence JSON
 */
async function buildDocumentIntelligence(rawText, meta = {}) {
  console.log('[DocumentIntelligence] Stage 1-3: Extracting semantic intelligence...');

  const {
    buildFactBank,
    groundIntelligence,
    formatFactBankForPrompt,
    buildFallbackIntelligence,
  } = require('./factGrounding');

  // Build grounded fact bank BEFORE LLM call (RAG-lite corpus)
  const factBank = buildFactBank(rawText, meta);
  console.log(`[DocumentIntelligence] Fact bank: ${factBank.numberFacts.size} numbers, ${factBank.entities.size} entities, ${factBank.chunks.length} chunks`);

  // Truncate to avoid token limits but keep as much as possible
  const MAX_CHARS = 150_000;
  const truncated = rawText.length > MAX_CHARS
    ? rawText.slice(0, MAX_CHARS) + '\n...[document truncated for processing]'
    : rawText;

  const factBlock = formatFactBankForPrompt(factBank);

  const userPrompt = `Document filename: ${meta.filename || 'unknown'}
File type: ${meta.mimeType || 'unknown'}

${factBlock}

=== FULL DOCUMENT CONTENT ===
${truncated}
=== END OF DOCUMENT ===

Extract complete DocumentIntelligence JSON from this document now.
RULE: Every number in your JSON must appear in the FACT BANK or document text. Inventing numbers is forbidden.
You MUST populate kpis (at least 3 if numbers exist in the document) and at least 1 section with tables/insights.`;

  let intelligence = null;
  try {
    intelligence = await callLLMForJSON(INTELLIGENCE_SYSTEM_PROMPT, userPrompt);
  } catch (llmErr) {
    console.warn('[DocumentIntelligence] LLM extraction failed:', llmErr.message);
    intelligence = null;
  }

  // Post-process: ensure arrays exist
  const defaults = {
    kpis: [], sections: [], keyFindings: [], recommendations: [],
    risks: [], appendix: [], rawMetrics: {},
  };
  let result = { ...defaults, ...(intelligence || {}) };

  // Pre-parse Excel/CSV sheets so we never depend solely on LLM for tabular docs
  let preSheetTables = [];
  try {
    const { parseSheetTablesFromText: preParse } = require('./factGrounding');
    if (typeof preParse === 'function') {
      preSheetTables = preParse(rawText) || [];
      console.log(`[DocumentIntelligence] Sheet pre-parse: ${preSheetTables.length} table(s)`);
    }
  } catch (preErr) {
    console.warn('[DocumentIntelligence] Sheet pre-parse failed:', preErr.message);
  }

  // If LLM returned empty shell OR (Excel sheets exist and LLM gave almost nothing), use fallback
  const thin =
    !(result.kpis && result.kpis.length) &&
    !(result.sections && result.sections.length) &&
    !(result.keyFindings && result.keyFindings.length);
  const sheetRichButLlmWeak =
    preSheetTables.length > 0 &&
    ((result.kpis || []).length < 3 ||
      (result.sections || []).reduce((n, s) => n + ((s.tables && s.tables.length) || 0), 0) < 1);

  if (thin || sheetRichButLlmWeak) {
    console.warn(
      `[DocumentIntelligence] ${thin ? 'LLM empty' : 'LLM weak vs rich sheets'} — using fact-bank fallback`
    );
    const fallback = buildFallbackIntelligence(rawText, factBank, meta);
    // Prefer fallback structure when sheets are rich; keep any good LLM findings
    result = {
      ...defaults,
      ...fallback,
      keyFindings: [
        ...(fallback.keyFindings || []),
        ...((result.keyFindings || []).filter(f => {
          const s = String(f || '');
          return (s.match(/,/g) || []).length < 3 && !/^TN-[A-Z]/i.test(s);
        })),
      ].slice(0, 10),
      recommendations: (result.recommendations?.length ? result.recommendations : fallback.recommendations) || [],
      executiveSummary: result.executiveSummary || fallback.executiveSummary,
      title: result.title || fallback.title,
      organization: result.organization || fallback.organization,
    };
  } else {
    // Partial LLM success: still enrich with spreadsheet tables/charts when sparse.
    // Many Excel docs yield only 1 section / few KPIs; fact-bank tables fill the gap
    // without inventing numbers.
    try {
      const {
        parseSheetTablesFromText,
        synthesiseChartsFromTables,
        sanitizeTablesForPresentation,
        buildFallbackIntelligence: buildFb,
      } = require('./factGrounding');
      const sheetTables = preSheetTables.length
        ? preSheetTables
        : (typeof parseSheetTablesFromText === 'function' ? parseSheetTablesFromText(rawText) : []);
      if (sheetTables.length > 0) {
        const existingTableCount = (result.sections || []).reduce(
          (n, s) => n + ((s.tables && s.tables.length) || 0), 0
        );
        const existingChartCount = (result.sections || []).reduce(
          (n, s) => n + ((s.charts && s.charts.length) || 0), 0
        );
        // Always enrich when sheets exist and intelligence is still thin
        if (existingTableCount < 3 || existingChartCount < 4 || (result.kpis || []).length < 5) {
          // Charts from full columns; tables sanitized separately for display
          const sheetCharts = typeof synthesiseChartsFromTables === 'function'
            ? synthesiseChartsFromTables(sheetTables)
            : [];
          console.log(
            `[DocumentIntelligence] Enriching with ${sheetTables.length} sheet table(s), ${sheetCharts.length} chart(s)`
          );

          // One section per sheet (preserves block-level detail)
          const safeTables = (typeof sanitizeTablesForPresentation === 'function'
            ? sanitizeTablesForPresentation(sheetTables)
            : sheetTables);
          // Attach ALL synthesised charts to the first section; later sections get tables only
          const sheetSections = safeTables.map((t, ti) => ({
            title: t.title,
            level: 1,
            summary: t.summary,
            insights: [],
            tables: [t],
            charts: ti === 0 ? sheetCharts.slice() : [],
            comparisons: [],
            timelines: [],
          }));

          if (!result.sections || !result.sections.length) {
            result.sections = sheetSections;
          } else {
            const existingTitles = new Set(result.sections.map(s => (s.title || '').toLowerCase()));
            for (const sec of sheetSections) {
              const key = (sec.title || '').toLowerCase();
              if (!existingTitles.has(key)) {
                result.sections.push(sec);
                existingTitles.add(key);
              } else {
                const match = result.sections.find(s => (s.title || '').toLowerCase() === key);
                if (match) {
                  match.tables = [...(match.tables || []), ...(sec.tables || [])];
                  match.charts = [...(match.charts || []), ...(sec.charts || [])];
                }
              }
            }
          }

          // Boost KPIs from fact-bank if still sparse
          if ((!result.kpis || result.kpis.length < 5) && sheetTables.length) {
            const fb = typeof buildFb === 'function'
              ? buildFb(rawText, factBank, meta)
              : buildFallbackIntelligence(rawText, factBank, meta);
            if (!result.kpis) result.kpis = [];
            const existingLabels = new Set(result.kpis.map(k => (k.label || '').toLowerCase()));
            for (const k of (fb.kpis || [])) {
              if (result.kpis.length >= 10) break;
              if (!existingLabels.has((k.label || '').toLowerCase())) {
                result.kpis.push(k);
                existingLabels.add((k.label || '').toLowerCase());
              }
            }
            if ((!result.keyFindings || result.keyFindings.length < 4) && fb.keyFindings) {
              result.keyFindings = [...(result.keyFindings || []), ...fb.keyFindings].slice(0, 10);
            }
            if ((!result.recommendations || result.recommendations.length < 3) && fb.recommendations) {
              result.recommendations = [...(result.recommendations || []), ...fb.recommendations].slice(0, 8);
            }
          }
        }
      }
    } catch (enrichErr) {
      console.warn('[DocumentIntelligence] Sheet enrichment skipped:', enrichErr.message);
    }

    // Finance / health OCR enrichment when still sparse (no Excel sheets or thin LLM)
    try {
      const sparseKpis = !(result.kpis && result.kpis.length >= 4);
      
    // ── Always backfill charts from any tables present (PDF bank statements, OCR tables) ──
    try {
      const allTables = [];
      for (const sec of (result.sections || [])) {
        for (const t of (sec.tables || [])) {
          if (t && t.headers && t.rows) allTables.push(t);
        }
      }
      if (allTables.length && typeof synthesiseChartsFromTables === 'function') {
        const moreCharts = synthesiseChartsFromTables(allTables);
        const safe = typeof sanitizeTablesForPresentation === 'function'
          ? sanitizeTablesForPresentation(allTables)
          : allTables;
        if (moreCharts.length) {
          let chartCount = (result.sections || []).reduce((n, s) => n + ((s.charts || []).length), 0);
          console.log(`[DocumentIntelligence] Table chart backfill: ${moreCharts.length} chart(s) from ${safe.length} table(s) (had ${chartCount})`);
          // Attach to first section that has tables, or create a summary section
          for (const ch of moreCharts) {
            if (chartCount >= 14) break;
            let attached = false;
            for (const sec of (result.sections || [])) {
              if ((sec.tables || []).length) {
                if (!sec.charts) sec.charts = [];
                // avoid duplicate titles
                if (!sec.charts.some(c => c.title === ch.title)) {
                  sec.charts.push(ch);
                  chartCount++;
                  attached = true;
                  break;
                }
              }
            }
            if (!attached && result.sections && result.sections[0]) {
              if (!result.sections[0].charts) result.sections[0].charts = [];
              result.sections[0].charts.push(ch);
              chartCount++;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[DocumentIntelligence] chart backfill failed:', e.message);
    }


    const sparseCharts = (result.sections || []).reduce((n, s) => n + ((s.charts && s.charts.length) || 0), 0) < 2;
      const blob = (rawText || '') + ' ' + (meta.filename || '') + ' ' + (result.documentType || '') + ' ' + (result.industry || '');
      const looksDomain = /debit|credit|upi|neft|imps|balance|mpokket|bank|statement|financ|measles|immun|surveil|phc|vaccine|mr\s*i/i.test(blob);
      if (looksDomain && (sparseKpis || sparseCharts)) {
        const fb = buildFallbackIntelligence(rawText, factBank, meta);
        if (fb && fb.kpis && fb.kpis.length) {
          console.log('[DocumentIntelligence] Domain enrichment: ' + fb.kpis.length + ' KPIs, ' + ((fb.sections || []).length) + ' sections');
          if (!result.kpis) result.kpis = [];
          const labels = new Set(result.kpis.map(k => (k.label || '').toLowerCase()));
          for (const k of fb.kpis) {
            if (result.kpis.length >= 10) break;
            if (!labels.has((k.label || '').toLowerCase())) {
              result.kpis.push(k);
              labels.add((k.label || '').toLowerCase());
            }
          }
          if ((!result.sections || result.sections.length < 2) && fb.sections && fb.sections.length) {
            result.sections = fb.sections;
          } else if (fb.sections) {
            for (const sec of fb.sections) {
              const match = (result.sections || []).find(
                s => (s.title || '').toLowerCase().includes((sec.title || '').toLowerCase().split(' ')[0])
              );
              if (match) {
                match.charts = [...(match.charts || []), ...(sec.charts || [])];
                match.tables = [...(match.tables || []), ...(sec.tables || [])];
                match.insights = [...(match.insights || []), ...(sec.insights || [])]
                  .filter(x => (String(x).match(/,/g) || []).length < 4 && !/^TN-[A-Z]/i.test(String(x)))
                  .slice(0, 8);
              } else {
                result.sections = result.sections || [];
                result.sections.push(sec);
              }
            }
          }
          if ((!result.keyFindings || result.keyFindings.length < 4) && fb.keyFindings) {
            result.keyFindings = [...(result.keyFindings || []), ...fb.keyFindings]
              .filter(x => (String(x).match(/,/g) || []).length < 4 && !/^TN-[A-Z]/i.test(String(x)))
              .slice(0, 10);
          }
          if ((!result.recommendations || result.recommendations.length < 3) && fb.recommendations) {
            result.recommendations = [...(result.recommendations || []), ...fb.recommendations].slice(0, 8);
          }
          if ((!result.risks || !result.risks.length) && fb.risks) {
            result.risks = fb.risks;
          }
          if (!result.documentType || result.documentType === 'analytical_report') {
            result.documentType = fb.documentType || result.documentType;
            result.industry = fb.industry || result.industry;
            result.domain = fb.domain || result.domain;
          }
        }
      }
    } catch (finErr) {
      console.warn('[DocumentIntelligence] Domain enrichment skipped:', finErr.message);
    }
  }

  // Ground against fact bank (skip aggressive strip on pure fallback)
  let report = { stripped: 0, warnings: [] };
  if (!result._fallback) {
    const grounded = groundIntelligence(result, factBank);
    result = grounded.intelligence;
    report = grounded.report;
    // If grounding wiped everything substantive, merge fallback to supplement — but
    // don't discard any sections the LLM produced (they contain table structure).
    const kpisWiped = !(result.kpis && result.kpis.length);
    const sectionsWiped = !(result.sections && result.sections.length);
    if (kpisWiped && factBank.numberFacts.size > 0) {
      console.warn('[DocumentIntelligence] Grounding wiped all KPIs — restoring fact-bank fallback KPIs');
      const fallback = buildFallbackIntelligence(rawText, factBank, meta);
      // Restore KPIs from fallback
      result.kpis = fallback.kpis || [];
      // Only replace sections if also wiped
      if (sectionsWiped) {
        result.sections = fallback.sections || [];
        result.keyFindings = result.keyFindings?.length ? result.keyFindings : (fallback.keyFindings || []);
        result.recommendations = result.recommendations?.length ? result.recommendations : (fallback.recommendations || []);
      } else {
        // Merge fallback KPIs and findings WITHOUT replacing LLM sections
        const existingLabels = new Set((result.kpis || []).map(k => (k.label || '').toLowerCase()));
        for (const k of (fallback.kpis || [])) {
          if (result.kpis.length >= 10) break;
          if (!existingLabels.has((k.label || '').toLowerCase())) {
            result.kpis.push(k);
            existingLabels.add((k.label || '').toLowerCase());
          }
        }
      }
    }
  }
  result._factBank = factBank;
  result._rawText = rawText.length > 50_000 ? rawText.slice(0, 50_000) : rawText;

  // Stamp metadata
  result._meta = {
    filename: meta.filename,
    processedAt: new Date().toISOString(),
    charCount: rawText.length,
    wasImage: meta.wasImage || false,
    groundingStripped: report.stripped,
    groundingWarnings: report.warnings.length,
    usedFallback: !!result._fallback,
  };

  if (report.stripped > 0 || report.warnings.length > 0) {
    console.warn(`[DocumentIntelligence] Grounding: stripped=${report.stripped}, warnings=${report.warnings.length}`);
  }

  console.log(`[DocumentIntelligence] Extracted: ${result.sections?.length || 0} sections, ${result.kpis?.length || 0} KPIs${result._fallback ? ' (fallback)' : ''}`);
  return result;
}

/**
 * Build DocumentIntelligence from an image (OCR + analysis).
 */
async function buildDocumentIntelligenceFromImage(base64Data, mimeType, meta = {}) {
  console.log('[DocumentIntelligence] Stage 1-3 (Image): OCR + semantic extraction...');

  const userPrompt = `This is an uploaded document image (${meta.filename || 'image'}). 
OCR all text, understand all tables, charts, and data, then extract complete DocumentIntelligence JSON.`;

  let text = null;

  const useClaude = process.env.PREFER_CLAUDE === 'true' && process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== '';
  if (useClaude) {
    try {
      const client = getAnthropicClient();
      const resp = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: INTELLIGENCE_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } },
            { type: 'text', text: userPrompt },
          ],
        }],
      });
      text = resp.content.filter(b => b.type === 'text').map(b => b.text).join('');
    } catch (e) {
      console.warn('[DocumentIntelligence] Claude image OCR failed, falling back to Gemini:', e.message);
    }
  }

  if (!text) {
    const { callWithRotation, GEMINI_MODEL } = require('../geminiService');
    const fullPrompt = `${INTELLIGENCE_SYSTEM_PROMPT}\n\n${userPrompt}`;
    text = await callWithRotation(() => [
      { text: fullPrompt },
      { inline_data: { mime_type: mimeType || 'image/jpeg', data: base64Data } },
    ], 8192, GEMINI_MODEL, null, 'presentation');
  }

  const intelligence = parseJSON(text, 'LLM output', 'DocumentIntelligence');

  const defaults = { kpis: [], sections: [], keyFindings: [], recommendations: [], risks: [], rawMetrics: {} };
  const result = { ...defaults, ...intelligence };
  result._meta = { filename: meta.filename, processedAt: new Date().toISOString(), wasImage: true };

  return result;
}

module.exports = { buildDocumentIntelligence, buildDocumentIntelligenceFromImage };

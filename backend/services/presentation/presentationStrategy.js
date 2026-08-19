'use strict';
/**
 * presentationStrategy.js
 * ────────────────────────
 * STAGES 4-6 of the AI Presentation Pipeline.
 *
 * Changes vs previous:
 *  - NO full-bleed section divider pages (user request)
 *  - Only ONE cover page at the start
 *  - Stronger chart variety rules matching sample (clustered bar, stacked, horizontal, donut)
 *  - Dense visual slides preferred over sparse text
 */

const Anthropic = require('@anthropic-ai/sdk');
const { parseJSON } = require('../../utils/jsonParser');

let _anthropic = null;
function getClient() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

async function callGemini(prompt, maxTokens = 16000) {
  const { callWithRotation, GEMINI_MODEL } = require('../geminiService');
  return callWithRotation(() => [{ text: prompt }], maxTokens, GEMINI_MODEL, null, 'presentation', 'application/json');
}

// Local parseJSON function removed; imported from ../../utils/jsonParser

async function callLLMForJSON(system, user, maxTokens = 16000) {
  const useClaude = process.env.PREFER_CLAUDE === 'true' && process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== '';

  if (useClaude) {
    try {
      const resp = await getClient().messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      });

      if (resp.stop_reason === 'max_tokens') {
        console.warn('[PresentationStrategy] Claude hit max_tokens limit — response may be truncated');
      }

      return parseJSON(resp.content.filter(b => b.type === 'text').map(b => b.text).join(''), 'Strategy agent output', 'PresentationStrategy');
    } catch (e) {
      console.warn('[PresentationStrategy] Claude failed, using Gemini:', e.message);
    }
  }

  return parseJSON(await callGemini(`${system}\n\n${user}`, 16000), 'Strategy agent output', 'PresentationStrategy');
}

// ── Stage 4+5+6 System Prompt ─────────────────────────────────────────────────
const STRATEGY_SYSTEM_PROMPT = `You are a world-class Presentation Strategy Director and Visual Storyteller.
Your decks must match the density and visual richness of a premium government / programme evaluation report: large KPI numbers, multi-series bar charts, stacked bars, horizontal bars, donut/pie charts, dual side-by-side charts, full data tables, process frameworks, and risk matrices — NOT sparse text-only slides.

═══════════════════════════════════════════════════════════════
HARD RULES (non-negotiable — violate any and the deck is invalid)
═══════════════════════════════════════════════════════════════
1. SLIDE COUNT: Prefer QUALITY over forced count. Use exact target only when every slide has UNIQUE real content from the source. If source is thin, produce FEWER slides (never pad with empty or repeated analysis pages).
2. CONTENT MIX TARGET (HARD — non-negotiable ratios of CONTENT slides, excluding cover/agenda/summary/recommendations/thankyou):
   - ~40% TABLE slides (block-wise registers, district aggregates, condition matrices)
   - ~40% CHART slides (chart / dualChart) — EVERY chart slide MUST carry 2–4 unique insight bullets beside or under the chart
   - ~20% TEXT slides only (insights / process) — keep minimal
   - Structure slides (cover, agenda, KPI overview, summary, recommendations, thankyou) are OUTSIDE the 40/40/20 ratio
   Target among content slides: 40% tables + 40% charts + 20% text. Prefer MORE tables when multi-block RBSK sheets exist.
3. GRAPH RULES (HARD — charts always paired with unique text):
   - Maximize DISTINCT charts from every numeric column in DOCUMENT INTELLIGENCE
   - Aim for ≥1 chart per major metric family (totals, rankings, composition, completion %)
   - ≥ 1 multi-series clustered BAR when ≥3 categories exist (Expected vs Confirmed, Needed vs Done)
   - ≥ 1 horizontalBar ranking chart when ranked values exist (surgery completion % by condition)
   - ≥ 1 DONUT or PIE for composition (management mix: medical vs surgery share)
   - ≥ 1 dualChart when two related series exist
   - NEVER reuse the exact same categories+values on two slides
   - Chart slides may be chart-only for a clean look; at most 1–2 UNIQUE non-percentage insight lines if needed
   - NEVER recycle the same finding across slides; avoid percentage callouts on every chart
4. TABLE RULES (HARD — enforce 40% table slides):
   - Prefer multiple table slides over one giant table (chunk 7–10 rows each)
   - When ≥3 distinct sheets/blocks exist (RBSK), produce AT LEAST one table slide PER major block + one district aggregate table
   - ≥ 4 table slides whenever source has ≥4 sheets or ≥20 numeric rows
   - RISK slides MUST use a table: Risk Factor | Likelihood | Impact | Mitigation
   - Table slides may be table-only (full width) OR table + 1–2 UNIQUE insight bullets (never recycle findings used on chart slides)
   - Prioritise tables for: District summary, Expected vs Confirmed, Surgery completion, Management mix, and individual blocks with pending cases
5. NO empty or sparse filler slides. NEVER emit "Analysis Detail", "Supporting Detail", "Focus Metric", or "Content not available".
   Insights/recommendations: 4–7 bullets, 10–20 words each, each bullet UNIQUE across the whole deck.
6. COVER: exactly ONE cover at start. Include organization, title, period in bodyText.
   NEVER emit slideType "section".
7. Titles ≤ 8 words, insight-driven. Subtitles pose the analytical question.
8. Tables: highlightLastRow: true for totals. Keep column count ≤ 7.
9. dualChart only when two DIFFERENT related series exist; never duplicate the same chart left and right.
10. Chart titles short; series names clear and not pure percentages as names.
11. Root-cause slides: use slideType "process" with 3–5 steps from source findings PLUS bullets.
12. ALWAYS end with summary (KPI strip + takeaways) then recommendations. A neutral thank-you may follow.
13. Agenda items MUST match the actual subsequent slide topics (no orphan agenda points).
14. NO DUPLICATE content: each table, chart series, finding bullet, and KPI appears at most ONCE in the deck. Never recycle the same 2–3 findings on every slide.
15. Domain language must match the document (finance → income/expense/margin; health → cases/coverage). Never mix domains.
16. ANTI-HALLUCINATION: Every number MUST appear in DOCUMENT INTELLIGENCE or the FACT BANK. Inventing counts, rates, block names, or dates is forbidden.
17. When the user sets a slide count, hit it with VISUAL slides first (charts/tables), not text padding.
18. NEVER produce a text-only deck when numeric tables exist — charts are mandatory.

═══════════════════════════════════════════════════════════════
SLIDE TYPES (allowed)
═══════════════════════════════════════════════════════════════
- cover          — Title slide (ONLY first slide). Set organization, bodyText (period), optional presenter fields via title/subtitle.
- agenda         — Numbered programme list (optional, max 1). Bullets = section titles that appear later.
- kpi / overview — 4–6 KPI cards; optional small chart or bullets below
- chart          — Single chart + insight bullets
- dualChart      — Two charts side-by-side (chart + secondaryChart)
- table          — Full-width data table (also used for RISK MATRIX)
- insights       — Dense bullet findings; optional chart on the side
- comparison     — Two-column comparison
- process        — Cause-effect / investigation framework (processSteps + bullets)
- recommendations— 4–6 numbered concrete actions
- summary        — KPI strip + 5–6 closing bullets (NEVER empty)

FORBIDDEN: slideType "section". NEVER emit blank slides.
Chart slides: prefer clean visuals; at most 1–2 short unique non-percentage insights when useful.

═══════════════════════════════════════════════════════════════
CHART TYPE GUIDE
═══════════════════════════════════════════════════════════════
- bar            — Multi-metric by block/category (CLUSTERED)
- stackedBar     — Composition by category
- horizontalBar  — Ranked rates / dropout % 
- pie / donut    — Share of total (immunization status, source mix)
- line           — Trend over time if series exists
- dualChart      — Two related gap series side-by-side

═══════════════════════════════════════════════════════════════
JSON SCHEMA (return ONLY a raw JSON array — no markdown)
═══════════════════════════════════════════════════════════════
[
  {
    "slideIndex": number,
    "slideType": string,
    "title": string,
    "subtitle": string,
    "speakerNotes": string,
    "organization": string | null,
    "kpiCards": [{ "label": string, "value": string, "unit": string, "context": string, "trend": "up"|"down"|"stable"|null }] | null,
    "chart": {
      "chartType": "bar"|"line"|"pie"|"donut"|"stackedBar"|"horizontalBar"|"area",
      "title": string,
      "categories": string[],
      "series": [{ "name": string, "values": number[] }],
      "unit": string,
      "insight": string
    } | null,
    "secondaryChart": { "...same as chart...": true } | null,
    "table": {
      "title": string,
      "headers": string[],
      "rows": string[][],
      "highlightLastRow": boolean
    } | null,
    "bullets": string[] | null,
    "processSteps": [{ "title": string, "description": string }] | null,
    "insightHeadline": string | null,
    "bodyText": string | null,
    "callout": string | null
  }
]

═══════════════════════════════════════════════════════════════
CANONICAL STRUCTURE (adapt to available data; do not invent numbers)
═══════════════════════════════════════════════════════════════
1. cover — organization + title + period (bodyText)
2. overview / kpi — 4–6 core KPIs + short insight bullets
3. agenda — roadmap matching real slide topics
4–N. mix of chart / dualChart / table / insights / process using real data
   • Risk content → table with Likelihood | Impact | Mitigation
   • Root-cause / paradox → process steps drawn from source findings only
N-1. summary — KPI strip + 5–6 takeaways (REQUIRED, never empty)
N. recommendations — 4–6 numbered actions

FILL EVERY SLIDE. Prefer visual density of a professional district health / programme report.
NEVER output slideType "section". NEVER leave bullets null on insights/summary/recommendations.`;

/**
 * Build the compressed intelligence payload sent to the LLM.
 */
function compressIntelligence(intelligence, aggressiveness = 0) {
  const sectionLimit    = aggressiveness >= 2 ? 6  : aggressiveness === 1 ? 10 : 20;
  const insightLimit    = aggressiveness >= 2 ? 4  : aggressiveness === 1 ? 5  : 8;
  const tableLimit      = aggressiveness >= 2 ? 3  : aggressiveness === 1 ? 4  : 6;
  const tableRowLimit   = aggressiveness >= 2 ? 12 : aggressiveness === 1 ? 16 : 30;
  const chartLimit      = aggressiveness >= 2 ? 4  : aggressiveness === 1 ? 6  : 10;
  const kpiLimit        = aggressiveness >= 2 ? 10 : aggressiveness === 1 ? 16 : 20;
  const findingsLimit   = aggressiveness >= 2 ? 6  : aggressiveness === 1 ? 10 : 15;
  const recommendLimit  = aggressiveness >= 2 ? 5  : aggressiveness === 1 ? 8  : 10;
  const riskLimit       = aggressiveness >= 2 ? 4  : aggressiveness === 1 ? 6  : 8;

  return JSON.stringify({
    documentType:    intelligence.documentType,
    industry:        intelligence.industry,
    title:           intelligence.title,
    subtitle:        intelligence.subtitle,
    period:          intelligence.period,
    organization:    intelligence.organization,
    executiveSummary: intelligence.executiveSummary,
    keyFindings:     intelligence.keyFindings?.slice(0, findingsLimit),
    recommendations: intelligence.recommendations?.slice(0, recommendLimit),
    risks:           intelligence.risks?.slice(0, riskLimit),
    kpis:            intelligence.kpis?.slice(0, kpiLimit),
    sections:        intelligence.sections?.slice(0, sectionLimit).map(s => ({
      title:    s.title,
      summary:  s.summary,
      insights: s.insights?.slice(0, insightLimit),
      tables:   s.tables?.slice(0, tableLimit).map(t => ({
        title:   t.title,
        headers: t.headers,
        rows:    t.rows?.slice(0, tableRowLimit),
      })),
      charts: s.charts?.slice(0, chartLimit),
      comparisons: s.comparisons?.slice(0, 4),
      timelines: s.timelines?.slice(0, 4),
    })),
    rawMetrics: intelligence.rawMetrics || {},
  });
}

/**
 * Expand blueprint toward targetSlides using ONLY grounded source material.
 * NEVER invents filler bullets or synthetic metrics (anti-hallucination).
 * Prefer fewer accurate slides over padded invented content.
 */
function expandBlueprintToTarget(blueprint, targetSlides, intelligence) {
  if (!blueprint || !blueprint.length || !targetSlides || blueprint.length >= targetSlides) {
    return blueprint;
  }

  console.log(`[PresentationStrategy] Grounded expand: ${blueprint.length} → target ${targetSlides} (source-only material)`);
  const expanded = [...blueprint];

  const sections = intelligence?.sections || [];
  const keyFindings = (intelligence?.keyFindings || []).filter(Boolean);
  const recommendations = (intelligence?.recommendations || []).filter(Boolean);
  const risks = (intelligence?.risks || []).filter(Boolean);

  // Build candidate pool from ALL section material not already in blueprint
  const usedTitles = new Set(expanded.map(s => (s.title || '').toLowerCase().trim()));
  const usedTableKeys = new Set(
    expanded.filter(s => s.table).map(s => (s.table.headers || []).join('|').toLowerCase())
  );
  const usedChartTitles = new Set(
    expanded.filter(s => s.chart).map(s => (s.chart?.title || '').toLowerCase())
  );

  // Collect all unused slides we could add, in priority order
  const candidates = [];

  // 1) Each section: table slide(s) — split large tables into chunks of 10 rows
  for (const sec of sections) {
    for (const t of (sec.tables || [])) {
      const key = (t.headers || []).join('|').toLowerCase();
      if (!usedTableKeys.has(key) && t.rows && t.rows.length > 0) {
        const bullets = (sec.insights || []).filter(b => {
          const s = String(b || '');
          return (s.match(/,/g) || []).length < 3 && !/^TN-[A-Z]/i.test(s);
        }).slice(0, 5);
        const ROWS_PER = 8;
        const totalRows = t.rows.length;
        if (totalRows <= ROWS_PER) {
          candidates.push({
            priority: 1,
            slideType: 'table',
            title: t.title || sec.title || 'Data Table',
            subtitle: t.summary || sec.summary || '',
            insightHeadline: t.title || null,
            bullets: bullets.length ? bullets : null,
            table: { ...t, highlightLastRow: false },
          });
        } else {
          for (let start = 0; start < totalRows; start += ROWS_PER) {
            const chunk = t.rows.slice(start, start + ROWS_PER);
            const part = Math.floor(start / ROWS_PER) + 1;
            const parts = Math.ceil(totalRows / ROWS_PER);
            candidates.push({
              priority: 1,
              slideType: 'table',
              title: parts > 1
                ? `${(t.title || sec.title || 'Data').slice(0, 40)} (${part}/${parts})`
                : (t.title || sec.title || 'Data Table'),
              subtitle: `Rows ${start + 1}–${start + chunk.length} of ${totalRows}`,
              insightHeadline: t.title || null,
              bullets: part === 1 && bullets.length ? bullets : null,
              table: { headers: t.headers, rows: chunk, highlightLastRow: false },
            });
          }
        }
        usedTableKeys.add(key);
      }
    }
  }

  // 2) Each section: chart slides (one per chart)
  for (const sec of sections) {
    for (const ch of (sec.charts || [])) {
      const ck = (ch.title || '').toLowerCase();
      if (!usedChartTitles.has(ck) && ch.series && ch.series.length > 0) {
        // Derive bullets ONLY from this chart's numbers — never recycle keyFindings
        const bullets = [];
        if (ch.insight) bullets.push(String(ch.insight).slice(0, 140));
        const cats = ch.categories || [];
        const ser = ch.series || [];
        if (cats.length && ser.length) {
          for (let i = 0; i < Math.min(cats.length, 3); i++) {
            const parts = ser.map(s => `${s.name}: ${s.values?.[i] ?? '—'}`).join(', ');
            bullets.push(`${cats[i]} — ${parts}`.slice(0, 140));
          }
        }
        candidates.push({
          priority: 2,
          slideType: 'chart',
          title: ch.title || sec.title || 'Chart',
          subtitle: ch.insight || sec.summary || '',
          insightHeadline: null,
          bullets: bullets.slice(0, 4),
          chart: ch,
        });
        usedChartTitles.add(ck);
      }
    }
  }

  // 3) Dual chart — pair consecutive unused charts together
  {
    const unusedCharts = [];
    for (const sec of sections) {
      for (const ch of (sec.charts || [])) {
        const ck = (ch.title || '').toLowerCase();
        if (!usedChartTitles.has(ck) && ch.series && ch.series.length > 0) {
          unusedCharts.push({ ch, sec });
        }
      }
    }
    for (let i = 0; i + 1 < unusedCharts.length; i += 2) {
      const a = unusedCharts[i];
      const b = unusedCharts[i + 1];
      const ck1 = (a.ch.title || '').toLowerCase();
      const ck2 = (b.ch.title || '').toLowerCase();
      if (!usedChartTitles.has(ck1) && !usedChartTitles.has(ck2)) {
        const bullets = [];
        if (a.ch.insight) bullets.push(String(a.ch.insight).slice(0, 120));
        if (b.ch.insight) bullets.push(String(b.ch.insight).slice(0, 120));
        const ca = (a.ch.categories || [])[0];
        const cb = (b.ch.categories || [])[0];
        if (ca) bullets.push(`Left chart leads with ${ca}`);
        if (cb) bullets.push(`Right chart leads with ${cb}`);
        candidates.push({
          priority: 2,
          slideType: 'dualChart',
          title: `${a.ch.title || 'Analysis'} vs ${b.ch.title || 'Comparison'}`,
          subtitle: '',
          insightHeadline: a.ch.insight || null,
          bullets: bullets.length >= 2 ? bullets : null,
          chart: a.ch,
          secondaryChart: b.ch,
        });
        usedChartTitles.add(ck1);
        usedChartTitles.add(ck2);
      }
    }
  }

  // 4) Insights slide per section (section-level summary bullets)
  for (const sec of sections) {
    const bullets = (sec.insights || []).filter(Boolean).slice(0, 6);
    const secTitle = (sec.title || '').toLowerCase();
    if (bullets.length >= 3 && !usedTitles.has(secTitle)) {
      candidates.push({
        priority: 5,
        slideType: 'insights',
        title: sec.title || 'Key Findings',
        subtitle: sec.summary || '',
        insightHeadline: sec.summary ? sec.summary.slice(0, 90) : null,
        bullets,
      });
      usedTitles.add(secTitle);
    }
  }

  // 5) Key findings slide — only ONE, lowest priority after tables/charts
  if (keyFindings.length >= 4 && !expanded.some(s => /key finding|overview/i.test(s.title || ''))) {
    candidates.push({
      priority: 6,
      slideType: 'insights',
      title: 'Key Findings',
      subtitle: 'Evidence from source analysis',
      insightHeadline: null,
      bullets: keyFindings.slice(0, 7),
    });
  }

  // 6) Risks slide
  if (risks.length >= 3 && !expanded.some(s => /risk/i.test(s.title || ''))) {
    candidates.push({
      priority: 6,
      slideType: 'insights',
      title: 'Risk & Impact Assessment',
      subtitle: 'Risks identified in source analysis',
      insightHeadline: 'Documented risk factors',
      bullets: risks.slice(0, 6).map(r => (typeof r === 'string' ? r : `${r.title || 'Risk'}: ${r.description || ''}`)),
    });
  }

  // 7) Recommendations slide (if not already in blueprint)
  if (recommendations.length >= 3 && !expanded.some(s => /action plan|recommend/i.test(s.title || ''))) {
    candidates.push({
      priority: 5,
      slideType: 'recommendations',
      title: 'Recommended Actions',
      subtitle: 'Actions derived from source findings',
      insightHeadline: 'Priority actions',
      bullets: recommendations.slice(0, 6),
    });
  }

  // 8) Split dense bullet slides
  for (const s of expanded) {
    if ((s.bullets || []).length >= 5) {
      const half = Math.ceil(s.bullets.length / 2);
      const part2 = s.bullets.slice(half);
      if (part2.length >= 2 && (s.bullets.length - part2.length) >= 2) {
        candidates.push({
          priority: 6,
          _splitSource: s,
          _splitHalf: half,
          slideType: s.slideType || 'insights',
          title: `${String(s.title || 'Analysis').replace(/\s*\(cont\.\)\s*$/i, '')} — continued`,
          subtitle: s.subtitle || '',
          insightHeadline: null,
          bullets: part2,
        });
      }
    }
  }

  // 9) One chart per remaining unused chart (each with insight bullets)
  // usedChartTitles already declared above — refresh from current expanded
  for (const s of expanded) {
    if (s.chart && s.chart.title) usedChartTitles.add(String(s.chart.title).toLowerCase());
  }
  for (const sec of sections) {
    for (const ch of (sec.charts || [])) {
      const ck = (ch.title || '').toLowerCase();
      if (!ck || usedChartTitles.has(ck)) continue;
      if (!(ch.series && ch.series.length)) continue;
      const bullets = [
        ch.insight || null,
        ...(sec.insights || []),
        ...(keyFindings || []),
      ].filter(Boolean).map(String).slice(0, 4);
      candidates.push({
        priority: 1,
        slideType: 'chart',
        title: ch.title || sec.title || 'Data view',
        subtitle: '',
        insightHeadline: ch.insight ? String(ch.insight).slice(0, 90) : null,
        bullets: bullets.length ? bullets : [
          `Source metric: ${ch.title}`,
          'Figures drawn from the uploaded document only.',
        ],
        chart: ch,
      });
      usedChartTitles.add(ck);
    }
  }

  // 10) KPI focus slides — one metric group per slide to hit exact counts
  const kpis = (intelligence?.kpis || []).filter(Boolean);
  if (kpis.length >= 2) {
    const maxPerSlide = 4;
    const numSlides = Math.ceil(kpis.length / maxPerSlide);
    const groups = [];
    let start = 0;
    for (let i = 0; i < numSlides; i++) {
      const remainingSlides = numSlides - i;
      const remainingKpis = kpis.length - start;
      const size = Math.ceil(remainingKpis / remainingSlides);
      groups.push(kpis.slice(start, start + size));
      start += size;
    }
    groups.forEach((group) => {
      if (!group.length) return;
      const title = group.length === 1
        ? String(group[0].label || 'Key metric')
        : `Metrics focus: ${group.map(k => k.label).filter(Boolean).slice(0, 2).join(' & ')}`;
      if (expanded.some(s => String(s.title || '').toLowerCase() === title.toLowerCase())) return;
      candidates.push({
        priority: 7,
        slideType: 'kpi',
        title: title.slice(0, 60),
        subtitle: 'Selected indicators from source data',
        kpiCards: group.map(k => ({
          label: k.label, value: k.value, unit: k.unit || '', context: k.context || '', trend: k.trend || null,
        })),
        bullets: group.map(k => `${k.label}: ${k.value}${k.unit ? ' ' + k.unit : ''}${k.context ? ' — ' + k.context : ''}`).slice(0, 4),
      });
    });
  }

  // Sort candidates by priority, then insert until EXACT target is reached
  candidates.sort((a, b) => a.priority - b.priority);

  let insertPos = Math.max(1, expanded.length - 2);
  for (const cand of candidates) {
    if (expanded.length >= targetSlides) break;
    const { priority: _p, _splitSource, _splitHalf, ...slide } = cand;
    if (_splitSource && _splitHalf) {
      _splitSource.bullets = _splitSource.bullets.slice(0, _splitHalf);
    }
    // Skip if title already present
    const tKey = String(slide.title || '').toLowerCase().trim();
    if (tKey && expanded.some(s => String(s.title || '').toLowerCase().trim() === tKey)) continue;
    expanded.splice(insertPos, 0, slide);
    insertPos = Math.min(expanded.length - 1, insertPos + 1);
  }

  // Do NOT pad with recycled keyFindings — that caused identical bullets on slides 6–10.
  // Prefer stopping under target rather than repeating the same 2–3 findings.

  if (expanded.length < targetSlides) {
    console.warn(`[PresentationStrategy] Stopping expand at ${expanded.length}/${targetSlides} — no more grounded source material`);
  } else if (expanded.length > targetSlides) {
    // Trim only non-structural trailing duplicates to hit exact count
    while (expanded.length > targetSlides) {
      const idx = expanded.length - 2;
      if (idx <= 1) break;
      const t = String(expanded[idx].slideType || '');
      if (['cover', 'agenda', 'summary', 'recommendations', 'thankyou', 'closing'].includes(t)) break;
      expanded.splice(idx, 1);
    }
  }

  expanded.forEach((s, idx) => { s.slideIndex = idx + 1; });
  console.log(`[PresentationStrategy] Grounded expand complete: ${expanded.length} slides`);
  return expanded;
}

/**
 * Run Stages 4-6: Generate complete presentation blueprint from DocumentIntelligence.
 */

/**
 * Enforce ~40% tables / ~40% charts / ~20% text among content slides.
 * Inject unused tables from intelligence; strip cross-slide repeated bullets.
 */
function rebalanceTablesChartsAndBullets(blueprint, intelligence) {
  if (!Array.isArray(blueprint) || !blueprint.length) return blueprint;
  const STRUCT = new Set(['cover', 'agenda', 'summary', 'recommendations', 'thankyou', 'closing', 'conclusion']);
  const out = blueprint.map(s => ({ ...s, bullets: Array.isArray(s.bullets) ? [...s.bullets] : s.bullets }));

  // 1) Global unique bullets (except summary/recs/closing)
  const seen = new Set();
  for (const s of out) {
    const t = String(s.slideType || '').toLowerCase();
    const mayRestate = STRUCT.has(t) || /summary|recommend|thank|closing|conclusion/i.test(s.title || '');
    if (!Array.isArray(s.bullets)) continue;
    if (mayRestate) {
      for (const b of s.bullets) {
        const k = String(b || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);
        if (k) seen.add(k);
      }
      continue;
    }
    const kept = [];
    for (const b of s.bullets) {
      const k = String(b || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);
      if (!k) continue;
      let dup = seen.has(k);
      if (!dup) {
        const head = k.slice(0, 48);
        for (const prev of seen) {
          if (prev.startsWith(head) || head.startsWith(prev.slice(0, 48))) { dup = true; break; }
        }
      }
      if (dup) continue;
      seen.add(k);
      kept.push(b);
    }
    s.bullets = kept;
  }

  // 2) Collect unused tables from intelligence
  const usedTableKeys = new Set(
    out.filter(s => s.table && s.table.headers)
      .map(s => (s.table.headers || []).join('|').toLowerCase() + '::' + (s.table.rows || []).length)
  );
  const unusedTables = [];
  for (const sec of (intelligence?.sections || [])) {
    for (const t of (sec.tables || [])) {
      if (!t || !t.headers || !t.rows || !t.rows.length) continue;
      const key = (t.headers || []).join('|').toLowerCase() + '::' + (t.rows || []).length;
      if (usedTableKeys.has(key)) continue;
      usedTableKeys.add(key);
      unusedTables.push(t);
    }
  }

  // 3) Count content mix
  const content = out.filter(s => !STRUCT.has(String(s.slideType || '').toLowerCase()));
  const tableN = content.filter(s => s.slideType === 'table' || s.table).length;
  const chartN = content.filter(s => s.chart || s.secondaryChart || s.slideType === 'chart' || s.slideType === 'dualChart').length;
  const targetTable = Math.max(4, Math.round(content.length * 0.40));

  // 4) Inject table slides before the closing block if under quota
  if (tableN < targetTable && unusedTables.length) {
    const insertAt = Math.max(1, out.findIndex(s => {
      const t = String(s.slideType || '').toLowerCase();
      return t === 'summary' || t === 'recommendations' || t === 'conclusion' || t === 'thankyou' || t === 'closing';
    }));
    const need = Math.min(unusedTables.length, targetTable - tableN);
    const injected = [];
    for (let i = 0; i < need; i++) {
      const t = unusedTables[i];
      injected.push({
        slideType: 'table',
        title: (t.title || 'Block performance').slice(0, 60),
        subtitle: t.summary || 'Source register',
        insightHeadline: null,
        bullets: [],
        table: { headers: t.headers, rows: (t.rows || []).slice(0, 10), highlightLastRow: false },
      });
    }
    if (insertAt > 0) out.splice(insertAt, 0, ...injected);
    else out.push(...injected);
    console.log(`[PresentationStrategy] Rebalance: injected ${injected.length} table slide(s) (had ${tableN}, target ${targetTable})`);
  }

  // 4b) Table slides: NEVER show bullets under the table (clean professional look)
  for (const s of out) {
    if (s.slideType === 'table' || (s.table && !s.chart)) {
      s.bullets = [];
      s.insightHeadline = null;
    }
  }
  // Chart slides: strip recycled percentage findings for a cleaner look
  for (const s of out) {
    if (!(s.chart || s.secondaryChart) || !Array.isArray(s.bullets)) continue;
    s.bullets = (s.bullets || []).filter(b => {
      const t = String(b || '');
      if (/%/.test(t) && /preterm|birth weight|elbw|lbw|of the register|recorded birth/i.test(t)) return false;
      return true;
    }).slice(0, 2);
  }

  // 5) For chart slides with empty bullets, derive from series
  for (const s of out) {
    if (!(s.chart && s.chart.series) || (s.bullets && s.bullets.length)) continue;
    const bullets = [];
    if (s.chart.insight) bullets.push(String(s.chart.insight).slice(0, 130));
    const cats = s.chart.categories || [];
    const ser = s.chart.series || [];
    for (let i = 0; i < Math.min(cats.length, 3); i++) {
      const parts = ser.map(x => `${x.name}: ${x.values?.[i] ?? '—'}`).join(', ');
      const line = `${cats[i]} — ${parts}`.slice(0, 130);
      const k = line.toLowerCase().slice(0, 80);
      if (seen.has(k)) continue;
      seen.add(k);
      bullets.push(line);
    }
    s.bullets = bullets.slice(0, 4);
  }

  out.forEach((s, i) => { s.slideIndex = i + 1; });
  return out;
}


async function buildPresentationStrategy(intelligence, options = {}) {
  const {
    purpose = 'executive briefing',
    audience = 'senior management',
    slideCountHint = null,
    language = 'English',
    focusAreas = [],
    genPrefs = {},
  } = options;
  const prefs = { ...(intelligence._genPrefs || {}), ...genPrefs };

  console.log('[PresentationStrategy] Stages 4-6: Building slide blueprint...');

  let targetSlides = null;
  if (slideCountHint != null && String(slideCountHint).trim() !== '') {
    const n = parseInt(slideCountHint, 10);
    if (!isNaN(n) && n > 0) targetSlides = Math.min(35, Math.max(6, n));
  }

  // Prefer fewer slides when intelligence came from fallback or domain is thin
  const isFallback = !!(intelligence && intelligence._fallback);
  const isFinanceDoc = /finance|bank|statement|debit|credit/i.test(
    (intelligence?.documentType || '') + ' ' + (intelligence?.industry || '') + ' ' + (intelligence?.domain || '') + ' ' + (intelligence?.title || '')
  );
  const isHealthDoc = /health|epidemiolog|surveil|immun|measles|phc|vaccine/i.test(
    (intelligence?.documentType || '') + ' ' + (intelligence?.industry || '') + ' ' + (intelligence?.domain || '') + ' ' + (intelligence?.title || '')
  );
  const defaultMax = (isFallback || isFinanceDoc || isHealthDoc) ? 12 : 16;
  const attempts = [
    { aggressiveness: 0, maxSlides: targetSlides || defaultMax },
    { aggressiveness: 1, maxSlides: targetSlides || defaultMax },
    { aggressiveness: 2, maxSlides: targetSlides || Math.min(12, defaultMax) },
  ];

  let lastError = null;

  for (let attempt = 0; attempt < attempts.length; attempt++) {
    const { aggressiveness, maxSlides } = attempts[attempt];

    if (attempt > 0) {
      console.warn(`[PresentationStrategy] Retry ${attempt} with compression level ${aggressiveness}`);
    }

    const compressedIntelligence = compressIntelligence(intelligence, aggressiveness);

    const slideCountInstruction = targetSlides
      ? `HARD TARGET: EXACTLY ${targetSlides} slides (±1 max). CONTENT MIX: ~40% TABLE slides + ~40% CHART slides (each chart WITH 2–4 unique insight bullets) + ~20% text. Use EVERY table and chart from DOCUMENT INTELLIGENCE. Prefer block-level TABLE slides for multi-block RBSK data. Do NOT invent numbers. NEVER recycle the same finding bullet on multiple slides.`
      : (isFallback || isFinanceDoc || isHealthDoc)
        ? `Target about ${maxSlides} slides. VISUAL-FIRST (~70% charts/tables). Prefer 10–16 dense visual slides. NEVER dump raw CSV rows as bullets.`
        : `Target about ${maxSlides} slides. Prefer 12–18 visual-heavy slides. Charts and tables first, text second.`;

    // RAG-lite: inject grounded fact bank into strategy prompt
    let factBlock = '';
    try {
      const { formatFactBankForPrompt } = require('./factGrounding');
      if (intelligence._factBank) {
        factBlock = formatFactBankForPrompt(intelligence._factBank);
      }
    } catch (_) { /* factGrounding optional at runtime */ }

    const chartTypeLine = (prefs.preferredChartTypes && prefs.preferredChartTypes.length)
      ? prefs.preferredChartTypes.join(', ')
      : 'bar, pie/donut, line, stackedBar as data supports';
    const densityLine = prefs.chartDensity === 'heavy'
      ? 'HEAVY charts — maximise chart slides (prefer chart over pure bullet when data exists)'
      : prefs.chartDensity === 'minimal'
        ? 'MINIMAL charts — only 1–3 essential charts; prefer tables and bullets'
        : 'BALANCED charts — mix KPI cards, charts, and tables evenly';
    const narrativeLine = prefs.narrativeStyle === 'detailed'
      ? 'DETAILED narrative — denser bullets, more context per slide'
      : prefs.narrativeStyle === 'data-heavy'
        ? 'DATA-HEAVY — prioritise numbers, tables, charts; minimal prose'
        : 'EXECUTIVE narrative — concise insight-driven bullets (10–18 words)';
    const structureFlags = [
      prefs.includeAgenda === false ? 'OMIT agenda slide' : 'INCLUDE agenda',
      prefs.includeKpiOverview === false ? 'OMIT KPI overview' : 'INCLUDE KPI overview',
      prefs.includeProcessSlides === false ? 'OMIT process/flow slides' : 'INCLUDE process slides when root-cause data exists',
      prefs.includeComparisonSlides === false ? 'OMIT comparison slides' : 'INCLUDE comparison slides when paired metrics exist',
      prefs.includeSummarySlide === false ? 'OMIT summary takeaways slide' : 'INCLUDE summary takeaways before recommendations',
      prefs.includeRecommendationsSlide === false ? 'OMIT recommendations slide' : 'INCLUDE recommendations before thank-you',
    ].join('; ');

    const userPrompt = `PRESENTATION PREFERENCES:
- Purpose: ${purpose}
- Target Audience: ${audience}
- Language: ${language}
- Slide count: ${slideCountInstruction}
- Focus areas: ${focusAreas.length ? focusAreas.join(', ') : 'all topics equally — prioritise tables, multi-series charts, detection gaps, category breakdowns, and completion status'}
- Preferred chart types: ${chartTypeLine}
- Chart density: ${densityLine}
- Narrative style: ${narrativeLine}
- Structure flags: ${structureFlags}
- Visual emphasis: ${prefs.visualEmphasis || 'balanced'}

${factBlock}

ANTI-HALLUCINATION RULES (violating any invalidates the deck):
1. ONLY use numbers, %, dates, and entity names that appear in DOCUMENT INTELLIGENCE or the FACT BANK above.
2. NEVER invent statistics, case counts, percentages, household totals, or lab results.
3. NEVER write filler bullets ("comprehensive evaluation", "key benchmarks established", "ongoing monitoring").
4. NEVER dump raw CSV rows or case-register lines as bullets — use structured tables/charts instead.
5. Chart series values and table cells must match intelligence tables/charts exactly.
6. KPI card values must match intelligence.kpis exactly.
7. When a HARD TARGET slide count is set, exhaust every table, chart, and KPI in intelligence before stopping under target.

MANDATORY OUTPUT CHECKLIST:
□ Hit the HARD TARGET slide count when given (use all tables/charts; split large tables)
□ CONTENT MIX: ~40% table slides + ~40% chart slides (with unique text) + ~20% pure text among content slides
□ ≥ 1 multi-series bar + ≥ 1 donut/pie + ≥ 1 horizontalBar when data supports it
□ ≥ 4 table slides when multi-block RBSK sheets exist
□ ≥ 1 KPI slide when intelligence.kpis has entries
□ Insights/recommendations: only bullets supported by source findings (no CSV dumps); NO repeated bullets across slides
□ Exactly ONE cover slide; ZERO section divider slides

RBSK / CHILD HEALTH SPECIAL RULES (when document contains Expected vs Confirmed / disease conditions):
- Lead with district-level KPIs (Expected, Confirmed, Detection Rate, Surgery Completion).
- HARD TABLE QUOTA: create separate TABLE slides for (1) District surgical outcomes (2) Expected vs Confirmed (3) Management mix (4) at least 2–3 individual blocks with pending/low completion (e.g. K.V.Kuppam Cleft 50%, Vellore Corp CHD pending).
- Prioritise the LARGEST detection gaps (Cong. Deafness, NTD) as early CHART + unique insight bullets (bullets must cite the gap numbers, not generic praise).
- Always include at least one Expected-vs-Confirmed clustered bar AND one Surgery Done vs Needed bar.
- Surgery completion: horizontalBar ranked %; flag residual pending (CHD 3 pending, Cleft 2 pending).
- NEVER paste the same sentence about "Rheumatic Heart Disease 100%" or "Cleft Lip 97.4%" on more than one slide.
- Keep KPI card labels SHORT (≤28 chars): e.g. "CHD Expected", "Deafness Detected", "Surgery Completion".
- Agenda must list every major content slide topic (not just first 6).
- Content mix among non-structure slides MUST be ~40% tables, ~40% charts (with text), ~20% pure text.

CRITICAL: Output ONLY the raw JSON array. No markdown, no explanation, no code fences. The response must start with [ and end with ].
NEVER use slideType "section".

DOCUMENT INTELLIGENCE JSON:
${compressedIntelligence}

Generate the presentation blueprint now using ONLY grounded source facts.`;

    try {
      let blueprint = await callLLMForJSON(STRATEGY_SYSTEM_PROMPT, userPrompt);

      if (!Array.isArray(blueprint)) {
        throw new Error('Strategy agent returned non-array blueprint');
      }

      // Post-process: strip forbidden section slides, ensure single cover
      blueprint = blueprint.filter(s => s.slideType !== 'section');
      let coverSeen = false;
      blueprint = blueprint.filter(s => {
        if (s.slideType === 'cover') {
          if (coverSeen) return false;
          coverSeen = true;
        }
        return true;
      });
      // Ensure first slide is cover if we have one
      const coverIdx = blueprint.findIndex(s => s.slideType === 'cover');
      if (coverIdx > 0) {
        const [c] = blueprint.splice(coverIdx, 1);
        blueprint.unshift(c);
      }

      // Soft length guards so renderer never overflows boxes
      const clip = (s, n) => {
        if (!s || typeof s !== 'string') return s;
        return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…';
      };
      blueprint.forEach((slide, i) => {
        slide.slideIndex = i + 1;
        slide.title = clip(slide.title, 72);
        slide.subtitle = clip(slide.subtitle, 100);
        slide.insightHeadline = clip(slide.insightHeadline, 95);
        if (Array.isArray(slide.bullets)) {
          slide.bullets = slide.bullets.slice(0, 8).map(b => clip(String(b), 220));
        }
        if (Array.isArray(slide.kpiCards)) {
          slide.kpiCards = slide.kpiCards.slice(0, 6).map(c => ({
            ...c,
            label: clip(c.label, 28),
            value: clip(String(c.value ?? ''), 16),
            context: clip(c.context, 42),
          }));
        }
      });

      // Retry if LLM returned drastically fewer than target (< 55%) AND it's not attempt 2
      // (attempt 2 = max compression, we always proceed to expand from there)
      if (targetSlides && blueprint.length < Math.floor(targetSlides * 0.55) && attempt < attempts.length - 1) {
        console.warn(`[PresentationStrategy] LLM produced ${blueprint.length} slides, short of target ${targetSlides}. Retrying...`);
        continue;
      }

      // Always expand toward exact user target when provided.
      // expandBlueprintToTarget only uses grounded KPIs/charts/findings/tables — never empty shells.
      if (targetSlides && blueprint.length !== targetSlides) {
        blueprint = expandBlueprintToTarget(blueprint, targetSlides, intelligence);
      }

      // RAG grounding pass: strip ungrounded numbers and filler language
      try {
        const { groundBlueprint } = require('./factGrounding');
        if (intelligence._factBank) {
          const { blueprint: groundedBp, report: gReport } = groundBlueprint(
            blueprint,
            intelligence._factBank,
            intelligence
          );
          blueprint = groundedBp;
          if (gReport.stripped > 0 || gReport.warnings.length > 0) {
            console.warn(
              `[PresentationStrategy] Grounding: stripped=${gReport.stripped}, warnings=${gReport.warnings.length}, slidesTouched=${gReport.slidesTouched}`
            );
          }
        }
      } catch (gErr) {
        console.warn('[PresentationStrategy] Grounding pass skipped:', gErr.message);
      }

      // Deduplicate: drop later slides that repeat the same table headers or near-identical titles
      {
        const seenTitles = new Set();
        const seenTableKeys = new Set();
        let agendaSeen = false;
        blueprint = blueprint.filter((s, idx) => {
          if (idx === 0) return true; // keep cover
          const t = String(s.title || '').toLowerCase().replace(/\s*\(cont\.?\)\s*/g, '').trim();
          if (s.slideType === 'agenda') {
            if (agendaSeen) return false;
            agendaSeen = true;
            return true;
          }
          if (s.table && Array.isArray(s.table.headers)) {
            const key = s.table.headers.join('|').toLowerCase() + '::' +
              (s.table.rows || []).slice(0, 3).map(r => (r || []).join(',')).join(';');
            if (seenTableKeys.has(key)) {
              console.warn(`[PresentationStrategy] Dropping duplicate table slide: ${s.title}`);
              return false;
            }
            seenTableKeys.add(key);
          }
          if (t && seenTitles.has(t) && !/summary|recommend|conclusion|thank/i.test(t)) {
            const isContinuation = /\bcont\b|\bcont\.|part|\(\d+\/\d+\)/i.test(s.title) ||
                                  (s.table && blueprint.slice(0, idx).some(prev => prev.table && String(prev.title || '').toLowerCase().replace(/\s*\(cont\.?\)\s*/g, '').trim() === t));
            if (!isContinuation) {
              console.warn(`[PresentationStrategy] Dropping duplicate title slide: ${s.title}`);
              return false;
            }
          }
          if (t) seenTitles.add(t);
          return true;
        });
        blueprint.forEach((s, i) => { s.slideIndex = i + 1; });
      }

      // ── Ensure Summary + Recommendations sit immediately before Thank You ──
      // Pull any existing recommendations/summary out, rebuild closing sequence.
      const isClosingSlide = (s) =>
        ['conclusion', 'thankyou', 'closing'].includes(s.slideType)
        || /thank\s*you|questions\b/i.test(s.title || '');
      const isRecSlide = (s) =>
        s.slideType === 'recommendations' || s.slideType === 'actions'
        || /^recommend/i.test(s.title || '');
      const isSummarySlide = (s) =>
        s.slideType === 'summary'
        || /^(executive\s+)?summary|key\s+takeaways|closing\s+summary/i.test(s.title || '');

      // Remove existing closing / rec / trailing summary so we can re-append in order
      const contentSlides = blueprint.filter(s => !isClosingSlide(s) && !isRecSlide(s));
      // Keep non-trailing summary slides that are mid-deck; only strip if last few
      // (already filtered recs). We'll always inject a dedicated recs slide at the end.

      const recs = (intelligence.recommendations || []).filter(Boolean);
      const findings = (intelligence.keyFindings || []).filter(Boolean);
      const kpis = (intelligence.kpis || []).filter(Boolean);

      // Prefer existing recommendations bullets from blueprint if richer
      const existingRec = blueprint.find(isRecSlide);
      let recBullets = (existingRec?.bullets && existingRec.bullets.length)
        ? existingRec.bullets.slice(0, 6)
        : recs.slice(0, 6).map(String);
      if (!recBullets.length && findings.length) {
        // Convert findings into action-oriented bullets — do not just restate the finding
        recBullets = findings.slice(0, 4).map((f, i) => {
          const s = String(f).slice(0, 120);
          if (/deaf|hearing/i.test(s)) return `Scale newborn hearing screening where detection lags expected prevalence.`;
          if (/\bntd\b|neural/i.test(s)) return `Strengthen NTD prevention (folate) and referral tracking.`;
          if (/detect|confirm|expected|0\.0%|screening/i.test(s)) return `Close detection gap: ${s}`;
          if (/surg|99%|completion/i.test(s)) return `Sustain surgical completion and clear residual pending cases.`;
          return `Operational priority ${i + 1}: ${s}`;
        });
      }
      if (!recBullets.length) {
        // Domain-aware defaults from findings — never invent geography (Gudiyatham etc.)
        if (findings.length) {
          recBullets = findings.slice(0, 4).map((f, i) => {
            const s = String(f).slice(0, 140);
            if (/preterm|gestation|birth weight|lbw/i.test(s))
              return `Strengthen preterm and low-birth-weight care pathways: ${s.slice(0, 100)}`;
            if (/detect|confirm|expected|screening|gap/i.test(s))
              return `Close the screening gap: ${s.slice(0, 110)}`;
            if (/surg|pending|due for/i.test(s))
              return `Clear surgical backlog and track pending cases: ${s.slice(0, 100)}`;
            return `Act on finding ${i + 1}: ${s}`;
          });
        } else {
          recBullets = [
            'Validate critical cases in the source register against clinical records.',
            'Prioritise follow-up on the highest-risk groups identified in the analysis.',
            'Assign unit-level ownership for data quality and outcome tracking.',
            'Schedule a periodic review of line-list completeness and coding accuracy.',
          ];
        }
      }

      // Optional summary slide (KPI strip + takeaways) just before recommendations
      const hasMidSummary = contentSlides.some(isSummarySlide);
      const summaryBullets = [
        ...(findings.slice(0, 3).map(String)),
        ...(kpis.slice(0, 3).map(k => `${k.label}: ${k.value}${k.unit ? ' ' + k.unit : ''}`)),
      ].filter(Boolean).slice(0, 6);

      blueprint = contentSlides;

      if (prefs.includeSummarySlide !== false && !hasMidSummary && summaryBullets.length >= 3) {
        blueprint.push({
          slideIndex: blueprint.length + 1,
          slideType: 'summary',
          title: 'Executive Summary & Takeaways',
          subtitle: intelligence.title || 'Key results at a glance',
          insightHeadline: intelligence.executiveSummary
            ? String(intelligence.executiveSummary).slice(0, 140)
            : 'Priority takeaways from the source document',
          bullets: summaryBullets,
          _kpiCards: kpis.slice(0, 4).map(k => ({
            label: k.label, value: k.value, unit: k.unit || '', trend: k.trend || null,
          })),
        });
      }

      // Recommendations slide (Summary & Next Steps style) — unless user disabled
      if (prefs.includeRecommendationsSlide === false) {
        // skip recommendations
      } else blueprint.push({
        slideIndex: blueprint.length + 1,
        slideType: 'recommendations',
        title: 'Recommendations',
        subtitle: intelligence.executiveSummary
          ? String(intelligence.executiveSummary).slice(0, 160)
          : (intelligence.title
            ? `Priority actions derived from ${intelligence.title}`
            : 'Priority actions derived from the source document analysis'),
        insightHeadline: 'Summary & Next Steps',
        bullets: recBullets,
        processSteps: recBullets.map((b, i) => {
          const text = String(b);
          const split = text.match(/^(.{8,70}?)(?:\s*[:—–-]\s+|\.\s+)(.+)$/);
          if (split) return { stepNumber: i + 1, title: split[1].replace(/^\*\*|\*\*$/g, '').trim(), description: split[2].trim() };
          const words = text.split(/\s+/);
          if (words.length > 10) {
            return { stepNumber: i + 1, title: words.slice(0, 6).join(' '), description: words.slice(6).join(' ') };
          }
          return { stepNumber: i + 1, title: text.slice(0, 80), description: '' };
        }),
      });

      // Thank You always last
      const srcFile = intelligence._meta?.filename || intelligence.title || 'Source document';
      const closeBullets = [
        `Data Source: ${srcFile}`,
        `Audience: ${audience || 'Senior Management'}`,
      ];
      if (recs[0]) closeBullets.splice(1, 0, String(recs[0]).slice(0, 140));

      blueprint.push({
        slideIndex: blueprint.length + 1,
        slideType: 'conclusion',
        title: 'Thank You',
        subtitle: intelligence.title || 'Performance Evaluation Report',
        insightHeadline: 'Questions & Discussion',
        bullets: closeBullets,
      });
      blueprint.forEach((s, i) => { s.slideIndex = i + 1; });
      blueprint = rebalanceTablesChartsAndBullets(blueprint, intelligence);
      blueprint.forEach((s, i) => { s.slideIndex = i + 1; });

      console.log(`[PresentationStrategy] Blueprint complete: ${blueprint.length} slides planned (attempt ${attempt + 1})`);
      return blueprint;

    } catch (err) {
      lastError = err;
      console.warn(`[PresentationStrategy] Attempt ${attempt + 1} failed: ${err.message}`);
    }
  }

  throw new Error(`Presentation blueprint generation failed after ${attempts.length} attempts: ${lastError?.message}`);
}

module.exports = { buildPresentationStrategy };


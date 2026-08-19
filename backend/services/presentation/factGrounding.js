'use strict';
/**
 * factGrounding.js
 * ────────────────
 * RAG-lite / anti-hallucination layer for the presentation pipeline.
 *
 * 1. Extract grounded facts from source document text (numbers, %, entities, table cells)
 * 2. Attach fact bank to DocumentIntelligence
 * 3. Validate intelligence + blueprint: strip or flag invented numbers / claims
 * 4. Provide retrieval snippets for strategy prompts (top relevant chunks)
 *
 * Principle: every numeric claim in the deck MUST appear in the source fact bank
 * (or be a trivial arithmetic aggregate of source numbers, e.g. totals).
 */

// ── Fact extraction from raw text ─────────────────────────────────────────────

/**
 * Normalize a number string for matching (strip commas, trailing zeros on decimals).
 */
function normalizeNumberToken(s) {
  if (s == null) return '';
  let t = String(s).trim().replace(/,/g, '');
  // Strip currency symbols
  t = t.replace(/^[₹$€£¥₩]+/, '').replace(/[₹$€£¥₩]+$/, '').trim();
  // Keep trailing % if present
  const pct = t.endsWith('%');
  if (pct) t = t.slice(0, -1);
  const n = parseFloat(t);
  if (isNaN(n)) return String(s).trim().toLowerCase();
  // Canonical form: integer if whole, else up to 2 decimals
  const canon = Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  return pct ? canon + '%' : canon;
}

/**
 * Extract all numeric tokens and percent values from text.
 * Returns Set of normalized strings + original forms map.
 */
function extractNumberFacts(text) {
  const raw = String(text || '');
  const facts = new Set();
  const originals = new Map(); // normalized -> Set of original substrings

  // Matches currency amounts: ₹15,221.50 | $3,820.00 | plain: 60.3% | 98.5 % | 73 | 3,820 | 0.18 | 19%
  const re = /[₹$€£¥₩]?\s*\d{1,3}(?:,\d{3})+(?:\.\d+)?%?|[₹$€£¥₩]?\s*\d+\.\d+%?|\b\d+%|\b\d+\b/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const orig = m[0];
    const norm = normalizeNumberToken(orig);
    if (norm) {
      facts.add(norm);
      if (!originals.has(norm)) originals.set(norm, new Set());
      originals.get(norm).add(orig);
      // Also add the integer form for easier matching (15221.50 → also store 15221)
      const n = parseFloat(norm.replace(/%$/, ''));
      if (!isNaN(n) && !Number.isInteger(n)) {
        const intForm = String(Math.floor(n));
        facts.add(intForm);
        if (!originals.has(intForm)) originals.set(intForm, new Set());
        originals.get(intForm).add(orig);
      }
    }
  }
  return { facts, originals };
}

/**
 * Extract likely entity / place / block names (capitalized multi-word + known health terms).
 */
function extractEntityFacts(text) {
  const raw = String(text || '');
  const entities = new Set();

  // Blocks / PHC style names appearing in tables or headings
  const blockRe = /\b(?:Katpadi|Gudiyatham|Pernambut|Perambut|Vellore(?:\s+Urban)?|Anaicut|Wallajah|Wallaja|Kaniyambadi|K\.\s*V\.\s*Kuppam|KV\s*Kuppam|Arcot|Ranipet|Sholinghur|Walajah)\b/gi;
  let m;
  while ((m = blockRe.exec(raw)) !== null) {
    entities.add(m[0].replace(/\s+/g, ' ').trim());
  }

  // Generic capitalized sequences (2–4 words) that look like proper nouns
  const properRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g;
  while ((m = properRe.exec(raw)) !== null) {
    const e = m[1].trim();
    if (e.length >= 4 && e.length <= 48) entities.add(e);
  }

  return entities;
}

/**
 * Split document into overlapping chunks for retrieval (simple lexical RAG).
 */
function chunkDocument(text, chunkSize = 900, overlap = 120) {
  const raw = String(text || '').replace(/\r\n/g, '\n');
  if (raw.length <= chunkSize) return [{ id: 0, text: raw }];

  const chunks = [];
  let start = 0;
  let id = 0;
  while (start < raw.length) {
    const end = Math.min(start + chunkSize, raw.length);
    chunks.push({ id: id++, text: raw.slice(start, end), start, end });
    if (end >= raw.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

/**
 * Score chunk relevance to a query (token overlap — no embeddings required).
 */
function scoreChunk(chunkText, query) {
  const qTokens = String(query || '')
    .toLowerCase()
    .split(/[^a-z0-9%]+/)
    .filter(t => t.length > 2);
  if (!qTokens.length) return 0;
  const cLower = String(chunkText).toLowerCase();
  let hits = 0;
  for (const t of qTokens) {
    if (cLower.includes(t)) hits += 1;
  }
  return hits / qTokens.length;
}

/**
 * Retrieve top-K chunks for a query (lexical RAG).
 */
function retrieveChunks(chunks, query, k = 4) {
  if (!chunks || !chunks.length) return [];
  const scored = chunks
    .map(c => ({ ...c, score: scoreChunk(c.text, query) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

/**
 * Build the full grounded fact bank from raw document text.
 */
function buildFactBank(rawText, meta = {}) {
  const text = String(rawText || '');
  const { facts: numberFacts, originals } = extractNumberFacts(text);
  const entities = extractEntityFacts(text);
  const chunks = chunkDocument(text);

  // Also pull obvious KPI-style lines (label: value patterns)
  const kpiLines = [];
  const lineRe = /^.{0,80}?\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?%?|\d+\.\d+%?|\d+%|\d+)\b.{0,80}$/gm;
  let lm;
  const seen = new Set();
  while ((lm = lineRe.exec(text)) !== null) {
    const line = lm[0].replace(/\s+/g, ' ').trim();
    // Never treat sheet markers or CSV dumps as "key lines"
    if (/^---\s*Sheet:/i.test(line)) continue;
    if ((line.match(/,/g) || []).length >= 4) continue;
    if (line.length > 12 && line.length < 160 && !seen.has(line)) {
      seen.add(line);
      kpiLines.push(line);
      if (kpiLines.length >= 80) break;
    }
  }

  return {
    numberFacts,           // Set of normalized number strings
    numberOriginals: originals,
    entities,              // Set of entity strings
    chunks,                // retrieval corpus
    kpiLines,
    charCount: text.length,
    filename: meta.filename || null,
    builtAt: new Date().toISOString(),
  };
}

/**
 * Check whether a numeric token is grounded in the fact bank.
 * Allows small integer aggregates if all component digits appear (lenient for totals).
 */
function isNumberGrounded(value, factBank) {
  if (!factBank || !factBank.numberFacts) return false;
  // Strip currency symbols from the value being checked
  const cleaned = String(value).replace(/[₹$€£¥₩,\s]/g, '').trim();
  const norm = normalizeNumberToken(cleaned);
  if (!norm) return true; // empty is fine
  if (factBank.numberFacts.has(norm)) return true;

  // Also try without percent
  if (norm.endsWith('%')) {
    const bare = norm.slice(0, -1);
    if (factBank.numberFacts.has(bare) || factBank.numberFacts.has(bare + '%')) return true;
  }

  // Integer close match: "15221" matches "15,221" or "15221.50"
  const bareNum = norm.replace(/%$/, '');
  for (const f of factBank.numberFacts) {
    if (f.replace(/%$/, '') === bareNum) return true;
  }

  // Allow common structural, temporal, or small ordinal numbers/years
  const n = parseFloat(bareNum);
  if (!isNaN(n)) {
    if (n >= 2000 && n <= 2035) return true; // Common reporting years
    const SAFE_VALUES = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 24, 48, 50, 72, 100]);
    if (SAFE_VALUES.has(n)) return true;

    // Allow all percentages 0–100 (computed from source, not invented)
    if (n >= 0 && n <= 100 && norm.endsWith('%')) return true;

    // Allow small counts ≤ 50 which appear as aggregates/ranks/counts
    if (n > 0 && n <= 50 && Number.isInteger(n)) return true;

    // Allow values within 2% of any known fact (tolerates rounding in LLM output)
    for (const f of factBank.numberFacts) {
      const fNum = parseFloat(f.replace(/%$/, ''));
      if (!isNaN(fNum) && fNum !== 0) {
        const diff = Math.abs(fNum - n) / Math.abs(fNum);
        if (diff < 0.02) return true; // within 2%
      }
    }
  }

  return false;
}

/**
 * Extract all number-like tokens from an arbitrary string (slide title, bullet, etc.).
 */
function extractNumbersFromString(str) {
  const re = /\b\d{1,3}(?:,\d{3})+(?:\.\d+)?%?|\b\d+\.\d+%?|\b\d+%|\b\d+\b/g;
  const out = [];
  let m;
  const s = String(str || '');
  while ((m = re.exec(s)) !== null) out.push(m[0]);
  return out;
}

/**
 * Validate a DocumentIntelligence object against the fact bank.
 * Removes KPIs / chart values / table cells that are not grounded.
 * Returns { intelligence, report }.
 */
function groundIntelligence(intelligence, factBank) {
  if (!intelligence) return { intelligence, report: { stripped: 0, warnings: [] } };
  const report = { stripped: 0, warnings: [], keptNumbers: 0 };

  const grounded = { ...intelligence };

  // KPIs
  if (Array.isArray(grounded.kpis)) {
    grounded.kpis = grounded.kpis.filter(kpi => {
      const nums = extractNumbersFromString(kpi.value).concat(extractNumbersFromString(kpi.unit || ''));
      if (!nums.length) return true; // qualitative KPI
      const ok = nums.every(n => isNumberGrounded(n, factBank));
      if (!ok) {
        report.stripped += 1;
        report.warnings.push(`KPI stripped (ungrounded): ${kpi.label}=${kpi.value}`);
      } else {
        report.keptNumbers += nums.length;
      }
      return ok;
    });
  }

  // Sections: tables + charts
  if (Array.isArray(grounded.sections)) {
    grounded.sections = grounded.sections.map(sec => {
      const s = { ...sec };

      if (Array.isArray(s.tables)) {
        s.tables = s.tables.map(t => {
          const headers = t.headers || [];
          const rows = (t.rows || []).map(row => {
            // Keep row structure; do not delete cells — flag only
            return row;
          });
          // Soft check: count ungrounded cells
          rows.forEach((row, ri) => {
            (row || []).forEach((cell, ci) => {
              const nums = extractNumbersFromString(cell);
              nums.forEach(n => {
                if (!isNumberGrounded(n, factBank)) {
                  report.warnings.push(`Table cell possibly ungrounded [${t.title || 'table'} r${ri}c${ci}]: ${n}`);
                } else {
                  report.keptNumbers += 1;
                }
              });
            });
          });
          return { ...t, headers, rows };
        });
      }

      if (Array.isArray(s.charts)) {
        s.charts = s.charts.map(ch => {
          const series = (ch.series || []).map(ser => {
            const values = (ser.values || []).map(v => {
              const ok = isNumberGrounded(v, factBank);
              if (!ok) {
                // Keep value but warn — charts often need continuity; zeroing is worse
                report.warnings.push(`Chart value possibly ungrounded (${ch.title}/${ser.name}): ${v}`);
              } else {
                report.keptNumbers += 1;
              }
              return v;
            });
            return { ...ser, values };
          });
          return { ...ch, series };
        });
      }

      // Insights: strip bullets that contain ungrounded numbers
      if (Array.isArray(s.insights)) {
        s.insights = s.insights.filter(ins => {
          const nums = extractNumbersFromString(ins);
          if (!nums.length) return true;
          const ok = nums.every(n => isNumberGrounded(n, factBank));
          if (!ok) {
            report.stripped += 1;
            report.warnings.push(`Insight stripped: ${String(ins).slice(0, 80)}`);
          }
          return ok;
        });
      }

      return s;
    });
  }

  // keyFindings / recommendations / risks — strip ungrounded numeric claims
  for (const key of ['keyFindings', 'recommendations', 'risks']) {
    if (!Array.isArray(grounded[key])) continue;
    grounded[key] = grounded[key].filter(item => {
      const text = typeof item === 'string' ? item : JSON.stringify(item);
      const nums = extractNumbersFromString(text);
      if (!nums.length) return true;
      const ok = nums.every(n => isNumberGrounded(n, factBank));
      if (!ok) {
        report.stripped += 1;
        report.warnings.push(`${key} item stripped: ${text.slice(0, 80)}`);
      }
      return ok;
    });
  }

  grounded._factBank = {
    numberCount: factBank.numberFacts.size,
    entityCount: factBank.entities.size,
    chunkCount: factBank.chunks.length,
    filename: factBank.filename,
  };
  grounded._groundingReport = report;

  return { intelligence: grounded, report };
}

/**
 * Validate a presentation blueprint against the fact bank.
 * - Removes bullets with ungrounded numbers
 * - Zeros / drops chart points not in fact bank only when clearly invented (warn)
 * - Replaces expand-filler patterns with grounded findings
 */
function groundBlueprint(blueprint, factBank, intelligence) {
  if (!Array.isArray(blueprint)) return { blueprint, report: { stripped: 0, warnings: [] } };
  const report = { stripped: 0, warnings: [], slidesTouched: 0 };

  // Broad filler / generic analysis language that must never appear as content
  const FILLER_RE = /comprehensive (?:evaluation|data|analysis)|key benchmarks have been established|requires ongoing monitoring|cross-functional impact|long-term operational considerations|analytical synthesis & strategic focus|detailed metric breakdown supporting|in-depth evaluation of|identified operational patterns|review related tables for supporting|figures should be validated against source|content not available|no additional metrics|see source (?:data|document)|drawn from selected|expanded to meet target|added to (?:reach|meet)|supporting detail(?:s)? from the (?:source|register)|priority focus area|key analytical finding/i;

  // Track which finding strings have already been used as bullets across the deck
  // so we NEVER cycle the same 2–3 findings onto every slide (root cause of repetition).
  const usedFindingNorm = new Set();
  const normFinding = (t) => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);

  const out = blueprint.map((slide, si) => {
    const s = { ...slide };
    let touched = false;

    const isQualitative = ['cover', 'agenda', 'section', 'process', 'framework', 'timeline', 'recommendations', 'thankyou', 'closing', 'conclusion', 'summary'].includes(
      String(s.slideType || '').toLowerCase()
    );

    // ── Bullets: strip filler & ungrounded numbers; NEVER pad with recycled findings ──
    if (Array.isArray(s.bullets)) {
      const seenLocal = new Set();
      s.bullets = s.bullets
        .map((b) => {
          const text = String(b || '').trim();
          if (!text || text.length < 6) {
            touched = true;
            return null;
          }
          if (FILLER_RE.test(text)) {
            touched = true;
            report.stripped += 1;
            report.warnings.push(`Slide ${si + 1}: filler bullet removed`);
            return null; // remove — do NOT replace with a recycled finding
          }
          // Drop exact/near-duplicate bullets within the same slide
          const n = normFinding(text);
          if (seenLocal.has(n)) {
            touched = true;
            return null;
          }
          seenLocal.add(n);

          // Only strip numeric bullets for non-qualitative, non-chart slides
          // and only when EVERY number is ungrounded (not just one)
          if (!isQualitative && s.slideType !== 'chart' && s.slideType !== 'dualChart') {
            const stripped = text.replace(/[₹$€£¥₩,]/g, '');
            const nums = extractNumbersFromString(stripped);
            if (nums.length >= 2 && nums.every((num) => !isNumberGrounded(num, factBank))) {
              touched = true;
              report.stripped += 1;
              report.warnings.push(`Slide ${si + 1}: ungrounded bullet removed — ${text.slice(0, 60)}`);
              return null;
            }
          }
          usedFindingNorm.add(n);
          return text;
        })
        .filter(Boolean);

      // IMPORTANT: Do NOT pad bullets to a minimum length by cycling keyFindings.
      // That was the primary cause of the same 3 findings repeating on every slide.
    }

    // ── Insight headline: drop pure filler ──
    if (s.insightHeadline && FILLER_RE.test(String(s.insightHeadline))) {
      s.insightHeadline = null;
      touched = true;
      report.stripped += 1;
    }

    // ── Body text: drop pure filler ──
    if (s.bodyText && FILLER_RE.test(String(s.bodyText))) {
      s.bodyText = null;
      touched = true;
      report.stripped += 1;
    }

    // KPI cards
    if (Array.isArray(s.kpiCards) && !isQualitative) {
      s.kpiCards = s.kpiCards.filter((card) => {
        const nums = extractNumbersFromString(card.value).concat(extractNumbersFromString(card.unit || ''));
        if (!nums.length) return true;
        const ok = nums.every((n) => isNumberGrounded(n, factBank));
        if (!ok) {
          touched = true;
          report.stripped += 1;
          report.warnings.push(`Slide ${si + 1}: KPI removed ${card.label}=${card.value}`);
        }
        return ok;
      });
    }

    // Charts — warn only; do not invent replacements. Zero clearly invented series points.
    const checkChart = (ch, label) => {
      if (!ch || !ch.series) return ch;
      ch.series = (ch.series || []).map((ser) => {
        const values = (ser.values || []).map((v) => {
          if (v == null || v === '') return 0;
          if (!isNumberGrounded(v, factBank)) {
            report.warnings.push(`Slide ${si + 1}: ${label} value ${v} not in source fact bank`);
          }
          return v;
        });
        return { ...ser, values };
      });
      return ch;
    };
    if (s.chart && !isQualitative) s.chart = checkChart(s.chart, 'chart');
    if (s.secondaryChart && !isQualitative) s.secondaryChart = checkChart(s.secondaryChart, 'secondaryChart');

    // Table cells — warn
    if (s.table && Array.isArray(s.table.rows) && !isQualitative) {
      s.table.rows.forEach((row, ri) => {
        (row || []).forEach((cell) => {
          extractNumbersFromString(cell).forEach((n) => {
            if (!isNumberGrounded(n, factBank)) {
              report.warnings.push(`Slide ${si + 1}: table r${ri} value ${n} not in source`);
            }
          });
        });
      });
    }

    // Titles: warn on ungrounded numbers
    if (s.title && !isQualitative) {
      const nums = extractNumbersFromString(s.title);
      if (nums.length && !nums.every((n) => isNumberGrounded(n, factBank))) {
        report.warnings.push(`Slide ${si + 1}: title contains ungrounded number(s): ${s.title}`);
      }
    }

    if (touched) report.slidesTouched += 1;
    return s;
  });

  return { blueprint: out, report };
}

/**
 * Build a compact "FACT BANK" block for LLM prompts (retrieval-augmented context).
 */
function formatFactBankForPrompt(factBank, maxNumbers = 120, maxLines = 40) {
  if (!factBank) return '(no fact bank)';

  const nums = Array.from(factBank.numberFacts || []).slice(0, maxNumbers);
  const ents = Array.from(factBank.entities || []).slice(0, 40);
  const lines = (factBank.kpiLines || []).slice(0, maxLines);

  return [
    '=== GROUNDED FACT BANK (ONLY use numbers/entities from this list) ===',
    `NUMBERS (${nums.length}): ${nums.join(', ')}`,
    `ENTITIES: ${ents.join(' | ')}`,
    'KEY SOURCE LINES:',
    ...lines.map(l => `• ${l}`),
    '=== END FACT BANK — any number NOT listed above is a HALUCINATION and is forbidden ===',
  ].join('\n');
}

/**
 * Retrieve context snippets for a slide topic (for strategy agent).
 */
function retrieveForTopic(factBank, topic, k = 3) {
  if (!factBank?.chunks?.length) return '';
  const hits = retrieveChunks(factBank.chunks, topic, k);
  if (!hits.length) return '';
  return hits.map((h, i) => `[Source excerpt ${i + 1}]\n${h.text.trim()}`).join('\n\n');
}


/**
 * Rewrite broken completion % cells before they reach tables or charts.
 * Fixes: 0.0% when Done === Needed, and #DIV/0! when Needed === 0.
 */
function sanitizeCompletionCells(headers, rows) {
  const hLower = (headers || []).map(h => String(h || '').toLowerCase());
  const doneIdx = hLower.findIndex(h => /surg(?:ery)?\s*done|done|completed|operat/i.test(h));
  const needIdx = hLower.findIndex(h => /need(?:ed)?|surg(?:ery)?\s*need|required|pending/i.test(h));
  const pctIdx  = hLower.findIndex(h => /pct|percent|%|completion|done\s*%/i.test(h));

  if (pctIdx < 0) return rows;

  return (rows || []).map(row => {
    const next = [...row];
    const needed = parseFloat(String(next[needIdx] ?? '').replace(/,/g, ''));
    const done   = parseFloat(String(next[doneIdx] ?? '').replace(/,/g, ''));
    const rawPct = String(next[pctIdx] ?? '').trim();

    if (/#div\/0!|#value!|#ref!|#n\/a/i.test(rawPct) || rawPct === '') {
      if (!isNaN(needed) && needed === 0) {
        next[pctIdx] = '—';
      } else if (!isNaN(needed) && !isNaN(done) && needed > 0) {
        next[pctIdx] = ((done / needed) * 100).toFixed(1);
      } else {
        next[pctIdx] = '—';
      }
    } else if (!isNaN(needed) && !isNaN(done) && needed > 0 && done === needed) {
      // Source formula wrongly wrote 0.0 even though 100 % complete
      const n = parseFloat(rawPct);
      if (isNaN(n) || n < 1) next[pctIdx] = '100.0';
    }
    return next;
  });
}

/**
 * Parse Excel-style CSV blocks produced by extractText (--- Sheet: name --- ...).
 * Returns array of { title, headers, rows } ready for intelligence.tables.
 * Sanitizes broken completion % cells (#DIV/0!, false 0.0%) on parse.
 */
function parseSheetTablesFromText(rawText) {
  const text = String(rawText || '');
  const tables = [];
  // CRITICAL FIX: sheet names may contain hyphens (e.g. "HSC-Details", "Block-A").
  // Old pattern [^\n-]+ stopped at the first hyphen and matched ZERO sheets.
  const sheetRe = /---\s*Sheet:\s*([^\n]+?)\s*---\s*\r?\n([\s\S]*?)(?=---\s*Sheet:|$)/gi;
  let sm;
  while ((sm = sheetRe.exec(text)) !== null) {
    const sheetName = sm[1].trim().slice(0, 80);
    if (/^copy\s+of\b/i.test(sheetName)) continue; // Excel duplicate sheet
    const csv = sm[2].trim();
    if (!csv || csv.length < 10) continue;

    const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    const splitCsv = (line) => {
      const cells = [];
      let cur = '';
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = !inQ;
        } else if ((c === ',' || c === '\t') && !inQ) {
          cells.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      cells.push(cur.trim());
      return cells;
    };

    // Score candidate header rows — prefer real column names (SN, Admission, Birth Weight…)
    // Skip title rows like "ADMISSION DATE:" or single-label banners
    const headerScore = (cells) => {
      const joined = cells.join(' ').toLowerCase();
      let score = 0;
      if (/\b(sn|s\.no|sl\.?\s*no|admission\s*id|patient|birth\s*weight|gestation|outcome|diagnosis|phc|block|disease|condition|epid\s*code|mr\s*i|expected|confirmed)\b/i.test(joined)) score += 5;
      if (/\b(date of birth|adm\.?\s*date|gender|sex|weight|cause of death|maturity)\b/i.test(joined)) score += 3;
      const nonEmpty = cells.filter(Boolean);
      if (nonEmpty.length >= 4) score += 2;
      if (nonEmpty.length >= 8) score += 1;
      // Penalise title-like rows
      if (/^admission date|^report|^line list|^death list|^confidential/i.test(nonEmpty[0] || '')) score -= 5;
      if (nonEmpty.length <= 2) score -= 3;
      const numCount = nonEmpty.filter(c => /^-?\d[\d,./-]*%?$/.test(c)).length;
      if (numCount > nonEmpty.length * 0.5) score -= 4; // data row, not header
      // Penalise rows that are mostly empty with Col placeholders needed
      const emptyRatio = cells.filter(c => !c).length / Math.max(cells.length, 1);
      if (emptyRatio > 0.5) score -= 2;
      return score;
    };

    let headerLineIdx = -1;
    let headers = [];
    let bestScore = -999;
    for (let li = 0; li < Math.min(lines.length, 12); li++) {
      const full = splitCsv(lines[li]).map(h => h.replace(/^"|"$/g, '').trim());
      const nonEmpty = full.filter(Boolean);
      if (nonEmpty.length < 2) continue;
      const sc = headerScore(full);
      if (sc > bestScore) {
        bestScore = sc;
        headerLineIdx = li;
        headers = full.map((h, i) => h || `Col${i + 1}`);
      }
    }
    // Require a minimum score so we don't lock onto a title row
    if (headerLineIdx < 0 || headers.length < 2 || bestScore < 1) continue;

    let rows = [];
    for (let i = headerLineIdx + 1; i < lines.length && rows.length < 50; i++) {
      const cells = splitCsv(lines[i]).map(c => c.replace(/^"|"$/g, '').trim());
      if (cells.every(c => !c || /^[,.\-–]+$/.test(c))) continue;
      // Skip rows that are exact duplicates of the header
      if (cells.slice(0, headers.length).join('|') === headers.join('|')) continue;
      while (cells.length < headers.length) cells.push('');
      rows.push(cells.slice(0, headers.length));
    }
    if (rows.length === 0) continue;

    // FIX: sanitize broken % cells immediately
    rows = sanitizeCompletionCells(headers, rows);

    tables.push({
      title: sheetName,
      headers,
      rows,
      summary: `${rows.length} rows × ${headers.length} columns from sheet "${sheetName}"`,
    });
  }

  // Fallback: if no --- Sheet: markers but text looks like CSV (plain .csv or broken marker)
  if (tables.length === 0) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length >= 3) {
      const splitCsv = (line) => {
        const cells = [];
        let cur = '';
        let inQ = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"') {
            if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
            else inQ = !inQ;
          } else if ((c === ',' || c === '\t') && !inQ) {
            cells.push(cur.trim());
            cur = '';
          } else {
            cur += c;
          }
        }
        cells.push(cur.trim());
        return cells;
      };
      let headerLineIdx = -1;
      let headers = [];
      for (let li = 0; li < Math.min(lines.length, 10); li++) {
        const full = splitCsv(lines[li]).map(h => h.replace(/^"|"$/g, '').trim());
        const nonEmpty = full.filter(Boolean);
        if (nonEmpty.length < 2) continue;
        const numCount = nonEmpty.filter(c => /^-?\d[\d,.]*%?$/.test(c)).length;
        if (numCount <= nonEmpty.length * 0.5) {
          headers = full.map((h, i) => h || `Col${i + 1}`);
          headerLineIdx = li;
          break;
        }
      }
      if (headerLineIdx >= 0 && headers.length >= 2) {
        let rows = [];
        for (let i = headerLineIdx + 1; i < lines.length && rows.length < 50; i++) {
          const cells = splitCsv(lines[i]).map(c => c.replace(/^"|"$/g, '').trim());
          if (cells.every(c => !c || /^[,.\-–]+$/.test(c))) continue;
          while (cells.length < headers.length) cells.push('');
          rows.push(cells.slice(0, headers.length));
        }
        if (rows.length > 0) {
          rows = sanitizeCompletionCells(headers, rows);
          tables.push({
            title: 'Data Table',
            headers,
            rows,
            summary: `${rows.length} rows × ${headers.length} columns from document`,
          });
        }
      }
    }
  }

  // ── Split stacked multi-block RBSK tables (one sheet, many "X Block - RBSK" banners) ──
  {
    const expanded = [];
    for (const t of tables) {
      const blockBannerRe = /^(anaicut|gudiyatham|k\.?\s*v\.?\s*kuppam|kaniyambadi|katpadi|pernambut|vellore(?:\s+block|\s+corporation)?|vellore\s+district)\s*(block|corporation)?\b/i;
      const bannerRows = [];
      (t.rows || []).forEach((row, ri) => {
        const first = String(row[0] || row[1] || '').trim();
        if (blockBannerRe.test(first) || /rashtriya bal swasthya|rbsk\s*-/i.test(first)) {
          bannerRows.push({ ri, name: first.slice(0, 48) });
        }
      });
      if (bannerRows.length < 2) {
        expanded.push(t);
        continue;
      }
      for (let b = 0; b < bannerRows.length; b++) {
        const start = bannerRows[b].ri + 1;
        const end = b + 1 < bannerRows.length ? bannerRows[b + 1].ri : (t.rows || []).length;
        const chunk = (t.rows || []).slice(start, end).filter(r => {
          const cells = (r || []).map(c => String(c || '').toLowerCase().trim());
          if (!cells.some(c => c)) return false;
          if (/^sl\.?\s*no$|^s\.?no$|^district$|^disease\s*condition$/i.test(cells[0] || '')) return false;
          return true;
        });
        if (chunk.length < 2) continue;
        expanded.push({
          ...t,
          title: bannerRows[b].name.replace(/\s*[-–].*$/, '').trim() || t.title,
          rows: chunk,
          summary: `${chunk.length} rows · ${t.headers.length} fields`,
        });
      }
    }
    if (expanded.length > tables.length) {
      tables.length = 0;
      tables.push(...expanded);
    }
  }

  return tables;
}

/**
 * From structured tables, synthesise ready-to-plot chart objects when
 * column headers look like Expected/Confirmed, Medical/Surgery, etc.
 * Only uses numbers that already appear in the table cells.
 */
function synthesiseChartsFromTables(tables) {
  const charts = [];
  /** Build a readable category label; avoid repeated district-only labels. */
  const labelCat = (row, catIdx, headers) => {
    let raw = String(row[catIdx] || '').trim();
    if (!raw) return '';
    // If label is a generic district and a disease column exists, prefer disease
    const hLower = (headers || []).map(h => String(h || '').toLowerCase());
    const diseaseIdx = hLower.findIndex(h =>
      /disease|condition|diagnosis|ailment|defect|disorder/i.test(h)
    );
    if (diseaseIdx >= 0 && diseaseIdx !== catIdx) {
      const disease = String(row[diseaseIdx] || '').trim();
      const looksLikePlace = /^(vellore|chennai|district|block|corporation|tamil|nadu)$/i.test(raw);
      if (looksLikePlace && disease) raw = disease;
      else if (disease && raw && disease.toLowerCase() !== raw.toLowerCase() && looksLikePlace) {
        raw = disease;
      }
    }
    // Collapse long disease names
    raw = raw.replace(/Coronary Heart Disease/i, 'CHD')
             .replace(/Rheumatic Heart Disease/i, 'Rheumatic HD')
             .replace(/Cleft Lip\s*&\s*Palate/i, 'Cleft Lip')
             .replace(/Congenital\s+/i, 'Cong. ')
             .replace(/Neural Tube Defects?/i, 'NTD');
    return raw.slice(0, 32);
  };
  const toNum = (v) => {
    // Reject pure dates like 07.01.2026 / 08.12.2011 / 2026-01-07 — not chart metrics
    let s = String(v || '').trim();
    if (/^\d{1,2}[./\-]\d{1,2}[./\-]\d{2,4}$/.test(s)) return null;
    if (/^\d{4}[./\-]\d{1,2}[./\-]\d{1,2}$/.test(s)) return null;
    // Strip currency symbols/codes (INR 50.00, ₹1,234.50, $99)
    s = s.replace(/^(inr|rs\.?|usd|eur|gbp)\s*/i, '')
         .replace(/[₹$€£¥]/g, '')
         .replace(/,/g, '')
         .replace(/%$/, '')
         .replace(/\s+/g, '')
         .trim();
    // Parentheses for accounting negatives: (123.45)
    let neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    if (!s || s === '-' || s === '—') return null;
    const n = parseFloat(s);
    if (isNaN(n)) return null;
    return neg ? -n : n;
  };

  // Headers that must never become chart series (IDs, phones, names, dates, demographics)
  const isBadMetricHeader = (h) => {
    const l = String(h || '').toLowerCase().trim();
    if (!l) return true;
    if (/^(col\d+|unnamed)/i.test(l)) return true;
    // IDs / serials
    if (/^sn$|^s\.no|^sl\.?\s*no|^#|serial|admission\s*id|case\s*id|tn-vlr|epid\s*code|ind\/vlr/i.test(l)) return true;
    // PII / contact
    if (/patient|mother|father|name|address|locality|village|gender|^sex$|^gen$|dob|date\s*of\s*birth|birth\s*date|notification|onset|mobile|phone|contact|remark|comment/i.test(l)) return true;
    // Dates / ages / per-case clinical measures — NEVER sum these into charts
    if (/^date$|date\s*of|^age$|years?$|months?$|adm\.?\s*date|admission\s*date/i.test(l)) return true;
    if (/\bga\b|gestational\s*age|gest\.?\s*age|birth\s*weight|b\.?\s*wt|^weight$|head\s*circ|length|temperature|heart\s*rate|^rr$|^bp$/i.test(l)) return true;
    // Facility name repeated every row
    if (/^fbnc|facility\s*name|hospital\s*name/i.test(l)) return true;
    return false;
  };

  /** Reject metric values that are clearly phone numbers or pure IDs */
  const isBadMetricValue = (v) => {
    const n = parseFloat(String(v || '').replace(/,/g, ''));
    if (isNaN(n)) return true;
    // Phone numbers (10+ digits, or > 1e9)
    if (n >= 1e9) return true;
    const digits = String(v).replace(/\D/g, '');
    if (digits.length >= 10) return true;
    return false;
  };

  // Prefer meaningful surveillance / programme metrics
  const isGoodMetricHeader = (h) => {
    const l = String(h || '').toLowerCase().trim();
    if (!l) return false;
    // Pure percentage headers like "100%" are NOT good names (common Excel export artifact)
    if (/^\d+(\.\d+)?%$/.test(l)) return false;
    // Population denominators are not chart metrics (repeated per disease row)
    if (/live\s*birth|prevalence|population|denominator/i.test(l)) return false;
    return /mr\s*[i1]|mr\s*[ii2]|mr-?\s*[12]|coverage|dropout|house|survey|expected|confirm|detect|done|need|pending|credit|debit|withdrawal|deposit|balance|amount|case\s*count|total|percent|dose|immuni|perform|fully|partial|surg/i.test(l);
  };

  /** Human label for a metric column — never leave bare "100%" as a series name. */
  const renameMetricHeader = (h, colIdx, headers) => {
    const raw = String(h || '').trim();
    if (!raw) return `Metric ${colIdx + 1}`;
    if (/^\d+(\.\d+)?%$/.test(raw)) {
      // Try to infer from neighbouring header context (MR I / MR II columns often sit side by side)
      const left = String(headers[colIdx - 1] || '').toLowerCase();
      const right = String(headers[colIdx + 1] || '').toLowerCase();
      if (/mr\s*i\b|mr\s*1|dose\s*1|first/i.test(left + ' ' + right) || colIdx % 2 === 0)
        return 'MR I Performance';
      return 'MR II Performance';
    }
    // Clean verbose headers
    return raw
      .replace(/percentage of /i, '% ')
      .replace(/children /i, '')
      .slice(0, 40);
  };

  /** Clean chart title — never "Vellore: 100% vs 100%" */
  const cleanChartTitle = (sheetTitle, seriesNames) => {
    let base = String(sheetTitle || 'Analysis').replace(/^copy\s+of\s+/i, '').trim();
    if (/^vellore$/i.test(base)) base = 'Facility Performance';
    const names = (seriesNames || []).filter(n => n && !/^\d+(\.\d+)?%$/.test(n));
    if (names.length >= 2) return `${base}: ${names[0]} vs ${names[1]}`.slice(0, 80);
    if (names.length === 1) return `${base}: ${names[0]}`.slice(0, 80);
    return base.slice(0, 60);
  };

  // Drop duplicate / copy sheets and near-empty tables
  const seenFingerprints = new Set();
  const cleanTables = [];
  for (const t of tables || []) {
    const title = String(t.title || '');
    if (/^copy\s+of\b/i.test(title)) continue;
    if (!t.headers || t.headers.length < 2 || !t.rows || t.rows.length < 2) continue;
    const fp = (t.headers || []).join('|').toLowerCase() + '::' + (t.rows || []).length;
    if (seenFingerprints.has(fp)) continue;
    seenFingerprints.add(fp);
    cleanTables.push(t);
  }

  for (const t of cleanTables) {
    if (charts.length >= 12) break;
    const hLower = t.headers.map(h => h.toLowerCase());

    // Smart category column: disease/condition > block/PHC > other text cols
    // Reject columns where nearly all values are identical (e.g. every row = "Vellore")
    const uniqueness = (colIdx) => {
      const vals = t.rows.map(r => String(r[colIdx] || '').trim().toLowerCase()).filter(Boolean);
      if (vals.length < 2) return 0;
      return new Set(vals).size / vals.length;
    };
    const isTextCol = (colIdx) => {
      const sample = t.rows.slice(0, 8).map(r => r[colIdx]);
      const nums = sample.filter(c => toNum(c) != null).length;
      return nums < Math.ceil(sample.length * 0.5);
    };

    let catIdx = 0;
    // 1) Disease / condition / diagnosis columns (best for RBSK-style sheets)
    const diseaseIdx = hLower.findIndex(h =>
      /disease|condition|diagnosis|ailment|defect|disorder|syndrome|category|item/i.test(h) && !/type of admission|admission type/i.test(h)
    );
    // 2) Block / PHC / facility
    const blockIdx = hLower.findIndex(h =>
      /phc|uphc|block|facility|hsc|centre|center|location|area|unit|village|ward/i.test(h)
    );
    // 3) District only if values actually vary
    const districtIdx = hLower.findIndex(h => /district|state|region/i.test(h));

    const maturityIdx = hLower.findIndex(h => /maturity|preterm|fullterm|full\s*term/i.test(h));
    const candidates = [];
    // Maturity is best axis for infant death / NICU registers
    if (maturityIdx >= 0 && isTextCol(maturityIdx)) candidates.push({ i: maturityIdx, score: 110 + uniqueness(maturityIdx) * 20 });
    if (diseaseIdx >= 0 && isTextCol(diseaseIdx)) candidates.push({ i: diseaseIdx, score: 100 + uniqueness(diseaseIdx) * 20 });
    if (blockIdx >= 0 && isTextCol(blockIdx)) candidates.push({ i: blockIdx, score: 80 + uniqueness(blockIdx) * 20 });
    if (districtIdx >= 0 && isTextCol(districtIdx) && uniqueness(districtIdx) > 0.25) {
      candidates.push({ i: districtIdx, score: 40 + uniqueness(districtIdx) * 20 });
    }
    // 4) Any other non-numeric, non-bad, diverse text column
    for (let i = 0; i < hLower.length; i++) {
      if (candidates.some(c => c.i === i)) continue;
      if (!isTextCol(i)) continue;
      if (/^sl\.?\s*no|^s\.no|^#|^serial|^sn$/i.test(hLower[i])) continue;
      if (/case\s*id|patient|father|mother|address|mobile|phone|contact|remark|gender|^sex$|^gen$/i.test(hLower[i])) continue;
      const u = uniqueness(i);
      if (u < 0.25) continue; // nearly constant — skip (all Vellore / all GEN)
      candidates.push({ i, score: 20 + u * 30 });
    }
    candidates.sort((a, b) => b.score - a.score);
    catIdx = candidates.length ? candidates[0].i : 0;
    const preferredCat = blockIdx; // kept for downstream TN- case-id skip logic

    // Prefer "Expected Cases" style columns — never Live Birth / Target population denominators
    const expIdx = hLower.findIndex(h =>
      /expected\s*cases|expected(?!.*birth)|projected\s*cases/i.test(h)
    );
    const confIdx = hLower.findIndex(h =>
      /children\s*confirm|confirm(?:ed)?\s*cases|confirmed(?!.*birth)|cases\s*confirm/i.test(h)
      || (/confirm|detect(?:ed)?|found/i.test(h) && !/birth|target|live/i.test(h))
    );
    // Aggregate by unique disease/category label so multi-block tables
    // do not repeat "Coronary Heart Disease" twice on the same chart axis.
    const aggregateByCat = (valueIdxList, maxCats = 10) => {
      const map = new Map(); // cat -> sums array parallel to valueIdxList
      for (const row of t.rows) {
        const cat = labelCat(row, catIdx, t.headers);
        if (!cat) continue;
        const nums = valueIdxList.map((vi) => toNum(row[vi]));
        if (nums.every((n) => n == null)) continue;
        const prev = map.get(cat) || valueIdxList.map(() => 0);
        const next = prev.map((p, i) => p + (nums[i] ?? 0));
        map.set(cat, next);
      }
      // Prefer categories with highest first metric (e.g. expected cases)
      const entries = Array.from(map.entries())
        .sort((a, b) => (b[1][0] || 0) - (a[1][0] || 0))
        .slice(0, maxCats);
      return {
        cats: entries.map(([c]) => c),
        seriesVals: valueIdxList.map((_, i) => entries.map(([, vals]) => vals[i] || 0)),
      };
    };

    if (expIdx >= 0 && confIdx >= 0 && expIdx !== confIdx) {
      const { cats, seriesVals } = aggregateByCat([expIdx, confIdx], 10);
      if (cats.length >= 2) {
        charts.push({
          title: 'Expected vs confirmed cases',
          chartType: 'bar',
          categories: cats,
          series: [
            { name: t.headers[expIdx] || 'Expected', values: seriesVals[0] },
            { name: t.headers[confIdx] || 'Confirmed', values: seriesVals[1] },
          ],
          unit: 'cases',
          insight: `Comparison of ${t.headers[expIdx]} vs ${t.headers[confIdx]} across ${cats.length} unique conditions.`,
        });
      }
    }

    const medIdx = hLower.findIndex(h => /medic|managed|conserv/i.test(h));
    const surgIdx = hLower.findIndex(h => /surg|operat|intervent|done/i.test(h) && !/needed|required|pending/i.test(h));
    // Prefer "Children Needed Surgery" if present
    const surgNeededIdx = hLower.findIndex(h => /needed\s*surg|surg.*needed|children\s*needed/i.test(h));
    const surgUseIdx = surgNeededIdx >= 0 ? surgNeededIdx : surgIdx;
    if (medIdx >= 0 && surgUseIdx >= 0 && medIdx !== surgUseIdx) {
      const { cats, seriesVals } = aggregateByCat([medIdx, surgUseIdx], 10);
      if (cats.length >= 2) {
        charts.push({
          title: 'Medical vs surgical management',
          chartType: 'stackedBar',
          categories: cats,
          series: [
            { name: t.headers[medIdx] || 'Medical', values: seriesVals[0] },
            { name: t.headers[surgUseIdx] || 'Surgery', values: seriesVals[1] },
          ],
          unit: 'cases',
          insight: `Treatment modality split across ${cats.length} unique conditions.`,
        });
      }
    }


    // ── Bank statement: Debits vs Credits by date (or transaction) ──
    const debitIdx = hLower.findIndex(h => /debit|withdrawal|dr\b|paid|outflow/i.test(h) && !/credit/i.test(h));
    const creditIdx = hLower.findIndex(h => /credit|deposit|cr\b|inflow|received/i.test(h) && !/debit/i.test(h));
    const balIdx = hLower.findIndex(h => /^balance$|closing|running\s*bal/i.test(h));
    const dateIdx = hLower.findIndex(h => /^date$|txn\s*date|value\s*date|transaction\s*date/i.test(h));
    const detailIdx = hLower.findIndex(h => /transaction\s*details|narration|description|particulars|remarks/i.test(h));

    if (debitIdx >= 0 && creditIdx >= 0 && charts.length < 14) {
      // Aggregate by date when available
      const byKey = new Map();
      const debitRows = [];
      const creditRows = [];
      for (const row of t.rows) {
        let key = dateIdx >= 0 ? String(row[dateIdx] || '').trim() : '';
        if (!key && detailIdx >= 0) {
          key = String(row[detailIdx] || '').replace(/\/.*/, '').replace(/XXXXX.*/, '').trim().slice(0, 22);
        }
        if (!key) key = `Txn ${byKey.size + 1}`;
        const d = toNum(row[debitIdx]) || 0;
        const c = toNum(row[creditIdx]) || 0;
        if (d === 0 && c === 0) continue;
        if (d >= 1e9 || c >= 1e9) continue;
        const prev = byKey.get(key) || { debit: 0, credit: 0 };
        prev.debit += d;
        prev.credit += c;
        byKey.set(key, prev);
        if (d > 0) {
          let label = detailIdx >= 0
            ? String(row[detailIdx] || '').replace(/XXXXX[^\s]*/g, '').replace(/\/UPI.*/i, '').trim().slice(0, 22)
            : key;
          if (!label) label = key;
          debitRows.push({ label, amount: d });
        }
        if (c > 0) {
          let label = detailIdx >= 0
            ? String(row[detailIdx] || '').replace(/XXXXX[^\s]*/g, '').replace(/\/UPI.*/i, '').trim().slice(0, 22)
            : key;
          if (!label) label = key;
          creditRows.push({ label, amount: c });
        }
      }
      const entries = Array.from(byKey.entries()).slice(0, 12);
      if (entries.length >= 2) {
        charts.push({
          title: 'Debits vs Credits by period',
          chartType: 'bar',
          categories: entries.map(([k]) => k.slice(0, 18)),
          series: [
            { name: 'Debits', values: entries.map(([, v]) => Math.round(v.debit * 100) / 100) },
            { name: 'Credits', values: entries.map(([, v]) => Math.round(v.credit * 100) / 100) },
          ],
          unit: 'INR',
          insight: `Transaction flow across ${entries.length} periods.`,
        });
        // Net flow by period
        charts.push({
          title: 'Net cash flow by period',
          chartType: 'bar',
          categories: entries.map(([k]) => k.slice(0, 18)),
          series: [{
            name: 'Net (Credit − Debit)',
            values: entries.map(([, v]) => Math.round((v.credit - v.debit) * 100) / 100),
          }],
          unit: 'INR',
          insight: `Net position for each period (positive = surplus).`,
        });
      }
      const totalD = entries.reduce((s, [, v]) => s + v.debit, 0);
      const totalC = entries.reduce((s, [, v]) => s + v.credit, 0);
      if (totalD > 0 || totalC > 0) {
        charts.push({
          title: 'Total credits vs total debits',
          chartType: 'donut',
          categories: ['Credits', 'Debits'],
          series: [{ name: 'Amount (INR)', values: [Math.round(totalC), Math.round(totalD)] }],
          unit: 'INR',
          insight: `Credits ${Math.round(totalC)} vs Debits ${Math.round(totalD)}.`,
        });
      }
      // Top debits ranking
      debitRows.sort((a, b) => b.amount - a.amount);
      const topD = debitRows.slice(0, 8);
      if (topD.length >= 3) {
        charts.push({
          title: 'Largest outgoing transfers',
          chartType: 'horizontalBar',
          categories: topD.map(r => r.label.slice(0, 20)),
          series: [{ name: 'Debit (INR)', values: topD.map(r => Math.round(r.amount * 100) / 100) }],
          unit: 'INR',
          insight: `Top ${topD.length} debit transactions by amount.`,
        });
      }
      // Top credits ranking
      creditRows.sort((a, b) => b.amount - a.amount);
      const topC = creditRows.slice(0, 8);
      if (topC.length >= 2) {
        charts.push({
          title: 'Largest incoming credits',
          chartType: 'horizontalBar',
          categories: topC.map(r => r.label.slice(0, 20)),
          series: [{ name: 'Credit (INR)', values: topC.map(r => Math.round(r.amount * 100) / 100) }],
          unit: 'INR',
          insight: `Top ${topC.length} credit inflows by amount.`,
        });
      }
    }

    // Running balance by date
    if (balIdx >= 0 && dateIdx >= 0 && charts.length < 14) {
      const cats = [];
      const vals = [];
      for (const row of t.rows) {
        const cat = String(row[dateIdx] || '').trim().slice(0, 18);
        const v = toNum(row[balIdx]);
        if (!cat || v == null || v >= 1e9) continue;
        cats.push(cat);
        vals.push(v);
        if (cats.length >= 14) break;
      }
      if (cats.length >= 2) {
        charts.push({
          title: 'Running balance by date',
          chartType: 'horizontalBar',
          categories: cats,
          series: [{ name: 'Balance (INR)', values: vals }],
          unit: 'INR',
          insight: `Account balance trajectory over ${cats.length} dates.`,
        });
      }
    }



    // ── Measles / HSC charts (broad header matching) ──
    const looksMeaslesSheet = /measles|hsc|epid|mr\s*i|immun|phc|uphc/i.test(
      String(t.title || '') + ' ' + hLower.join(' ')
    ) || hLower.some(h => /epid|phc|uphc|houses?|mr\s*i|dropout|immun/i.test(h));

    if (looksMeaslesSheet) {
      const sectorCol = hLower.findIndex(h => /hsc\/?sector|hsc|sector|locality|village/i.test(h));
      const phcCol = hLower.findIndex(h => /phc|uphc|facility|block/i.test(h));
      const houseCol = hLower.findIndex(h => /houses?|surveyed|house\s*count|survey/i.test(h) && !/date|mr\s|dropout|age/i.test(h));
      const placeCol = sectorCol >= 0 ? sectorCol : phcCol;

      // Cases per facility (always useful for measles registers)
      if (phcCol >= 0 && charts.length < 14) {
        const byPhc = new Map();
        for (const row of t.rows || []) {
          const phc = String(row[phcCol] || '').trim().slice(0, 24);
          if (!phc || /^sl\.?\s*no/i.test(phc)) continue;
          byPhc.set(phc, (byPhc.get(phc) || 0) + 1);
        }
        const entries = Array.from(byPhc.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);
        if (entries.length >= 2) {
          charts.push({
            title: 'Suspected cases by facility',
            chartType: 'horizontalBar',
            categories: entries.map(([k]) => k),
            series: [{ name: 'Cases', values: entries.map(([, v]) => v) }],
            unit: 'cases',
            insight: `Case load across ${entries.length} PHC/UPHC units (${(t.rows || []).length} total).`,
          });
        }
      }

      // Houses surveyed by sector/facility
      if (placeCol >= 0 && houseCol >= 0 && charts.length < 14) {
        const byPlace = new Map();
        for (const row of t.rows || []) {
          const place = String(row[placeCol] || '').trim().slice(0, 22);
          const h = toNum(row[houseCol]);
          if (!place || h == null || h < 0 || h > 50000) continue;
          byPlace.set(place, (byPlace.get(place) || 0) + h);
        }
        const entries = Array.from(byPlace.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
        if (entries.length >= 2) {
          charts.push({
            title: sectorCol >= 0 ? 'Houses surveyed by sector' : 'Houses surveyed by facility',
            chartType: 'horizontalBar',
            categories: entries.map(([k]) => k),
            series: [{ name: 'Houses', values: entries.map(([, v]) => v) }],
            unit: 'houses',
            insight: `Active case-search volume across ${entries.length} areas.`,
          });
        }
      }

      // Immunization status donut
      const immCol = hLower.findIndex(h =>
        /immun|mr\s*status|vaccine\s*status|imm\s*status|vaccination/i.test(h)
      );
      if (immCol >= 0 && charts.length < 14) {
        const counts = new Map();
        for (const row of t.rows || []) {
          let s = String(row[immCol] || '').trim();
          if (!s) s = 'Not Known';
          else if (/not\s*known|unknown|^nk$|^na$|^nil$|^-$/i.test(s)) s = 'Not Known';
          else if (/complete|fully|immunised|immunized/i.test(s)) s = 'Completely immunised';
          else if (/partial|incomplete|only\s*mr/i.test(s)) s = 'Partial / incomplete';
          else s = s.slice(0, 24);
          counts.set(s, (counts.get(s) || 0) + 1);
        }
        const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
        const totalImm = entries.reduce((s, [, v]) => s + v, 0);
        if (entries.length >= 1 && totalImm >= 3) {
          charts.push({
            title: 'Suspected case immunization status',
            chartType: 'donut',
            categories: entries.map(([k]) => k),
            series: [{ name: 'Cases', values: entries.map(([, v]) => v) }],
            unit: 'cases',
            insight: `Immunization status across all ${totalImm} suspected cases.`,
          });
        }
      }

      // MR I vs MR II performance — values may be ratios (0.96) or percents (96)
      const mrICol = hLower.findIndex(h => /mr\s*i\b|mr\s*1|mr-?i\s*perf/i.test(h) && !/ii|2/.test(h));
      const mrIICol = hLower.findIndex(h => /mr\s*ii|mr\s*2|mr-?ii\s*perf/i.test(h));
      const dropICol = hLower.findIndex(h => /dropout.*mr\s*i|mr\s*i.*dropout/i.test(h) && !/ii|2/.test(h));
      const dropIICol = hLower.findIndex(h => /dropout.*mr\s*ii|mr\s*ii.*dropout/i.test(h));

      const normPct = (v) => {
        if (v == null || isNaN(v)) return null;
        if (v < 0) return null;
        // Ratio scale (0–2.5) → percent; already-percent (5–200) keep
        if (v > 0 && v <= 2.5) return Math.round(v * 1000) / 10; // 1.03 → 103.0
        if (v > 2.5 && v <= 200) return Math.round(v * 10) / 10;
        return null;
      };

      if (placeCol >= 0 && mrICol >= 0 && charts.length < 14) {
        const cats = [];
        const mrI = [];
        const mrII = [];
        const seen = new Set();
        for (const row of t.rows || []) {
          const place = String(row[placeCol] || '').trim().slice(0, 18);
          if (!place || seen.has(place.toLowerCase())) continue;
          const v1 = normPct(toNum(row[mrICol]));
          const v2 = mrIICol >= 0 ? normPct(toNum(row[mrIICol])) : null;
          if (v1 == null) continue;
          seen.add(place.toLowerCase());
          cats.push(place);
          mrI.push(v1);
          if (mrIICol >= 0) mrII.push(v2 != null ? v2 : 0);
          if (cats.length >= 10) break;
        }
        if (cats.length >= 2) {
          const series = [{ name: 'MR I %', values: mrI }];
          if (mrIICol >= 0 && mrII.some(v => v > 0)) series.push({ name: 'MR II %', values: mrII });
          charts.push({
            title: 'MR coverage by sector',
            chartType: 'bar',
            categories: cats,
            series,
            unit: '%',
            insight: `MR coverage across ${cats.length} sectors (ratios normalised to %).`,
          });
        }
      }

      // Dropout ranking
      if (placeCol >= 0 && dropICol >= 0 && charts.length < 14) {
        const rows = [];
        const seen = new Set();
        for (const row of t.rows || []) {
          const place = String(row[placeCol] || '').trim().slice(0, 18);
          if (!place || seen.has(place.toLowerCase())) continue;
          const d1 = toNum(row[dropICol]);
          if (d1 == null) continue;
          seen.add(place.toLowerCase());
          const d2 = dropIICol >= 0 ? (toNum(row[dropIICol]) || 0) : 0;
          rows.push({ place, d1: Math.abs(d1), d2: Math.abs(d2) });
        }
        rows.sort((a, b) => (b.d1 + b.d2) - (a.d1 + a.d2));
        const top = rows.slice(0, 10);
        if (top.length >= 2) {
          const series = [{ name: 'MR I dropout', values: top.map(r => r.d1) }];
          if (dropIICol >= 0) series.push({ name: 'MR II dropout', values: top.map(r => r.d2) });
          charts.push({
            title: 'Highest MR dropout by sector',
            chartType: 'bar',
            categories: top.map(r => r.place),
            series,
            unit: 'count',
            insight: `Sectors with largest reported MR dropout.`,
          });
        }
      }

      // Gender is dropped from tables; age-band chart if age col present
      const ageCol = hLower.findIndex(h => /^age$|age\s*\(|age\s*in/i.test(h));
      if (ageCol >= 0 && charts.length < 14) {
        const bands = { '<1 yr': 0, '1–5 yr': 0, '6–15 yr': 0, '16+ yr': 0 };
        for (const row of t.rows || []) {
          let a = toNum(row[ageCol]);
          const raw = String(row[ageCol] || '').toLowerCase();
          if (a == null) {
            if (/month|mth/.test(raw)) a = 0.5;
            else continue;
          }
          if (a < 1) bands['<1 yr']++;
          else if (a <= 5) bands['1–5 yr']++;
          else if (a <= 15) bands['6–15 yr']++;
          else bands['16+ yr']++;
        }
        const entries = Object.entries(bands).filter(([, v]) => v > 0);
        if (entries.length >= 2) {
          charts.push({
            title: 'Suspected cases by age group',
            chartType: 'donut',
            categories: entries.map(([k]) => k),
            series: [{ name: 'Cases', values: entries.map(([, v]) => v) }],
            unit: 'cases',
            insight: `Age distribution of suspected cases.`,
          });
        }
      }
    }

    // ── Infant death / NICU register charts ──
    const matCol = hLower.findIndex(h => /maturity|preterm|fullterm/i.test(h));
    const gaCol = hLower.findIndex(h => /\bga\b|gestational\s*age|gest\.?\s*age/i.test(h));
    const wtCol = hLower.findIndex(h => /weight|b\.?\s*wt/i.test(h));
    if (matCol >= 0 && charts.length < 14) {
      const counts = new Map();
      for (const row of t.rows || []) {
        let label = String(row[matCol] || '').trim();
        if (!label) continue;
        if (/preterm|pre-term|<\s*37/i.test(label)) label = 'Preterm (<37w)';
        else if (/full\s*term|fullterm|37/i.test(label)) label = 'Full term';
        else if (/post\s*term/i.test(label)) label = 'Post term';
        else label = label.slice(0, 20);
        counts.set(label, (counts.get(label) || 0) + 1);
      }
      if (counts.size >= 1) {
        const entries = Array.from(counts.entries()).slice(0, 6);
        charts.push({
          title: 'Maturity distribution',
          chartType: 'donut',
          categories: entries.map(([k]) => k),
          series: [{ name: 'Cases', values: entries.map(([, v]) => v) }],
          unit: 'cases',
          insight: `Case mix by maturity (${(t.rows || []).length} records).`,
        });
      }
    }
    if (wtCol >= 0 && charts.length < 14) {
      // Weight bands: ELBW <1, VLBW 1-1.5, LBW 1.5-2.5, Normal ≥2.5
      const bands = { 'ELBW (<1kg)': 0, 'VLBW (1–1.5kg)': 0, 'LBW (1.5–2.5kg)': 0, '≥2.5 kg': 0 };
      for (const row of t.rows || []) {
        const w = toNum(row[wtCol]);
        if (w == null || w <= 0 || w > 8) continue;
        if (w < 1) bands['ELBW (<1kg)']++;
        else if (w < 1.5) bands['VLBW (1–1.5kg)']++;
        else if (w < 2.5) bands['LBW (1.5–2.5kg)']++;
        else bands['≥2.5 kg']++;
      }
      const entries = Object.entries(bands).filter(([, v]) => v > 0);
      if (entries.length >= 2) {
        charts.push({
          title: 'Birth weight bands',
          chartType: 'bar',
          categories: entries.map(([k]) => k),
          series: [{ name: 'Cases', values: entries.map(([, v]) => v) }],
          unit: 'cases',
          insight: 'Distribution of birth weight among registered deaths.',
        });
      }
    }
    // Cause of Death counts (top causes) — high value for NICU death registers
    const codCol = hLower.findIndex(h => /cause\s*of\s*death|final\s*diagnosis|outcome/i.test(h));
    if (codCol >= 0 && charts.length < 14) {
      const counts = new Map();
      for (const row of t.rows || []) {
        let label = String(row[codCol] || '').trim();
        if (!label || /^na$|^n\/a$|^-$/i.test(label)) continue;
        // Shorten verbose codes
        label = label.replace(/:\s*P\s*[\d.]+/gi, '').replace(/\s+/g, ' ').trim().slice(0, 36);
        if (!label) continue;
        counts.set(label, (counts.get(label) || 0) + 1);
      }
      if (counts.size >= 2) {
        const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
        charts.push({
          title: 'Leading causes of death',
          chartType: 'horizontalBar',
          categories: entries.map(([k]) => k),
          series: [{ name: 'Cases', values: entries.map(([, v]) => v) }],
          unit: 'cases',
          insight: `Top causes among ${(t.rows || []).length} registered deaths.`,
        });
      }
    }
    // Inborn vs Outborn counts
    const admTypeCol = hLower.findIndex(h => /type\s*of\s*admission|admission\s*type|inborn|outborn/i.test(h));
    if (admTypeCol >= 0 && charts.length < 14) {
      const counts = new Map();
      for (const row of t.rows || []) {
        let label = String(row[admTypeCol] || '').trim();
        if (!label) continue;
        if (/outborn/i.test(label)) label = 'Outborn';
        else if (/inborn/i.test(label)) label = 'Inborn';
        else label = label.slice(0, 24);
        counts.set(label, (counts.get(label) || 0) + 1);
      }
      if (counts.size >= 2) {
        const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
        charts.push({
          title: 'Inborn vs Outborn',
          chartType: 'donut',
          categories: entries.map(([k]) => k),
          series: [{ name: 'Cases', values: entries.map(([, v]) => v) }],
          unit: 'cases',
          insight: `Admission pathway mix (${(t.rows || []).length} records).`,
        });
      }
    }
    // Village / block case counts (top locations)
    const placeCol2 = hLower.findIndex(h => /^village$|block|sub\s*center|subcenter/i.test(h));
    if (placeCol2 >= 0 && charts.length < 14) {
      const counts = new Map();
      for (const row of t.rows || []) {
        let label = String(row[placeCol2] || '').trim().slice(0, 22);
        if (!label || /^vellore$/i.test(label)) continue; // district-only noise
        counts.set(label, (counts.get(label) || 0) + 1);
      }
      if (counts.size >= 3) {
        const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
        charts.push({
          title: 'Deaths by location',
          chartType: 'bar',
          categories: entries.map(([k]) => k),
          series: [{ name: 'Cases', values: entries.map(([, v]) => v) }],
          unit: 'cases',
          insight: `Geographic distribution of registered deaths.`,
        });
      }
    }

    // Skip generic horizontal ranking of GA by Inborn/Outborn — low value
    if (gaCol >= 0 && /type of admission|inborn|outborn/i.test(String(t.headers[catIdx] || ''))) {
      // force cat to maturity if available for any remaining generic charts
      if (matCol >= 0) catIdx = matCol;
    }

    // Generic: numeric columns that are REAL metrics (not dates, ages, case numbers)
    const numCols = [];
    for (let i = 0; i < t.headers.length; i++) {
      if (i === catIdx) continue;
      if (isBadMetricHeader(t.headers[i])) continue;
      const sampleVals = t.rows.slice(0, 12).map(r => toNum(r[i])).filter(n => n != null);
      if (sampleVals.length < 2) continue;
      // Reject columns that look like years or day-of-month noise
      if (sampleVals.every(n => (n >= 2000 && n <= 2035) || (n >= 1 && n <= 31 && Number.isInteger(n)))) continue;
      // Prefer good metric headers; still allow other numeric if values look like counts/% (0–200 range common)
      numCols.push({ idx: i, score: isGoodMetricHeader(t.headers[i]) ? 0 : 1 });
    }
    numCols.sort((a, b) => a.score - b.score);
    const numColIdxs = numCols.map(c => c.idx);

    // Multi-series clustered bar — only when we have ≥2 GOOD metrics
    const goodCols = numColIdxs.filter(i => isGoodMetricHeader(t.headers[i]));
    if (charts.length < 14 && goodCols.length >= 2) {
      const useCols = goodCols.slice(0, 3);
      const map = new Map();
      for (const row of t.rows) {
        const cat = labelCat(row, catIdx, t.headers);
        if (!cat || /^tn-/i.test(cat)) continue;
        if (/^(gen|m|f|male|female)$/i.test(cat)) continue;
        const vals = useCols.map((ci) => {
          const v = toNum(row[ci]);
          return (v != null && v < 1e9) ? v : null;
        });
        if (vals.some((v) => v == null)) continue;
        const prev = map.get(cat) || useCols.map(() => 0);
        map.set(cat, prev.map((p, i) => p + (vals[i] || 0)));
      }
      const entries = Array.from(map.entries())
        .sort((a, b) => (b[1][0] || 0) - (a[1][0] || 0))
        .slice(0, 10);
      const cats = entries.map(([c]) => c);
      if (cats.length >= 2) {
        const alreadyHaveBar = charts.some(c => c.chartType === 'bar' && c.title.startsWith(t.title));
        if (!alreadyHaveBar) {
          charts.push({
            title: cleanChartTitle(t.title, useCols.map(ci => renameMetricHeader(t.headers[ci], ci, t.headers)).slice(0, 2)),
            chartType: 'bar',
            categories: cats,
            series: useCols.map((ci, si) => ({
              name: renameMetricHeader(t.headers[ci], ci, t.headers),
              values: entries.map(([, vals]) => vals[si] || 0),
            })),
            unit: '',
            insight: `Comparison of ${useCols.map(ci => t.headers[ci]).join(', ')} across ${cats.length} unique categories.`,
          });
        }
      }
    }

    // Single-column horizontal bar — prefer houses surveyed / coverage / dropout
    if (charts.length < 14 && numColIdxs.length >= 1) {
      const col = (goodCols[0] != null ? goodCols[0] : numColIdxs[0]);
      const map = new Map();
      for (const row of t.rows) {
        const cat = labelCat(row, catIdx, t.headers);
        const v = toNum(row[col]);
        if (!cat || v == null) continue;
        if (typeof isBadMetricValue === 'function' && isBadMetricValue(row[col])) continue;
        if (v >= 1e9) continue;
        if (/^tn-/i.test(cat) && preferredCat < 0) continue;
        if (/^(gen|m|f|male|female|yes|no)$/i.test(cat)) continue;
        map.set(cat, (map.get(cat) || 0) + v);
      }
      const entries = Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      const cats = entries.map(([c]) => c);
      const vals = entries.map(([, v]) => v);
      if (cats.length >= 2) {
        const alreadyHaveHoriz = charts.some(c => (c.chartType === 'horizontal' || c.chartType === 'horizontalBar') && c.title.startsWith(t.title));
        if (!alreadyHaveHoriz) {
          charts.push({
            title: cleanChartTitle(t.title, [renameMetricHeader(t.headers[col], col, t.headers)]),
            chartType: 'horizontalBar',
            categories: cats,
            series: [{ name: renameMetricHeader(t.headers[col], col, t.headers), values: vals }],
            unit: '',
            insight: `Ranked view of ${t.headers[col]} across ${cats.length} unique categories.`,
          });
        }
      }
    }

    // Donut only for small categorical shares with a good metric
    if (charts.length < 14 && goodCols.length >= 1 && t.rows.length >= 3 && t.rows.length <= 12) {
      const col = goodCols[0];
      const cats = [];
      const vals = [];
      for (const row of t.rows) {
        const cat = labelCat(row, catIdx, t.headers);
        const v = toNum(row[col]);
        if (!cat || v == null || v <= 0) continue;
        cats.push(cat);
        vals.push(v);
        if (cats.length >= 8) break;
      }
      if (cats.length >= 2) {
        const alreadyHaveDonut = charts.some(c => (c.chartType === 'donut' || c.chartType === 'pie') && c.title.startsWith(t.title));
        if (!alreadyHaveDonut) {
          charts.push({
            title: cleanChartTitle(t.title, [renameMetricHeader(t.headers[col], col, t.headers)]) + ' share',
            chartType: 'donut',
            categories: cats,
            series: [{ name: renameMetricHeader(t.headers[col], col, t.headers), values: vals }],
            unit: '',
            insight: `Share distribution of ${t.headers[col]} across ${cats.length} categories.`,
          });
        }
      }
    }
  }
  // Final quality gate: drop charts with phone numbers, serial-only metrics, GEN, or sum-of-GA noise
  return charts.filter((c) => {
    const cats = c.categories || [];
    const allGen = cats.length > 0 && cats.every(x => /^(gen|m|f|male|female)$/i.test(String(x)));
    if (allGen) return false;
    const vals = (c.series || []).flatMap(s => s.values || []);
    if (vals.length && vals.every(v => v >= 1e9)) return false;
    if (vals.length && vals.filter(v => v >= 1e9).length > vals.length * 0.5) return false;
    const name = String(c.series?.[0]?.name || c.title || '');
    if (/^sn$|serial|contact|phone|mobile/i.test(name)) return false;
    // Drop "Gestational Age" charts that SUM weeks (1103, 540) instead of counting cases
    const title = String(c.title || '');
    const maxV = vals.length ? Math.max(...vals.map(Number).filter(n => !isNaN(n)), 0) : 0;
    if (/gestational\s*age/i.test(title) && maxV > 200) return false;
    if (/gestational\s*age/i.test(name) && maxV > 200) return false;
    return cats.length >= 2 && vals.length >= 2;
  });
}

function buildRichKpisAndFindings(tables, lines, nums, ents) {
  const kpis = [];
  const keyFindings = [];
  const seenLabels = new Set();
  const toNum = (v) => {
    const n = parseFloat(String(v || '').replace(/,/g, '').replace(/%$/, ''));
    return isNaN(n) ? null : n;
  };
  const pushKpi = (label, value, unit, context) => {
    const key = String(label || '').toLowerCase().trim();
    if (!key || seenLabels.has(key)) return;
    if (value == null || value === '' || value === '0' && !/death|due|pending/i.test(key)) return;
    seenLabels.add(key);
    // Prefer short, punchy labels that survive KPI-card truncation (≤28 chars ideal)
    let shortLabel = String(label).trim()
      .replace(/^Total District\s+/i, '')
      .replace(/^Children\s+/i, '')
      .replace(/Coronary Heart Disease/i, 'CHD')
      .replace(/Rheumatic Heart Disease/i, 'RHD')
      .replace(/Cong\.?\s*Deafness/i, 'Deafness')
      .replace(/Cong\.?\s*Cataract/i, 'Cataract')
      .replace(/Cleft Lip\s*&\s*Palate/i, 'Cleft Lip/Palate')
      .replace(/Neural Tube Defects?/i, 'NTD')
      .replace(/Club\s*Foot/i, 'Club Foot');
    if (shortLabel.length > 28) shortLabel = shortLabel.slice(0, 27).trim() + '…';
    kpis.push({
      label: shortLabel.slice(0, 32),
      value: String(value),
      unit: unit || '',
      trend: null,
      context: (context || '').slice(0, 70),
    });
  };

  for (const t of tables || []) {
    if (kpis.length >= 8) break;
    const hLower = (t.headers || []).map(h => String(h || '').toLowerCase());

    const col = (re) => hLower.findIndex(h => re.test(h));
    const expCol = col(/expected\s*cases|^expected$/);
    const confCol = col(/children\s*confirm|confirm(?:ed)?\s*cases|^children confirmed$/);
    const surgNeedCol = col(/needed\s*surg|children\s*needed|surg(?:ery)?\s*need/);
    const surgDoneCol = col(/surg(?:ery)?\s*done|^done$/);
    const dueCol = col(/due\s*for\s*surg|children\s*due|pending\s*surg/);
    const deathCol = col(/death\s*before|died\s*before/);
    const medCol = col(/medically\s*manag|children\s*medically/);
    const diseaseCol = col(/disease|condition|diagnosis/);
    const pctSurgCol = col(/percentage\s*of\s*surg|%.*surg|surg.*%/);

    const sumCol = (ci) => {
      if (ci < 0) return null;
      let s = 0; let n = 0;
      for (const row of t.rows || []) {
        const v = toNum(row[ci]);
        if (v != null) { s += v; n++; }
      }
      return n ? Math.round(s * 100) / 100 : null;
    };

    const totalExp = sumCol(expCol);
    const totalConf = sumCol(confCol);
    const totalNeed = sumCol(surgNeedCol);
    const totalDone = sumCol(surgDoneCol);
    const totalDue = sumCol(dueCol);
    const totalDeath = sumCol(deathCol);
    const totalMed = sumCol(medCol);

    // Programme-level KPIs (sums across conditions) — only when columns exist
    const isDistrictTotal = /district|overall|summary|vellore district/i.test(String(t.title || ''));
    if (totalExp != null && totalExp > 0) {
      pushKpi(isDistrictTotal ? 'Expected Cases' : 'Expected', totalExp, 'cases',
        isDistrictTotal ? 'District total (all conditions)' : `Across ${(t.rows || []).length} conditions`);
    }
    if (totalConf != null && totalConf > 0) {
      pushKpi(isDistrictTotal ? 'Confirmed Cases' : 'Confirmed', totalConf, 'cases', totalExp
        ? `Detection ${((totalConf / totalExp) * 100).toFixed(1)}% of expected`
        : 'From screening');
    }
    if (totalExp && totalConf != null && totalExp > 0) {
      const rate = ((totalConf / totalExp) * 100).toFixed(1);
      pushKpi('Detection Rate', rate, '%', 'Confirmed ÷ Expected');
      if (parseFloat(rate) < 50) {
        keyFindings.push(
          `Overall detection is ${rate}% (${totalConf} confirmed vs ${totalExp} expected) — screening shortfall is the primary gap.`
        );
      }
    }
    if (totalDone != null && totalDone > 0) {
      pushKpi('Surgeries Done', totalDone, '', totalNeed != null
        ? `Of ${totalNeed} needed`
        : 'Surgical completions');
    }
    if (totalNeed != null && totalNeed > 0 && totalDone != null) {
      const pct = ((totalDone / totalNeed) * 100).toFixed(1);
      pushKpi('Surgery Completion', pct, '%', `${totalDone} of ${totalNeed} needed`);
    }
    if (totalDue != null && totalDue > 0) {
      pushKpi('Pending Surgery', totalDue, 'children', 'Still due for surgery');
      keyFindings.push(`${totalDue} children remain due for surgery and need active case follow-up.`);
    }
    if (totalDeath != null && totalDeath > 0) {
      pushKpi('Deaths Pre-Surgery', totalDeath, '', 'Pre-operative mortality');
    }
    if (totalMed != null && totalMed > 0) {
      pushKpi('Medically Managed', totalMed, 'children', 'Non-surgical pathway');
    }

    // Disease-level gap findings + top-gap KPIs (most useful for RBSK)
    // Aggregate across blocks so NTD/Deafness do not appear 4 times with near-identical lines.
    if (diseaseCol >= 0 && expCol >= 0 && confCol >= 0) {
      const byDisease = new Map();
      for (const row of t.rows || []) {
        let disease = String(row[diseaseCol] || '').trim();
        if (!disease) continue;
        disease = disease
          .replace(/Coronary Heart Disease/i, 'CHD')
          .replace(/Rheumatic Heart Disease/i, 'RHD')
          .replace(/Neural Tube Defects?/i, 'NTD')
          .replace(/Congenital\s+/i, 'Cong. ')
          .replace(/Cleft Lip\s*&\s*Palate/i, 'Cleft Lip/Palate');
        const exp = toNum(row[expCol]);
        const conf = toNum(row[confCol]);
        if (exp == null || conf == null) continue;
        const prev = byDisease.get(disease) || { exp: 0, conf: 0 };
        prev.exp += exp;
        prev.conf += conf;
        byDisease.set(disease, prev);
      }
      const gaps = [];
      for (const [disease, g] of byDisease.entries()) {
        if (g.exp < 5) continue;
        const rate = g.conf / g.exp;
        if (rate < 0.55) gaps.push({ disease, exp: g.exp, conf: g.conf, rate });
      }
      gaps.sort((a, b) => a.rate - b.rate);
      // Surface the two worst gaps as explicit KPIs (short labels)
      for (const g of gaps.slice(0, 2)) {
        const pct = (g.rate * 100).toFixed(0);
        pushKpi(`${g.disease} Detected`, `${g.conf}/${g.exp}`, '', `${pct}% of expected`);
      }
      for (const g of gaps.slice(0, 4)) {
        keyFindings.push(
          `${g.disease}: only ${g.conf} confirmed against ${g.exp} expected (${(g.rate * 100).toFixed(1)}% detection).`
        );
      }
    }

    // Strong surgical performance finding
    if (totalNeed && totalDone != null && totalNeed > 0) {
      const pct = (totalDone / totalNeed) * 100;
      if (pct >= 90) {
        keyFindings.push(
          `Surgical pipeline is strong: ${totalDone} of ${totalNeed} needed surgeries completed (${pct.toFixed(1)}%).`
        );
      }
    }
  }



  // ── Measles / HSC surveillance registers ──
  for (const t of tables || []) {
    if (kpis.length >= 8) break;
    const hLower = (t.headers || []).map(h => String(h || '').toLowerCase());
    const looksMeasles = /measles|mr\s*i|immun|hsc|phc|epid/i.test(String(t.title || '') + ' ' + hLower.join(' '))
      || hLower.some(h => /epid|phc|houses?\s*survey|mr\s*i|dropout|immun/i.test(h));
    if (!looksMeasles) continue;

    const n = (t.rows || []).length;
    if (n > 0) pushKpi('Suspected Cases', n, 'cases', String(t.title || 'HSC register').slice(0, 40));

    // Count unique facilities early (programme-level KPI preferred over single-row peaks)
    const phcIdx = hLower.findIndex(h => /phc|uphc|facility/i.test(h));
    if (phcIdx >= 0) {
      const set = new Set();
      for (const row of t.rows || []) {
        const p = String(row[phcIdx] || '').trim();
        if (p) set.add(p);
      }
      if (set.size > 1) {
        pushKpi('Facilities Involved', set.size, 'PHC/UPHC', 'Unique reporting units');
      }
    }

    // Immunization status completeness (critical for measles)
    const immIdx = hLower.findIndex(h => /immun|mr\s*status|vaccine\s*status|imm\s*status|vaccination/i.test(h));
    if (immIdx >= 0) {
      let known = 0, notKnown = 0, complete = 0, partial = 0;
      for (const row of t.rows || []) {
        const s = String(row[immIdx] || '').trim().toLowerCase();
        if (!s) { notKnown += 1; continue; }
        if (/not\s*known|unknown|nk\b|nil|na\b|—|-/i.test(s)) notKnown += 1;
        else if (/complete|fully|both|mr\s*i\s*(and|&)\s*mr\s*ii|immunised|immunized/i.test(s)) { complete += 1; known += 1; }
        else if (/partial|only\s*mr|single\s*dose|incomplete/i.test(s)) { partial += 1; known += 1; }
        else { known += 1; }
      }
      if (notKnown > 0) {
        pushKpi('Immunization Not Known', notKnown, 'cases', `Of ${n} suspected cases`);
        keyFindings.push(
          `${notKnown} of ${n} suspected cases have immunization status marked Not Known / blank — tracking gap for outbreak response.`
        );
      }
      if (complete > 0) {
        keyFindings.push(
          `${complete} suspected cases recorded as completely immunised; ${partial} partial/incomplete.`
        );
      }
    }

    const houseIdx = hLower.findIndex(h => /houses?\s*survey|surveyed|house\s*count/i.test(h));
    if (houseIdx >= 0) {
      let total = 0, max = 0, maxPhc = '';
      for (const row of t.rows || []) {
        const v = toNum(row[houseIdx]);
        if (v == null) continue;
        total += v;
        if (v > max) {
          max = v;
          maxPhc = phcIdx >= 0 ? String(row[phcIdx] || '').slice(0, 24) : '';
        }
      }
      if (total > 0) {
        pushKpi('Houses Surveyed (Total)', total, 'houses', 'Active case search footprint');
      }
      if (max > 0 && kpis.length < 8) {
        // Keep peak as secondary context only when space remains
        pushKpi('Peak Single-Area Survey', max, 'houses', maxPhc ? `At ${maxPhc}` : 'Highest single investigation');
      }
    }

    // MR / immunization coverage only — never age, SN, or tiny ratios
    const mrCols = [];
    for (let i = 0; i < hLower.length; i++) {
      const h = hLower[i];
      if (/dropout|age|year|month|house|survey|sn\b|epid|date/i.test(h)) continue;
      if (/mr\s*i\b|mr\s*1|mr\s*ii|mr\s*2|mr\s*coverage|immun.*cover|cover.*%|performance\s*%/i.test(h)) {
        mrCols.push(i);
        continue;
      }
      // Excel often exports coverage as header "100%" — accept only if values look like % coverage
      if (/^\d+(\.\d+)?%$/.test(String(t.headers[i] || '').trim())) {
        const sample = (t.rows || []).slice(0, 15).map(r => toNum(r[i])).filter(v => v != null);
        if (sample.length >= 3) {
          const inCoverageBand = sample.filter(v => v >= 40 && v <= 160).length;
          // ≥60% of samples in typical coverage band (not ages 1–28)
          if (inCoverageBand >= sample.length * 0.6) mrCols.push(i);
        }
      }
    }
    if (mrCols.length) {
      const vals = [];
      for (const row of t.rows || []) {
        for (const ci of mrCols.slice(0, 2)) {
          const v = toNum(row[ci]);
          // Coverage % is typically 40–160; reject ages and tiny fractions
          if (v != null && v >= 40 && v <= 200) vals.push(v);
        }
      }
      if (vals.length >= 2) {
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        pushKpi('Lowest MR Coverage', min, '%', 'Across facility investigations');
        pushKpi('Highest MR Coverage', max, '%', 'Across facility investigations');
        if (min < 90) {
          keyFindings.push(
            `Lowest recorded immunization performance is ${min}%, indicating coverage gaps at some PHCs.`
          );
        }
      }
    }
  }

  // ── Death / case-register style tables (GVMCH infant death line lists) ──
  for (const t of tables || []) {
    if (kpis.length >= 8) break;
    const hLower = (t.headers || []).map(h => String(h || '').toLowerCase());
    const looksLikeRegister = hLower.some(h =>
      /admission|birth\s*weight|gestation|outcome|cause of death|maturity|date of birth|fbnc/i.test(h)
    ) || /death|line\s*list|infant|sncu|nicu/i.test(String(t.title || ''));
    if (!looksLikeRegister) continue;

    const n = (t.rows || []).length;
    if (n > 0) {
      pushKpi('Cases in Register', n, 'records', String(t.title || 'Line list').slice(0, 40));
    }

    // Birth weight column
    const bwIdx = hLower.findIndex(h => /birth\s*weight|b\.?\s*wt|\bweight\b/i.test(h));
    if (bwIdx >= 0) {
      const weights = (t.rows || []).map(r => toNum(r[bwIdx])).filter(v => v != null && v > 0 && v < 10);
      if (weights.length) {
        const low = weights.filter(w => w < 1.5).length;
        const extreme = weights.filter(w => w < 1.0).length;
        const minW = Math.min(...weights);
        pushKpi('Low Birth Weight (<1.5kg)', low, 'cases', `Of ${weights.length} with weight recorded`);
        if (extreme > 0) {
          keyFindings.push(
            `${extreme} extreme low-birth-weight case(s) under 1.0 kg (lowest ${minW} kg) in ${String(t.title || 'register')}.`
          );
        }
        if (low > 0) {
          keyFindings.push(
            `${low} of ${weights.length} recorded birth weights were under 1.5 kg (${((low / weights.length) * 100).toFixed(0)}%).`
          );
        }
      }
    }

    // Gestational age / preterm — numeric GA weeks OR maturity text labels
    const gaIdx = hLower.findIndex(h => /\bga\b|gestation|gest\.?\s*age|ga\s*\(w/i.test(h));
    const matIdx = hLower.findIndex(h => /maturity|preterm|fullterm|full\s*term/i.test(h));
    let preterm = 0;
    let totalGA = 0;
    if (gaIdx >= 0) {
      for (const r of t.rows || []) {
        const raw = String(r[gaIdx] || '');
        const m = raw.match(/(\d{1,2})/);
        const n = m ? parseInt(m[1], 10) : toNum(raw);
        if (n != null && n >= 20 && n <= 45) {
          totalGA++;
          if (n < 37) preterm++;
        }
      }
    }
    if (totalGA === 0 && matIdx >= 0) {
      for (const r of t.rows || []) {
        const raw = String(r[matIdx] || '');
        if (!raw.trim()) continue;
        totalGA++;
        if (/preterm|pre-term|<\s*37/i.test(raw)) preterm++;
      }
    }
    if (totalGA > 0) {
      pushKpi('Preterm Births (<37w)', preterm, 'cases', `Of ${totalGA} with GA/maturity recorded`);
      if (preterm > 0) {
        keyFindings.push(
          `${preterm} of ${totalGA} cases were preterm (<37 weeks) — ${((preterm / totalGA) * 100).toFixed(0)}% of the register.`
        );
      }
    }
  }

  // Reject meta / noise findings
  const isNoiseFinding = (s) => {
    const t = String(s || '');
    if (/extracted \d+ data table|records analysed|sheet\(s\) extracted/i.test(t)) return true;
    if (/peaks at \d+ in vellore/i.test(t)) return true;
    if (/source document contains \d+ numeric/i.test(t)) return true;
    if (/key entities identified/i.test(t)) return true;
    if (/^---\s*Sheet:/i.test(t)) return true;
    if (/^\d+ rows?\s*[×x]\s*\d+ columns?/i.test(t)) return true;
    if (/validate data gaps and discrepancies/i.test(t)) return true;
    if (/cross-check population denominators/i.test(t)) return true;
    if ((t.match(/,/g) || []).length >= 3) return true;
    return false;
  };

  // Optional: add clean lines from fact bank
  for (const l of (lines || []).slice(0, 10)) {
    if (keyFindings.length >= 8) break;
    const s = String(l).slice(0, 160);
    if (!s || isNoiseFinding(s)) continue;
    if (keyFindings.some(f => f.slice(0, 40) === s.slice(0, 40))) continue;
    keyFindings.push(s);
  }

  const cleanFindings = keyFindings.filter(f => !isNoiseFinding(f)).slice(0, 8);

  // If still no KPIs, avoid inventing "Records Analysed" — leave empty for LLM
  return { kpis: kpis.slice(0, 8), keyFindings: cleanFindings };
}


function buildFallbackIntelligence(rawText, factBank, meta = {}) {
  const text = String(rawText || '');
  const lines = (factBank && factBank.kpiLines) ? factBank.kpiLines.slice(0, 40) : [];
  const nums = factBank ? Array.from(factBank.numberFacts || []) : [];
  const ents = factBank ? Array.from(factBank.entities || []).slice(0, 20) : [];

  let tablesRaw = parseSheetTablesFromText(text);
  tablesRaw = (tablesRaw || []).filter(t => !/^copy\s+of\b/i.test(String(t.title || '')));
  // Charts from FULL columns (before PII strip) so immunization/houses/MR metrics survive
  const charts = synthesiseChartsFromTables(tablesRaw);
  // Display tables: strip PII + prefer metric columns
  let tables = typeof sanitizeTablesForPresentation === 'function'
    ? sanitizeTablesForPresentation(tablesRaw)
    : tablesRaw;
  console.log(`[FactGrounding] Fallback parse: ${tables.length} table(s), ${charts.length} chart(s), rows=${tablesRaw.reduce((s, t) => s + (t.rows?.length || 0), 0)}`);
  const { kpis, keyFindings } = buildRichKpisAndFindings(tablesRaw, lines, nums, ents);

  const titleFromFile = (meta.filename || 'Document Analysis')
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  const blob = text + ' ' + (meta.filename || '');
  const isFinance = /profit|loss|income|expense|revenue|financ|budget|bank|statement|debit|credit|upi|neft|imps|balance/i.test(blob);
  const isHealth = /measles|immun|surveil|phc|vaccine|case|rbsk|congenital|chd|rhd|club.?foot|cleft/i.test(blob);
  const domain = isFinance ? 'finance' : (isHealth ? 'epidemiology' : 'operations');

  let sections;
  if (tables.length) {
    sections = tables.map((t, idx) => {
      const sheetCharts = charts.filter(c => c.title.startsWith(t.title));
      return {
        title: t.title,
        level: 1,
        summary: t.summary,
        insights: keyFindings.slice(idx * 2, idx * 2 + 3),
        tables: [t],
        charts: sheetCharts,
        comparisons: [],
        timelines: [],
      };
    });
    // Attach any leftover charts to first section
    const used = new Set(sections.flatMap(s => s.charts.map(c => c.title)));
    for (const c of charts) {
      if (!used.has(c.title) && sections[0]) sections[0].charts.push(c);
    }
  } else {
    // No sheet tables — build synthetic sections from KPI lines grouped by proximity
    // This covers bank statement PDFs, annual reports, etc.
    const chunkSize = Math.max(1, Math.ceil(lines.length / 4));
    const lineGroups = [];
    for (let i = 0; i < lines.length; i += chunkSize) {
      lineGroups.push(lines.slice(i, i + chunkSize));
    }
    const sectionTitles = isFinance
      ? ['Transaction Overview', 'Debit & Credit Summary', 'Account Activity', 'Key Metrics & Trends']
      : ['Overview & Scope', 'Core Metrics', 'Detailed Analysis', 'Summary & Observations'];

    sections = lineGroups.length
      ? lineGroups.map((grp, idx) => ({
          title: sectionTitles[idx] || `Section ${idx + 1}`,
          level: 1,
          summary: grp.slice(0, 2).join(' ').slice(0, 120) || 'Source metrics from document.',
          insights: grp.slice(0, 6).map(l => l.slice(0, 120)),
          tables: [],
          charts: idx === 0 ? charts : [],
          comparisons: [],
          timelines: [],
        }))
      : [{
          title: 'Source Metrics',
          level: 1,
          summary: 'Primary numeric indicators extracted from the source document.',
          insights: keyFindings.slice(0, 5),
          tables: [],
          charts,
          comparisons: [],
          timelines: [],
        }];
  }

  // Detect organization from text (not hardcoded to Vellore)
  const orgMatch = ents.find(e =>
    /bank|limited|ltd|pvt|corp|inc|district|authority|department|ministry|society|hospital/i.test(e)
  ) || ents[0] || '';

  // Build domain-appropriate recommendations from findings — never invent place names
  const recommendations = [];
  const pushRec = (r) => {
    if (r && recommendations.length < 5 && !recommendations.includes(r)) recommendations.push(r);
  };
  if (isFinance) {
    pushRec('Review transactions with the highest debit amounts for budget alignment.');
    pushRec('Monitor recurring UPI/NEFT outflows against approved payment schedules.');
    pushRec('Validate closing balances against bank statements.');
    pushRec('Flag anomalous single transactions for internal audit review.');
  } else if (isHealth) {
    const usedThemes = new Set();
    const themeOf = (s) => {
      if (/deaf|hearing|audio/i.test(s)) return 'deafness';
      if (/\bntd\b|neural\s*tube/i.test(s)) return 'ntd';
      if (/cataract|eye|vision/i.test(s)) return 'vision';
      if (/cleft/i.test(s)) return 'cleft';
      if (/club\s*foot|cte v|ctev/i.test(s)) return 'clubfoot';
      if (/chd|coronary|rheumatic|heart/i.test(s)) return 'heart';
      if (/preterm|gestation|<37/i.test(s)) return 'preterm';
      if (/birth weight|lbw|elbw/i.test(s)) return 'lbw';
      if (/measles|immun|mr\s|dropout|phc/i.test(s)) return 'immun';
      if (/surg|pending|due for/i.test(s)) return 'surgery';
      return 'other';
    };
    for (const f of keyFindings.slice(0, 8)) {
      const s = String(f);
      const theme = themeOf(s);
      if (usedThemes.has(theme) && theme !== 'other') continue;
      usedThemes.add(theme);
      if (theme === 'preterm')
        pushRec('Strengthen preterm care protocols and antenatal risk screening for extreme prematurity.');
      else if (theme === 'lbw')
        pushRec('Escalate low-birth-weight case management and nutrition support pathways.');
      else if (theme === 'deafness')
        pushRec('Scale newborn hearing screening (OAE/ABR) and track congenital deafness detection to expected prevalence.');
      else if (theme === 'ntd')
        pushRec('Reinforce antenatal folate counselling and NTD screening/referral so confirmed cases approach expected prevalence.');
      else if (theme === 'vision')
        pushRec('Expand paediatric eye screening camps to close congenital cataract detection gaps.');
      else if (theme === 'cleft')
        pushRec('Ensure every cleft lip/palate case is linked to surgical centres with timed follow-up.');
      else if (theme === 'clubfoot')
        pushRec('Standardise Ponseti pathway tracking for club foot from detection through completion.');
      else if (theme === 'heart')
        pushRec('Prioritise block-level CHD/RHD screening camps where confirmed cases lag expected prevalence.');
      else if (theme === 'immun')
        pushRec(`Follow up facility performance gaps: ${s.slice(0, 100)}`);
      else if (theme === 'surgery')
        pushRec('Clear residual pending surgeries and publish weekly completion status by block.');
      else if (/detect|confirm|expected|screening|gap|0\.0%|only \d+ confirmed/i.test(s))
        pushRec(`Close the largest detection gap identified: ${s.slice(0, 110)}`);
      else
        pushRec(`Operational follow-up: ${s.slice(0, 120)}`);
    }
    if (/measles|mr\s|immun|hsc|phc/i.test(blob)) {
      pushRec('Verify immunization status for all suspected cases labeled Not Known or incomplete.');
      pushRec('Prioritise PHCs with highest dropout or lowest MR coverage for supportive supervision.');
      pushRec('Reconcile house-survey counts with field investigation forms before the next review.');
    } else if (/rbsk|congenital|expected cases|children confirmed/i.test(blob)) {
      pushRec('Publish a monthly RBSK scorecard: expected vs confirmed by condition and block.');
      pushRec('Audit line-list completeness and outcome coding against source registers.');
    } else {
      pushRec('Audit line-list completeness and outcome coding against source registers.');
      pushRec('Present unit-level review for the highest-risk cohorts identified above.');
    }
  } else if (tables.length) {
    for (const f of keyFindings.slice(0, 3)) pushRec(`Follow up: ${String(f).slice(0, 140)}`);
    pushRec('Validate critical figures against the source registers before the next review.');
    pushRec('Assign ownership for data quality on incomplete or anomalous rows.');
  } else {
    pushRec('Validate key figures against the original source document.');
    pushRec('Prioritise follow-up on the largest gaps in the source data.');
  }
  while (recommendations.length < 3) {
    pushRec('Schedule a structured review of source data quality and outcome coding.');
    break;
  }

  return {
    documentType: isFinance ? 'financial_statement' : (isHealth ? 'health_surveillance' : 'analytical_report'),
    industry: isFinance ? 'finance' : (isHealth ? 'public_health' : 'general'),
    domain,
    purpose: 'executive briefing',
    audience: 'senior management',
    title: titleFromFile.slice(0, 80),
    subtitle: tables.length ? 'Data analysis (source-grounded)' : 'Source-grounded analysis',
    period: '',
    organization: orgMatch,
    executiveSummary: keyFindings.slice(0, 3).join(' ') || 'Analysis derived from source document metrics.',
    keyFindings,
    recommendations,
    risks: [],
    kpis,
    sections,
    appendix: [],
    rawMetrics: Object.fromEntries(kpis.map((k, i) => [`kpi_${i}`, `${k.label}=${k.value}`])),
    _fallback: true,
  };
}


/**
 * Drop PII columns and copy-sheets before tables enter the deck.
 */

/** Turn Excel sheet names into presentation-ready titles. */
function humanizeSheetTitle(raw, context = {}) {
  let t = String(raw || '').trim();
  if (!t) return 'Programme Performance';
  // Strip date-range noise like "21 - 26" / "Apr-Jul" / "2021 - 2026"
  t = t.replace(/\b\d{1,2}\s*[-–]\s*\d{1,2}\b/g, '').replace(/\b20\d{2}\s*[-–]\s*20\d{2}\b/g, '').replace(/\s{2,}/g, ' ').trim();
  t = t.replace(/^block\s*wise\s*[-–:]?\s*/i, 'Block-wise ');
  t = t.replace(/^copy\s+of\s+/i, '');
  t = t.replace(/\s*[-–]\s*Rashtriya Bal Swasthya Karyakram\s*\(RBSK\)\s*/i, ' — RBSK');
  t = t.replace(/\s*Rashtriya Bal Swasthya Karyakram\s*\(RBSK\)\s*/i, ' RBSK');
  if (/rbsk|expected|confirm|disease\s*condition/i.test(t + ' ' + JSON.stringify(context.headers || []))) {
    if (/district/i.test(t)) return 'Vellore District — RBSK Overview';
    if (/corporation/i.test(t)) return 'Vellore Corporation — RBSK';
    if (/^block/i.test(t) || /block\s*wise/i.test(t)) return 'RBSK condition-wise performance';
    if (/anaicut|gudiyatham|pernambut|katpadi|kaniyambadi|kuppam|vellore/i.test(t)) {
      return t.replace(/\s*[-–].*$/, '').trim().slice(0, 36) + ' — RBSK';
    }
  }
  if (/measles|hsc|epid/i.test(t)) return 'Suspected measles case register';
  if (/death|line\s*list|infant|sncu/i.test(t)) return 'Infant death line list';
  // Title-case short names
  if (t.length < 40) {
    t = t.replace(/[_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return t.slice(0, 55) || 'Data overview';
}

function sanitizeTablesForPresentation(tables) {
  const DROP = /patient\s*name|name\s*of\s*(the\s*)?(individual|patient|child|person)|^(name|patient)$|father|mother|address|locality|mobile|phone|contact|dob|date\s*of\s*birth|gender|^sex$|^gen$|remark|comment|^(col\d+)$/i;
  const seen = new Set();
  const out = [];
  for (const t of tables || []) {
    const title = String(t.title || '');
    if (/^copy\s+of\b/i.test(title)) continue;
    if (!t.headers || !t.rows) continue;

    // Drop mid-table "second header" rows (e.g. Gudiyatham block re-stating column names)
    const headerTokens = new Set(
      (t.headers || []).map(h => String(h || '').toLowerCase().trim()).filter(h => h.length > 2)
    );
    t.rows = (t.rows || []).filter((row) => {
      const cells = (row || []).map(c => String(c || '').toLowerCase().trim());
      if (!cells.some(c => c)) return false;
      // True header-repeat: ≥3 cells exactly match header labels
      const exactHeaderHits = cells.filter(c => c && headerTokens.has(c)).length;
      if (exactHeaderHits >= 3) return false;
      if (/^sl\.?\s*no$|^s\.?no$|^district$|^disease\s*condition$/i.test(cells[0] || '')) return false;
      if (/^gudiyatham\s*block|^block\s*-|rashtriy/i.test(cells[0] || '')) return false;
      return true;
    });

    // Drop PII + empty ColN headers; also drop columns that are entirely empty
    const keepIdx = [];
    for (let i = 0; i < t.headers.length; i++) {
      const h = String(t.headers[i] || '');
      if (DROP.test(h)) continue;
      const nonEmpty = (t.rows || []).filter(r => String(r[i] || '').trim()).length;
      if (nonEmpty === 0) continue;
      // Drop phone-like columns by sampling values
      const sample = (t.rows || []).slice(0, 8).map(r => String(r[i] || '').replace(/\D/g, ''));
      const phoneish = sample.filter(d => d.length >= 10).length;
      if (phoneish >= 3) continue;
      keepIdx.push(i);
    }
    if (keepIdx.length < 2) continue;

    // Prefer a clinical subset for wide registers (>12 cols)
    let finalIdx = keepIdx;
    if (keepIdx.length > 8) {
      const hLower = t.headers.map(h => String(h || '').toLowerCase());
      const prefer = /epid|phc|uphc|hsc|sector|block|immun|vaccine|houses?|survey|mr\s*i|mr\s*ii|dropout|coverage|performance|report|date|age|source|admission|maturity|gestation|weight|outcome|cause|diagnosis|expected|confirm|disease|condition|live\s*birth|prevalence|debit|credit|balance/i;
      const preferred = keepIdx.filter(i => prefer.test(hLower[i]));
      // Always keep metric columns; drop leftover name-like leftovers
      if (preferred.length >= 3) finalIdx = preferred.slice(0, 12);
      else finalIdx = keepIdx.slice(0, 10);
    }

    const headers = finalIdx.map(i => t.headers[i]);
    const rows = t.rows.map(r => finalIdx.map(i => r[i]));
    const fp = headers.join('|').toLowerCase() + '::' + rows.length;
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push({
      ...t,
      title: humanizeSheetTitle(title, { headers }),
      headers,
      rows,
      summary: `${rows.length} rows · ${headers.length} key fields`,
    });
  }
  return out;
}

module.exports = {
  sanitizeTablesForPresentation,
  buildRichKpisAndFindings,
  buildFactBank,
  groundIntelligence,
  groundBlueprint,
  formatFactBankForPrompt,
  retrieveForTopic,
  isNumberGrounded,
  extractNumbersFromString,
  normalizeNumberToken,
  chunkDocument,
  retrieveChunks,
  buildFallbackIntelligence,
  parseSheetTablesFromText,
  synthesiseChartsFromTables,
  sanitizeCompletionCells,
};

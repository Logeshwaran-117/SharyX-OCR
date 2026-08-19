'use strict';

/**
 * tableReconstructor.js
 *
 * Repairs tables destroyed by column-major PDF text extraction and recovers
 * sparse columns using running-total alignment. Domain-agnostic: works on any
 * ledger, register, results table, budget, or line-listing that contains a
 * cumulative numeric column.
 */

const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
const RE = {
  dateWord: new RegExp(`^\\d{1,2}[\\s\\-/](?:${MONTHS})[a-z]*[\\s\\-/]\\d{2,4}$`, 'i'),
  dateNum: /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/,
  money: /^(?:INR|Rs\.?|₹|\$|€|£|USD|EUR|GBP|AED)?\s*-?\d{1,3}(?:[,\u00A0]\d{2,3})*(?:\.\d{1,2})?\s*(?:CR|DR)?$/i,
  plainNum: /^-?\d+(?:\.\d+)?%?$/,
  headerish: /^#{0,4}\s*[A-Z][A-Za-z0-9 ()/&.'%-]{1,38}$/,
  noise: /^(page\s*\d+|\d+\s*\/\s*\d+|continued|contd\.?)$/i,
};

const strip = (s) => String(s ?? '').replace(/^#{1,6}\s*/, '').trim();

function numOf(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v ?? '').replace(/[,\s₹$€£%]/g, '').replace(/\b(?:INR|Rs\.?|USD|EUR|GBP|AED)\b/gi, '');
  const neg = /^\(.*\)$/.test(s) || /DR$/i.test(String(v));
  const m = s.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? (neg && n > 0 ? -n : n) : null;
}

function classify(line) {
  const s = strip(line);
  if (!s) return 'blank';
  if (RE.noise.test(s)) return 'noise';
  if (RE.dateWord.test(s) || RE.dateNum.test(s)) return 'date';
  if (RE.money.test(s)) return 'money';
  if (RE.plainNum.test(s)) return 'number';
  return 'text';
}

/* ── Step 1: split raw text into labelled column runs ──────────────────── */

function extractColumnRuns(text, { minRun = 3 } = {}) {
  const lines = String(text || '').split(/\r?\n/).map(strip).filter((l) => l && classify(l) !== 'noise');
  const runs = [];
  let i = 0;

  while (i < lines.length) {
    const label = lines[i];
    const labelKind = classify(label);

    // A header is a short non-value line followed by a homogeneous value run.
    if (labelKind === 'text' && RE.headerish.test(label)) {
      let j = i + 1;
      const kinds = new Set();
      const values = [];
      while (j < lines.length) {
        const k = classify(lines[j]);
        if (k === 'text' && RE.headerish.test(lines[j]) && values.length >= minRun) break;
        kinds.add(k);
        values.push(lines[j]);
        j++;
        // stop when the run becomes mixed AND we already have a clean block
        if (kinds.size > 2 && values.length >= minRun) break;
      }
      if (values.length >= minRun) {
        runs.push({ header: label, values, kind: dominantKind(values) });
        i = j;
        continue;
      }
    }
    i++;
  }
  return runs;
}

function dominantKind(values) {
  const tally = {};
  for (const v of values) tally[classify(v)] = (tally[classify(v)] || 0) + 1;
  return Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
}

/* ── Step 2: detect a running-total column ────────────────────────────── */

/**
 * A column behaves like a running total when it is fully populated, numeric,
 * and its successive deltas are explained by the values sitting in the other
 * numeric columns. Works for ledgers, stock registers, budget burn-down, etc.
 */
function findRunningTotalColumn(runs) {
  const numericRuns = runs.filter((r) => r.kind === 'money' || r.kind === 'number');
  if (numericRuns.length < 2) return null;
  // the longest numeric run is the candidate; a running total has one entry per row
  return numericRuns.reduce((a, b) => (b.values.length > a.values.length ? b : a));
}

/**
 * Assign sparse amount columns to rows using balance deltas.
 * Returns { ok, assignment: Array<{colHeader, value}|null>[], leftover }
 */
function alignByRunningTotal(totalCol, sparseCols, openingValue, tol = 0.02) {
  const totals = totalCol.values.map(numOf);
  if (totals.some((v) => v == null)) return { ok: false, reason: 'non-numeric running total' };

  const pools = sparseCols.map((c) => ({
    header: c.header,
    items: c.values.map((v, idx) => ({ idx, raw: v, n: Math.abs(numOf(v) ?? NaN) })).filter((x) => Number.isFinite(x.n)),
    used: new Set(),
  }));

  const rows = [];
  let prev = openingValue;

  for (let r = 0; r < totals.length; r++) {
    const cur = totals[r];
    // if we have no opening value, infer it from the first resolvable amount
    if (prev == null) {
      const guess = inferOpening(cur, pools, tol);
      if (guess == null) return { ok: false, reason: 'cannot infer opening value' };
      prev = guess;
    }
    const delta = +(cur - prev).toFixed(2);
    const target = Math.abs(delta);
    const wantSign = delta < 0 ? 'negative' : delta > 0 ? 'positive' : 'zero';

    let placed = null;
    for (const pool of pools) {
      const hit = pool.items.find((it) => !pool.used.has(it.idx) && Math.abs(it.n - target) <= tol);
      if (!hit) continue;
      // sign discipline: a column may only ever take one polarity
      pool.polarity = pool.polarity || wantSign;
      if (wantSign !== 'zero' && pool.polarity !== wantSign) continue;
      pool.used.add(hit.idx);
      placed = { header: pool.header, value: hit.raw, n: hit.n, direction: wantSign };
      break;
    }

    if (!placed && target > tol) return { ok: false, reason: `unmatched delta ${delta} at row ${r + 1}` };
    rows.push({ rowIndex: r, total: cur, delta, amount: placed });
    prev = cur;
  }

  const leftover = pools.reduce((s, p) => s + (p.items.length - p.used.size), 0);
  return { ok: leftover === 0, rows, leftover, pools };
}

function inferOpening(firstTotal, pools, tol) {
  for (const pool of pools) {
    for (const it of pool.items) {
      for (const cand of [firstTotal - it.n, firstTotal + it.n]) {
        if (Number.isFinite(cand)) return +cand.toFixed(2);
      }
    }
  }
  return null;
}

/* ── Step 3: public API ───────────────────────────────────────────────── */

/**
 * @returns {{headers:string[], rows:string[][], method:string, confidence:number, warnings:string[]}|null}
 */
function reconstructTable(text, opts = {}) {
  const warnings = [];
  const runs = extractColumnRuns(text, opts);
  if (runs.length < 2) return null;

  const lengths = runs.map((r) => r.values.length);
  const modal = lengths.sort((a, b) =>
    lengths.filter((v) => v === b).length - lengths.filter((v) => v === a).length)[0];

  const complete = runs.filter((r) => r.values.length === modal);
  const sparse = runs.filter((r) => r.values.length !== modal && r.values.length > 0);

  // Case A — all columns aligned: straight zip.
  if (!sparse.length) {
    return {
      headers: complete.map((c) => c.header),
      rows: Array.from({ length: modal }, (_, i) => complete.map((c) => c.values[i] ?? '')),
      method: 'zip',
      confidence: 0.95,
      warnings,
    };
  }

  // Case B — sparse numeric columns: align via running total.
  const totalCol = findRunningTotalColumn(complete);
  if (totalCol) {
    const aligned = alignByRunningTotal(totalCol, sparse, opts.openingValue ?? null, opts.tolerance ?? 0.02);
    if (aligned.ok || (aligned.rows && aligned.leftover <= 1)) {
      if (!aligned.ok) warnings.push(`${aligned.leftover} amount(s) could not be placed`);
      const others = complete.filter((c) => c !== totalCol);
      const sparseHeaders = sparse.map((s) => s.header);
      return {
        headers: [...others.map((c) => c.header), ...sparseHeaders, totalCol.header],
        rows: aligned.rows.map((r) => [
          ...others.map((c) => c.values[r.rowIndex] ?? ''),
          ...sparseHeaders.map((h) => (r.amount && r.amount.header === h ? r.amount.value : '')),
          totalCol.values[r.rowIndex] ?? '',
        ]),
        method: 'running-total-alignment',
        confidence: aligned.ok ? 0.9 : 0.7,
        warnings,
      };
    }
    warnings.push(`running-total alignment failed: ${aligned.reason}`);
  }

  warnings.push('sparse columns present and unalignable');
  return {
    headers: complete.map((c) => c.header),
    rows: Array.from({ length: modal }, (_, i) => complete.map((c) => c.values[i] ?? '')),
    method: 'partial-zip',
    confidence: 0.35,
    warnings,
  };
}

/** True when the text looks column-major and therefore unusable as-is. */
function isColumnMajor(text) {
  const t = String(text || '');
  const rowsIntact = (t.match(/\n[^\n]{20,}?\d[\d,]*\.\d{2}[^\n]{0,40}\d[\d,]*\.\d{2}/g) || []).length;
  const runs = extractColumnRuns(t);
  return runs.length >= 3 && rowsIntact < 3;
}

module.exports = { reconstructTable, isColumnMajor, extractColumnRuns, alignByRunningTotal, numOf, classify };

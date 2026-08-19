import React, { useEffect, useState } from "react";
import api from "../api";

/**
 * GeminiUsagePanel — Full token-usage display for all 3 summarizer UIs.
 *
 * Props:
 *   type  — "summarize" | "tables" | "banking"  (which quota bucket to highlight)
 *   className — extra Tailwind classes
 *
 * Fetches /api/billing/status on mount (and whenever `key` changes from parent).
 */
export default function UsageBadge({ type = "summarize", className = "" }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    api.get("/api/billing/status")
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) return (
    <div className={`p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 animate-pulse ${className}`}>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-3" />
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
    </div>
  );

  if (error || !data) return null;

  // Pluck the relevant usage bucket
  const usage   = data.usage?.[type] || data.usage?.summarize || {};
  const used      = usage.used      ?? 0;
  const limit     = usage.limit     ?? null;
  const remaining = usage.remaining ?? null;
  // Prefer the per-bucket daily reset date; fall back to the top-level dailyResetAt
  const resetDate = usage.resetDate ?? data.dailyResetAt ?? data.resetDate;
  const unlimited = limit === -1 || limit === Infinity || remaining === Infinity;
  const pct       = unlimited ? 0 : Math.min(100, limit > 0 ? Math.round((used / limit) * 100) : 0);

  // Gemini token counts (global, from billing status if available)
  const tokens       = data.tokens    || {};
  const tokensUsed   = tokens.used      ?? null;
  const tokensLimit  = tokens.limit     ?? null;
  const tokensRemain = tokens.remaining ?? null;
  const tokensPct    = (tokensLimit && tokensLimit > 0 && tokensUsed !== null)
    ? Math.min(100, Math.round((tokensUsed / tokensLimit) * 100))
    : null;

  const formattedReset = resetDate
    ? new Date(resetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const barColor = pct >= 90 ? "bg-red-500"
    : pct >= 70 ? "bg-yellow-500"
    : "bg-blue-500";

  const LABELS = {
    summarize: "Doc Summaries",
    presentation: "PPT Generation",
    tables: "Table Extractions",
    banking: "Banking Analyses"
  };
  const label = LABELS[type] || "PPT Generation";

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <span className="text-base">✨</span>
        <h4 className="text-xs font-bold text-gray-800 dark:text-gray-100 tracking-wide uppercase">Gemini Usage</h4>
        <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
          {data.planName || "Free"}
        </span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* This-type quota */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">{label}</span>
            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 tabular-nums">
              {unlimited ? "∞ Unlimited" : `${used} / ${limit}`}
            </span>
          </div>
          {!unlimited && (
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          <div className="flex justify-between mt-1">
            {!unlimited && (
              <span className={`text-[10px] font-medium ${remaining === 0 && !unlimited ? "text-red-500" : "text-gray-400 dark:text-gray-500"}`}>
                {remaining === 0 && !unlimited ? "Limit reached" : `${remaining ?? 0} remaining`}
              </span>
            )}
            {!unlimited && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums ml-auto">{pct}%</span>
            )}
          </div>
        </div>

        {/* Gemini token pool (if backend exposes it) */}
        {tokensUsed !== null && tokensLimit !== null && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Gemini Tokens</span>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 tabular-nums">
                {tokensUsed.toLocaleString()} / {tokensLimit === -1 ? "∞" : tokensLimit.toLocaleString()}
              </span>
            </div>
            {tokensLimit !== -1 && tokensPct !== null && (
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${tokensPct >= 90 ? "bg-red-500" : tokensPct >= 70 ? "bg-yellow-500" : "bg-indigo-500"}`}
                  style={{ width: `${tokensPct}%` }}
                />
              </div>
            )}
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {tokensRemain !== null && tokensLimit !== -1
                  ? `${tokensRemain.toLocaleString()} remaining`
                  : "Unlimited"}
              </span>
              {tokensPct !== null && tokensLimit !== -1 && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">{tokensPct}%</span>
              )}
            </div>
          </div>
        )}

        {/* Reset info — limits are daily, not monthly */}
        <p className="text-[10px] text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-700">
          🔄 Resets daily at midnight
          {formattedReset && (
            <span className="font-medium text-gray-500 dark:text-gray-400"> · next {formattedReset}</span>
          )}
        </p>
      </div>
    </div>
  );
}
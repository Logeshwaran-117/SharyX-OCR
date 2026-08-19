/**
 * UsageDashboard.jsx — Standalone API Key Usage page
 * Kept as a standalone route (/usage-dashboard) AND embedded in AdminPanel.
 * Connects to: /api/usage/today, /api/usage/history, /api/usage/stream
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Activity, AlertTriangle, KeyRound, RefreshCw,
  TrendingUp, Cpu, Server, Clock, ChevronUp, ChevronDown,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import api from "../api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  primary: "#6366f1",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  cyan: "#06b6d4",
};

const TOOLTIP_STYLE = {
  background: "#0f172a",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  color: "#e2e8f0",
  fontSize: 12,
  boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
function pct(n, total) { return !total ? 0 : Math.min(100, Math.round((n / total) * 100)); }
function timeAgo(iso) {
  if (!iso) return "Never";
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skel = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
);

// ── Progress Bar ──────────────────────────────────────────────────────────────
function Bar2({ value = 0, color }) {
  const c = value >= 90 ? C.danger : value >= 70 ? C.warning : color;
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
      <motion.div className="h-full rounded-full" style={{ background: c }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, color, glow, sub }) {
  return (
    <motion.div whileHover={{ y: -2 }}
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${glow || color + "20"} 0%, transparent 70%)` }} />
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 relative z-10" style={{ background: color + "20" }}>
        <Icon size={16} style={{ color }} />
      </div>
      <p className="text-2xl font-bold tabular-nums relative z-10" style={{ color: "#f1f5f9" }}>{value}</p>
      <p className="text-xs mt-0.5 relative z-10" style={{ color: "#64748b" }}>{label}</p>
      {sub && <p className="text-[11px] mt-0.5 relative z-10" style={{ color: "#475569" }}>{sub}</p>}
    </motion.div>
  );
}

// ── Key Card ──────────────────────────────────────────────────────────────────
function KeyCard({ keyData }) {
  const {
    keyLabel, isActive, requestCount, rateLimitHits, errorCount,
    inputTokens, outputTokens, totalTokens, byFeature,
    dailyRequestLimit, dailyTokenBudget, remainingRequests, remainingTokens,
    requestUsagePct = 0, tokenUsagePct = 0, lastRequestAt, keyIndex,
  } = keyData;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: keyIndex * 0.06 }}
      className="rounded-2xl p-5 relative flex flex-col gap-4"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: isActive ? `1px solid ${C.primary}` : "1px solid rgba(255,255,255,0.07)",
        boxShadow: isActive ? `0 0 24px ${C.primary}25` : "0 4px 24px rgba(0,0,0,0.3)",
      }}
    >
      {/* Active badge */}
      {isActive && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${C.primary}20`, color: C.primary, border: `1px solid ${C.primary}40` }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.primary }} />
          ACTIVE
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
          style={{ background: isActive ? `linear-gradient(135deg, ${C.primary}, #8b5cf6)` : "rgba(255,255,255,0.07)", color: "#fff" }}>
          {keyIndex + 1}
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>{keyLabel}</p>
          <p className="text-xs" style={{ color: "#475569" }}>Last used {timeAgo(lastRequestAt)}</p>
        </div>
      </div>

      {/* Quotas */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "#64748b" }}>
            <span>Requests</span>
            <span>{fmt(requestCount)} / {fmt(dailyRequestLimit)}</span>
          </div>
          <Bar2 value={requestUsagePct} color={C.primary} />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "#64748b" }}>
            <span>Tokens</span>
            <span>{fmt(totalTokens)} / {fmt(dailyTokenBudget)}</span>
          </div>
          <Bar2 value={tokenUsagePct} color={C.purple} />
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Remaining", value: fmt(remainingRequests), color: C.success },
          { label: "Rate Limits", value: rateLimitHits, color: rateLimitHits > 0 ? C.warning : "#475569" },
          { label: "Errors", value: errorCount, color: errorCount > 0 ? C.danger : "#475569" },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center rounded-xl p-2.5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[11px] mb-0.5" style={{ color: "#475569" }}>{label}</p>
            <p className="text-sm font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Token I/O */}
      <div className="flex gap-4 text-xs pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "#64748b" }}>
        <span>↑ <b style={{ color: "#94a3b8" }}>{fmt(inputTokens)}</b> in</span>
        <span>↓ <b style={{ color: "#94a3b8" }}>{fmt(outputTokens)}</b> out</span>
        <span className="ml-auto font-medium" style={{ color: "#94a3b8" }}>{fmt(remainingTokens)} left</span>
      </div>

      {/* Feature breakdown */}
      {byFeature && (
        <div className="space-y-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#475569" }}>By Feature</p>
          {Object.entries(byFeature).map(([feat, stats]) => (
            <div key={feat} className="flex items-center justify-between text-xs">
              <span className="capitalize" style={{ color: "#64748b" }}>{feat}</span>
              <div className="flex gap-2">
                <span className="px-1.5 py-0.5 rounded-md text-[11px]" style={{ background: `${C.primary}15`, color: C.primary }}>
                  {fmt(stats.requests)} req
                </span>
                <span className="px-1.5 py-0.5 rounded-md text-[11px]" style={{ background: `${C.purple}15`, color: C.purple }}>
                  {fmt(stats.tokens)} tok
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── History Charts ────────────────────────────────────────────────────────────
function HistoryCharts({ history }) {
  if (!history?.length) return null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Request history */}
      <div className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-sm font-semibold mb-1" style={{ color: "#f1f5f9" }}>Daily Requests</p>
        <p className="text-xs mb-4" style={{ color: "#64748b" }}>Last {history.length} days</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={history} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false}
              tickFormatter={v => v?.slice(5) || v} />
            <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [fmt(v), "Requests"]} />
            <Bar dataKey="requestCount" fill={C.primary} radius={[4, 4, 0, 0]} name="Requests" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Token history */}
      <div className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-sm font-semibold mb-1" style={{ color: "#f1f5f9" }}>Daily Tokens</p>
        <p className="text-xs mb-4" style={{ color: "#64748b" }}>Last {history.length} days</p>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={history}>
            <defs>
              <linearGradient id="tokGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.purple} stopOpacity={0.3} />
                <stop offset="100%" stopColor={C.purple} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false}
              tickFormatter={v => v?.slice(5) || v} />
            <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [fmt(v), "Tokens"]} />
            <Area type="monotone" dataKey="totalTokens" stroke={C.purple} strokeWidth={2} fill="url(#tokGrad)" name="Tokens" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function UsageDashboard() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  const [historyDays, setHistoryDays] = useState(7);
  const sseRef = useRef(null);

  const loadHistory = useCallback(async (days = historyDays) => {
    try {
      const { data: r } = await api.get(`/api/usage/history?days=${days}`);
      if (r.success) setHistory(r.data);
    } catch {}
  }, [historyDays]);

  useEffect(() => {
    let es;
    const connect = () => {
      es = new EventSource(`${API_BASE}/api/usage/stream`, { withCredentials: true });
      es.onmessage = e => {
        try {
          const p = JSON.parse(e.data);
          p.error ? setError(p.error) : (setData(p), setError(null));
        } catch {}
      };
      es.onerror = () => { es.close(); setTimeout(connect, 5000); };
      sseRef.current = es;
    };
    connect();
    loadHistory();
    const hi = setInterval(() => loadHistory(), 5 * 60 * 1000);
    const ti = setInterval(() => setTick(t => t + 1), 30_000);
    return () => { sseRef.current?.close(); clearInterval(hi); clearInterval(ti); };
  }, [loadHistory]);

  // Loading / error
  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        {error ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(239,68,68,0.1)" }}>
              <AlertTriangle size={28} style={{ color: C.danger }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: C.danger }}>{error}</p>
            <p className="text-xs mt-1" style={{ color: "#475569" }}>Admin access required</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: `${C.primary}20` }}>
              <RefreshCw size={20} className="animate-spin" style={{ color: C.primary }} />
            </div>
            <p className="text-sm" style={{ color: "#64748b" }}>Connecting to live stream…</p>
          </div>
        )}
      </div>
    );
  }

  const { keys = [], totals = {}, currentKeyIndex = 0, lastRotatedAt, date } = data;

  return (
    <div className="space-y-6 pb-10" style={{ color: "#e2e8f0" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#f1f5f9" }}>API Key Usage</h1>
          <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>
            Gemini · {date} (UTC) ·{" "}
            <span style={{ color: C.primary }}>Key {currentKeyIndex + 1}</span> active
            {lastRotatedAt && <span style={{ color: "#475569" }}> · rotated {timeAgo(lastRotatedAt)}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ background: `${C.success}15`, color: C.success, border: `1px solid ${C.success}30` }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.success }} />
          Live · updates every 10s
        </div>
      </div>

      {/* Last request banner */}
      {data.lastUsageMetadata && (
        <div className="flex flex-wrap gap-4 items-center px-4 py-3 rounded-2xl text-xs"
          style={{ background: `${C.primary}12`, border: `1px solid ${C.primary}30`, color: "#94a3b8" }}>
          <span>
            Last via <span style={{ color: C.primary }}>Key {(data.lastRequestKeyIndex ?? currentKeyIndex) + 1}</span>
            <span style={{ color: "#64748b" }}> · {data.lastRequestFeature || "—"}</span>
          </span>
          <div className="ml-auto flex gap-4">
            <span>↑ <b style={{ color: "#e2e8f0" }}>{fmt(data.lastUsageMetadata.promptTokenCount)}</b> in</span>
            <span>↓ <b style={{ color: "#e2e8f0" }}>{fmt(data.lastUsageMetadata.candidatesTokenCount)}</b> out</span>
            <span>Total: <b style={{ color: "#e2e8f0" }}>{fmt(data.lastUsageMetadata.totalTokenCount)}</b></span>
            <span style={{ color: "#475569" }}>· {timeAgo(data.lastRequestAt)}</span>
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard icon={Activity} label="Requests Today" value={fmt(totals.requestCount)} color={C.primary} />
        <KPICard icon={Cpu} label="Tokens Used" value={fmt(totals.totalTokens)} color={C.purple} />
        <KPICard icon={AlertTriangle} label="Rate Limit Hits" value={totals.rateLimitHits ?? 0} color={totals.rateLimitHits > 0 ? C.warning : "#475569"} />
        <KPICard icon={KeyRound} label="Active Key" value={`Key ${currentKeyIndex + 1}`} color={C.success} />
      </div>

      {/* Key cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {keys.map(k => <KeyCard key={k.keyIndex} keyData={k} />)}
      </div>

      {/* History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>Usage History</p>
          <div className="flex gap-2">
            {[7, 14, 30].map(d => (
              <button key={d}
                onClick={() => { setHistoryDays(d); loadHistory(d); }}
                className="text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: historyDays === d ? `${C.primary}20` : "rgba(255,255,255,0.04)",
                  color: historyDays === d ? C.primary : "#64748b",
                  border: historyDays === d ? `1px solid ${C.primary}40` : "1px solid rgba(255,255,255,0.06)",
                }}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        <HistoryCharts history={history} />
      </div>

      {/* Config note */}
      <div className="px-4 py-3 rounded-2xl text-xs"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", color: "#475569" }}>
        <p className="font-semibold mb-1" style={{ color: "#64748b" }}>Quota configuration</p>
        <p>
          Configure via env:{" "}
          <code className="px-1.5 py-0.5 rounded-md mx-1" style={{ background: "rgba(255,255,255,0.07)", color: "#94a3b8" }}>
            GEMINI_DAILY_REQUEST_LIMIT
          </code>
          (default: 1,500) and{" "}
          <code className="px-1.5 py-0.5 rounded-md mx-1" style={{ background: "rgba(255,255,255,0.07)", color: "#94a3b8" }}>
            GEMINI_DAILY_TOKEN_BUDGET
          </code>
          (default: 1,000,000). Resets at midnight UTC. Stats stored in MongoDB.
        </p>
      </div>
    </div>
  );
}
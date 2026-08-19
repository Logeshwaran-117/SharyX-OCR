// src/components/dashboard/HeroSection.jsx
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Upload, FileText, BarChart2, MessageSquare,
  ScanLine, Table2, Landmark, History, Presentation,
  FileCheck2, Cpu, Clock, TrendingUp, CheckCircle2,
  Crown, Zap, Building2,
} from "lucide-react";

/* ── tiny helpers ── */
const f = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay, ease: [0.4, 0, 0.2, 1] },
});

/* ── Plan badge config ── */
const PLAN_CONFIG = {
  free:       { label: "Free",       icon: Zap,       grad: "linear-gradient(135deg,#64748b,#94a3b8)", glow: "rgba(100,116,139,.3)" },
  pro:        { label: "Pro",        icon: Crown,     grad: "linear-gradient(135deg,#f59e0b,#fcd34d)", glow: "rgba(245,158,11,.3)"  },
  enterprise: { label: "Enterprise", icon: Building2, grad: "linear-gradient(135deg,#6366f1,#818cf8)", glow: "rgba(99,102,241,.3)"  },
};

function PlanBadge({ billing }) {
  const plan   = billing?.plan || "free";
  const cfg    = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
  const Icon   = cfg.icon;

  return (
    <Link to="/pricing">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer select-none"
        style={{
          background: cfg.grad,
          boxShadow: `0 4px 14px ${cfg.glow}`,
        }}
      >
        <Icon size={12} className="text-white" />
        <span className="text-white text-[11px] font-bold tracking-wide uppercase">{cfg.label}</span>
      </motion.div>
    </Link>
  );
}

/* ── Helpers to derive real ring percentages ── */

/**
 * Returns { pct, label, sublabel } for each ring.
 *
 * billing.usage.summarize = { used, limit, remaining }   (limit=-1 means unlimited)
 * billing.usage.tables    = { used, limit, remaining }
 * user.tokensUsed / user.tokenLimit                      (raw token consumption)
 * user.plan                                              (free / pro / enterprise)
 *
 * "Storage" ring: maps plan tier to a capacity percentage
 *   free=25%, pro=60%, enterprise=100%   — represents plan tier headroom, not disk bytes
 * "Quota" ring:  summarize used/limit for today
 * "Credits" ring: tokens used / tokenLimit
 * "Tables" ring:  table extractions used/limit
 */
function deriveRings(billing, user) {
  // ── Storage: plan-tier proxy (free plan = 25 % of max feature set) ──
  const planPct = { free: 25, pro: 60, enterprise: 100 };
  const storagePct = planPct[user?.plan || billing?.plan || "free"] ?? 25;

  // ── Quota: summarize used / daily limit ──
  const sumUsed    = billing?.usage?.summarize?.used    ?? 0;
  const sumLimit   = billing?.usage?.summarize?.limit   ?? null; // null = unknown
  let   quotaPct   = 0;
  let   quotaLabel = "Quota";
  if (sumLimit === -1) {
    // Unlimited plan — show 100 % (full green ring)
    quotaPct   = 100;
    quotaLabel = "Quota ∞";
  } else if (sumLimit && sumLimit > 0) {
    quotaPct = Math.min(100, Math.round((sumUsed / sumLimit) * 100));
  }

  // ── Credits: AI token consumption ──
  const tokensUsed  = user?.tokensUsed  ?? 0;
  const tokenLimit  = user?.tokenLimit  ?? 1000000;
  const creditsPct  = tokenLimit > 0
    ? Math.min(100, Math.round((tokensUsed / tokenLimit) * 100))
    : 0;

  // ── Tables: table extraction used / daily limit ──
  const tblUsed  = billing?.usage?.tables?.used  ?? 0;
  const tblLimit = billing?.usage?.tables?.limit ?? null;
  let   tblPct   = 0;
  let   tblLabel = "Tables";
  if (tblLimit === -1) {
    tblPct   = 100;
    tblLabel = "Tables ∞";
  } else if (tblLimit && tblLimit > 0) {
    tblPct = Math.min(100, Math.round((tblUsed / tblLimit) * 100));
  }

  return [
    { pct: storagePct, color: "var(--primary)", label: "Plan"      },
    { pct: quotaPct,   color: "var(--success)", label: quotaLabel  },
    { pct: creditsPct, color: "var(--warning)", label: "Tokens"    },
    { pct: tblPct,     color: "#ec4899",        label: tblLabel    },
  ];
}

/* ── Compact radial ring ── */
function MiniRing({ pct, color, label }) {
  const r    = 18;
  const circ = 2 * Math.PI * r;
  // Clamp and round to avoid floating point artifacts
  const safePct = Math.min(100, Math.max(0, Math.round(pct)));

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="44" height="44" className="-rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--border)" strokeWidth="3.5" />
        <motion.circle
          cx="22" cy="22" r={r}
          fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - circ * (safePct / 100) }}
          transition={{ duration: 1.1, delay: 0.5, ease: "easeOut" }}
        />
        <text
          x="22" y="22"
          textAnchor="middle" dominantBaseline="central"
          style={{ transform: "rotate(90deg)", transformOrigin: "22px 22px", fontSize: 9, fontWeight: 700, fill: "currentColor" }}
        >
          {safePct}%
        </text>
      </svg>
      <p className="text-[10px] font-medium text-center leading-tight" style={{ color: "var(--muted)" }}>{label}</p>
    </div>
  );
}

/* ── Stat pill (compact) ── */
function StatPill({ icon: Icon, value, label, color, delay }) {
  return (
    <motion.div
      {...f(delay)}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl flex-1 min-w-0"
      style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}18` }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-base font-bold tabular-nums leading-none" style={{ color: "var(--text)" }}>{value}</p>
        <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--muted)" }}>{label}</p>
      </div>
    </motion.div>
  );
}

/* ── Quick action chip ── */
const ACTIONS = [
  { to: "/upload",       icon: Upload,        label: "Upload",         grad: "linear-gradient(135deg,#4F46E5,#818cf8)" },
  { to: "/presentation", icon: Presentation,  label: "PPT Generation", grad: "linear-gradient(135deg,#0ea5e9,#38bdf8)" },
  { to: "/upload",       icon: MessageSquare, label: "Ask AI",         grad: "linear-gradient(135deg,#f59e0b,#fcd34d)" },
  { to: "/upload",       icon: ScanLine,      label: "OCR",            grad: "linear-gradient(135deg,#ec4899,#f9a8d4)" },
  { to: "/excel",        icon: Table2,        label: "Tables",         grad: "linear-gradient(135deg,#8b5cf6,#c4b5fd)" },
  { to: "/banking",      icon: Landmark,      label: "Banking",        grad: "linear-gradient(135deg,#06b6d4,#67e8f9)" },
  { to: "/history",      icon: History,       label: "History",        grad: "linear-gradient(135deg,#f97316,#fdba74)" },
];

function ActionChip({ to, icon: Icon, label, grad, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, delay }}
      whileHover={{ y: -2 }}
    >
      <Link to={to}>
        <div
          className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl cursor-pointer transition-all duration-150"
          style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "rgba(var(--primary-rgb),.35)";
            e.currentTarget.style.background = "var(--card)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.background = "var(--secondary)";
          }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: grad }}>
            <Icon size={15} className="text-white" />
          </div>
          <p className="text-[11px] font-semibold text-center" style={{ color: "var(--text)" }}>{label}</p>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Main ── */
function HeroSection({ user, stats, billing }) {
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name     = user?.name || user?.displayName || user?.email?.split("@")[0] || "there";
  const date     = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const total     = stats?.total ?? 0;
  const summaries = stats?.summaries ?? 0;
  const saved     = Math.round(total * 2.1);
  const rate      = total > 0 ? Math.min(100, Math.round((summaries / total) * 100)) : 0;

  const statPills = [
    { icon: FileCheck2,   value: total,        label: "Docs",          color: "var(--primary)" },
    { icon: Cpu,          value: summaries,     label: "AI Requests",   color: "var(--success)" },
    { icon: Clock,        value: `${saved}m`,   label: "Mins Saved",    color: "var(--warning)" },
    { icon: CheckCircle2, value: `${rate}%`,    label: "Success Rate",  color: "#ec4899"        },
  ];

  // ── Derive real ring data from billing + user ──
  const rings = deriveRings(billing, user);

  return (
    <motion.div
      {...f()}
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      {/* Ambient blob */}
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(var(--primary-rgb),.1) 0%, transparent 70%)",
          filter: "blur(36px)",
        }} />

      <div className="relative z-10 p-5">

        {/* ── Row 1: greeting left · rings + plan badge right ── */}
        <div className="flex items-start justify-between gap-4 mb-4">

          {/* Left: greeting */}
          <div className="min-w-0">
            <p className="text-xs font-medium mb-0.5" style={{ color: "var(--muted)" }}>
              {greeting} 👋 · {date}
            </p>
            <h1 className="text-xl font-bold truncate" style={{ color: "var(--text)" }}>{name}</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              <span className="font-semibold" style={{ color: "var(--primary)" }}>{total} docs</span> processed this month
            </p>
          </div>

          {/* Right: plan badge + mini rings */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            {/* Plan badge — top right */}
            <PlanBadge billing={billing} />

            {/* Mini rings — real data */}
            <div className="hidden sm:flex items-center gap-3">
              {rings.map((r) => (
                <MiniRing key={r.label} pct={r.pct} color={r.color} label={r.label} />
              ))}
            </div>

            {/* Tooltip row — shown under the rings on hover via title attribute */}
            {billing && (
              <p className="hidden sm:block text-[10px] text-right leading-tight" style={{ color: "var(--muted)" }}>
                {billing.usage?.summarize?.limit !== -1
                  ? `${billing.usage?.summarize?.remaining ?? "—"} summaries left today`
                  : "Unlimited summaries"}
              </p>
            )}
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="h-px mb-4" style={{ background: "var(--border)" }} />

        {/* ── Row 2: Quick action chips ── */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">
          {ACTIONS.map((a, i) => (
            <ActionChip key={a.label} {...a} delay={i * 0.04} />
          ))}
        </div>

        {/* ── Divider ── */}
        <div className="h-px mb-4" style={{ background: "var(--border)" }} />

        {/* ── Row 3: Stat pills ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {statPills.map((s, i) => (
            <StatPill key={s.label} {...s} delay={0.1 + i * 0.07} />
          ))}
        </div>

      </div>
    </motion.div>
  );
}

export default HeroSection;
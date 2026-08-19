// src/components/dashboard/SidePanel.jsx
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  TrendingUp, Clock, Cpu, Calendar, Zap, Brain,
  Database, Server, Shield, Eye, CheckCircle2, AlertCircle,
} from "lucide-react";

/* ── AI Insights ── */
const INSIGHTS = [
  { icon: TrendingUp, text: "Banking documents increased by 24% this week", color: "var(--success)" },
  { icon: Brain,      text: "OCR accuracy reached 98.8% on latest scans",   color: "var(--primary)" },
  { icon: Calendar,   text: "Thursday is your most productive day",          color: "var(--warning)" },
  { icon: Clock,      text: "Avg. response time improved to 2.1 seconds",    color: "#ec4899" },
  { icon: Zap,        text: "You saved ~7.5 hours of reading this month",    color: "var(--success)" },
  { icon: Cpu,        text: "Summary length reduced by 63% on average",      color: "#8b5cf6" },
];

function AIInsights() {
  return (
    <div className="rounded-2xl p-5"
      style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, var(--primary), #818cf8)" }}>
          <Brain size={14} className="text-white" />
        </div>
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>AI Insights</p>
      </div>
      <div className="space-y-3">
        {INSIGHTS.map((ins, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: .3, delay: i * .07 }}
            className="flex items-start gap-3 p-3 rounded-xl"
            style={{ background: "var(--secondary)" }}
          >
            <ins.icon size={14} className="mt-0.5 shrink-0" style={{ color: ins.color }} />
            <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{ins.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Plan Usage ── */
function PlanCard({ billing }) {
  if (!billing) return null;

  const planIcon = billing.plan === "pro" ? "⭐" : billing.plan === "enterprise" ? "🏢" : "🆓";
  const renewDate = billing.currentPeriodEnd
    ? new Date(billing.currentPeriodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : null;
  const isPaid = billing.plan && billing.plan.toLowerCase() !== "free";

  const usageItems = [
    { label: "Summaries", key: "summarize", color: "var(--primary)" },
    { label: "Tables",    key: "tables",    color: "var(--success)" },
  ];

  return (
    <div className="rounded-2xl p-5"
      style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{planIcon}</span>
          <div>
            <p className="text-sm font-semibold capitalize" style={{ color: "var(--text)" }}>
              {billing.planName} Plan
            </p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Limits reset daily{isPaid && renewDate ? ` · Renews ${renewDate}` : ""}
            </p>
          </div>
        </div>
        <Link to="/pricing">
          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background: "var(--primary)", color: "#fff" }}>
            {billing.plan === "free" ? "Upgrade" : "Manage"}
          </button>
        </Link>
      </div>

      <div className="space-y-3">
        {usageItems.map(({ label, key, color }) => {
          const u   = billing.usage?.[key] || {};
          const pct = u.limit === -1 ? 0 : Math.min(100, Math.round(((u.used || 0) / (u.limit || 20)) * 100));
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span style={{ color: "var(--muted)" }}>{label}</span>
                <span style={{ color: "var(--muted)" }}>
                  {u.limit === -1 ? `${u.used || 0} / ∞` : `${u.used || 0} / ${u.limit || 20}`}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: pct >= 90 ? "var(--danger)" : pct >= 70 ? "var(--warning)" : color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${u.limit === -1 ? 0 : pct}%` }}
                  transition={{ duration: .8, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Workspace Health ── */
const SERVICES = [
  { label: "Gemini API",     icon: Brain,      latency: "142ms", ok: true  },
  { label: "Database",       icon: Database,   latency: "8ms",   ok: true  },
  { label: "OCR Service",    icon: Eye,        latency: "210ms", ok: true  },
  { label: "Server",         icon: Server,     latency: "4ms",   ok: true  },
  { label: "Auth",           icon: Shield,     latency: "12ms",  ok: true  },
];

function WorkspaceHealth() {
  return (
    <div className="rounded-2xl p-5"
      style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
      <p className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Workspace Health</p>
      <div className="space-y-2">
        {SERVICES.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * .05 }}
            className="flex items-center justify-between py-2 px-3 rounded-xl"
            style={{ background: "var(--secondary)" }}
          >
            <div className="flex items-center gap-2.5">
              <s.icon size={13} style={{ color: "var(--muted)" }} />
              <span className="text-xs font-medium" style={{ color: "var(--text)" }}>{s.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px]" style={{ color: "var(--muted)" }}>{s.latency}</span>
              {s.ok
                ? <CheckCircle2 size={13} style={{ color: "var(--success)" }} />
                : <AlertCircle  size={13} style={{ color: "var(--danger)"  }} />
              }
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Recent Activity Timeline ── */
const ACTIVITY_ICONS = {
  summarized: { icon: Brain,   color: "var(--primary)" },
  uploaded:   { icon: Zap,     color: "var(--success)" },
  analyzed:   { icon: TrendingUp, color: "var(--warning)" },
  generated:  { icon: Cpu,     color: "#ec4899" },
};

function RecentActivity({ docs }) {
  if (!docs?.length) return null;

  return (
    <div className="rounded-2xl p-5"
      style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
      <p className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Recent Activity</p>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-2 bottom-2 w-px" style={{ background: "var(--border)" }} />

        <div className="space-y-4">
          {docs.slice(0, 5).map((doc, i) => {
            const typeKey = "summarized";
            const { icon: Icon, color } = ACTIVITY_ICONS[typeKey];
            const time = new Date(doc.uploadedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

            return (
              <motion.div
                key={doc._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * .08 }}
                className="flex items-start gap-4 pl-2"
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 relative z-10"
                  style={{ background: `${color}20`, border: `1.5px solid ${color}` }}>
                  <Icon size={11} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>
                    {doc.filename}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                    Summarized · {time}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SidePanel({ billing, docs }) {
  return (
    <div className="space-y-4">
      <PlanCard billing={billing} />
      <AIInsights />
      <WorkspaceHealth />
      <RecentActivity docs={docs} />
    </div>
  );
}

export default SidePanel;
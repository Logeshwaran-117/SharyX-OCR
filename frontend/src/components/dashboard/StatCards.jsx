// src/components/dashboard/StatCards.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Cpu, Clock, CheckCircle2, TrendingUp } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

function Sparkline({ data, color }) {
  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          dot={false}
          strokeLinecap="round"
        />
        <Tooltip
          contentStyle={{ display: "none" }}
          cursor={{ stroke: color, strokeWidth: 1, opacity: .3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function StatCard({ icon: Icon, value, trend, label, description, color, sparkData, delay }) {
  const count = useCountUp(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .45, delay, ease: [.4, 0, .2, 1] }}
      whileHover={{ y: -2, boxShadow: "var(--shadow-md)" }}
      className="rounded-2xl p-5 flex flex-col gap-3 cursor-default"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
        transition: "transform .2s, box-shadow .2s",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <span
          className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: trend >= 0 ? "rgba(16,185,129,.12)" : "rgba(239,68,68,.12)",
            color: trend >= 0 ? "var(--success)" : "var(--danger)",
          }}
        >
          <TrendingUp size={10} style={{ transform: trend < 0 ? "scaleY(-1)" : "none" }} />
          {Math.abs(trend)}%
        </span>
      </div>

      <div>
        <p className="text-3xl font-bold tabular-nums" style={{ color: "var(--text)" }}>
          {count.toLocaleString()}
        </p>
        <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text)" }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{description}</p>
      </div>

      <Sparkline data={sparkData} color={color} />
    </motion.div>
  );
}

function StatCards({ stats }) {
  const makeSpark = (base, jitter = 3) =>
    Array.from({ length: 8 }, (_, i) => ({ v: Math.max(0, base + Math.sin(i) * jitter + Math.random() * jitter) }));

  const total     = stats?.total     ?? 0;
  const summaries = stats?.summaries ?? 0;
  const today     = stats?.todayUploads ?? 0;

  const cards = [
    {
      icon: FileText,    value: total,                 trend: 12,
      label: "Documents Processed",  description: "All time",
      color: "var(--primary)",  sparkData: makeSpark(total / 8, 2),
    },
    {
      icon: Cpu,         value: summaries,             trend: 8,
      label: "AI Requests",          description: "Summaries generated",
      color: "var(--success)",  sparkData: makeSpark(summaries / 8, 1.5),
    },
    {
      icon: Clock,       value: Math.round(total * 2.1), trend: 21,
      label: "Minutes Saved",        description: "Estimated reading time",
      color: "var(--warning)",  sparkData: makeSpark(total * .3, 4),
    },
    {
      icon: CheckCircle2, value: Math.min(100, total > 0 ? Math.round(summaries / total * 100) : 0), trend: 4,
      label: "Success Rate %",       description: "AI accuracy score",
      color: "#ec4899",         sparkData: makeSpark(80, 6),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c, i) => <StatCard key={c.label} {...c} delay={i * .08} />)}
    </div>
  );
}

export default StatCards;
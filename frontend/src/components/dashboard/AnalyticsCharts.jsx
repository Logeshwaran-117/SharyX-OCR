// src/components/dashboard/AnalyticsCharts.jsx
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: .45, delay },
});

const TOOLTIP_STYLE = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  boxShadow: "var(--shadow-md)",
  color: "var(--text)",
  fontSize: 12,
};

function ChartCard({ title, subtitle, children, delay }) {
  return (
    <motion.div
      {...fadeUp(delay)}
      className="rounded-2xl p-5"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="mb-4">
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{title}</p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}

const FILE_TYPES = [
  { name: "PDF",   value: 58, color: "var(--primary)" },
  { name: "DOCX",  value: 21, color: "var(--success)" },
  { name: "Images",value: 11, color: "var(--warning)" },
  { name: "TXT",   value:  7, color: "#ec4899" },
];

const FEATURES = [
  { name: "OCR",       value: 20, color: "var(--success)" },
  { name: "Banking",   value: 14, color: "var(--warning)" },
  { name: "Tables",    value: 12, color: "#ec4899" },
  { name: "QA",        value:  5, color: "#8b5cf6"  },
];

function DonutChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={data}
          cx="50%" cy="50%"
          innerRadius={52}
          outerRadius={76}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} stroke="transparent" />
          ))}
        </Pie>
        <Legend
          formatter={(val) => <span style={{ color: "var(--muted)", fontSize: 11 }}>{val}</span>}
          iconSize={8}
          iconType="circle"
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => [`${v}%`, ""]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function AnalyticsCharts({ chartData }) {
  // Enrich chart data with area-safe values
  const areaData = (chartData || []).map(d => ({ ...d, uploads: d.uploads ?? 0 }));

  return (
    <div>
      <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text)" }}>Analytics</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area chart — full width on small */}
        <ChartCard
          title="Weekly Uploads"
          subtitle="Document processing trend"
          delay={0}
          className="lg:col-span-2"
        >
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="uploadsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="var(--primary)" stopOpacity=".3" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0"  />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "var(--primary)", strokeWidth: 1, opacity: .3 }} />
                <Area
                  type="monotone"
                  dataKey="uploads"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="url(#uploadsGrad)"
                  dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* File type donut */}
        <ChartCard title="File Types" subtitle="By document type" delay={.1}>
          <DonutChart data={FILE_TYPES} />
        </ChartCard>

        {/* Bar chart */}
        <ChartCard title="Monthly Activity" subtitle="Uploads per day" delay={.15}>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={areaData} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="uploads" fill="var(--primary)" radius={[4, 4, 0, 0]} opacity={.85} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Feature usage donut */}
        <ChartCard title="Feature Usage" subtitle="By AI feature" delay={.2}>
          <DonutChart data={FEATURES} />
        </ChartCard>

        {/* Activity trend line */}
        <ChartCard title="Activity Trend" subtitle="Document activity over week" delay={.25}>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="var(--success)" stopOpacity=".25" />
                  <stop offset="100%" stopColor="var(--success)" stopOpacity="0"   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="uploads"
                stroke="var(--success)"
                strokeWidth={2}
                fill="url(#trendGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

export default AnalyticsCharts;
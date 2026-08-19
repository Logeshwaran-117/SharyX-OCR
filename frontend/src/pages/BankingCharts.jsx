import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from "recharts";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#6366f1", "#14b8a6", "#a3a3a3"
];

function fmtAmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n?.toFixed(0) ?? "0";
}

export default function BankingCharts({ analytics: A, currency }) {
  const catData = Object.entries(A.categoryBreakdown || {})
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }));

  const monthlyData = (A.monthlyFlow || []).map(m => ({
    month: m.month?.slice(5) ?? m.month, // show MM only
    Credits: m.credits,
    Debits: m.debits,
    Net: m.net,
  }));

  return (
    <div className="space-y-5">
      {/* Cash flow bar chart */}
      {monthlyData.length > 0 && (
        <ChartCard title="Monthly Cash Flow">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.2)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <YAxis tickFormatter={fmtAmt} tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <Tooltip
                formatter={(v, name) => [`${currency} ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, name]}
                contentStyle={{ background: "var(--tooltip-bg, #1f2937)", border: "none", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#e5e7eb" }}
              />
              <Bar dataKey="Credits" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Debits" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Net flow line */}
      {monthlyData.length > 1 && (
        <ChartCard title="Net Cash Flow Trend">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.2)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <YAxis tickFormatter={fmtAmt} tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <Tooltip
                formatter={(v) => [`${currency} ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Net"]}
                contentStyle={{ background: "var(--tooltip-bg, #1f2937)", border: "none", borderRadius: 8, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="Net" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Category donut */}
      {catData.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-5">
          <ChartCard title="Spending by Category">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={catData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={2}
                >
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(v, name) => [`${currency} ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, name]}
                  contentStyle={{ background: "var(--tooltip-bg, #1f2937)", border: "none", borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Category table */}
          <ChartCard title="Category Breakdown">
            <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
              {catData.map(({ name, value }, i) => {
                const total = catData.reduce((s, d) => s + d.value, 0);
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return (
                  <div key={name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLORS[i % COLORS.length] }} />
                        {name}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">{currency} {Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        </div>
      )}

      {/* Credit vs Debit summary */}
      <ChartCard title="Credits vs Debits">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart
            layout="vertical"
            data={[
              { name: "Total Credits", value: A.totalCredits || 0, fill: "#10b981" },
              { name: "Total Debits", value: A.totalDebits || 0, fill: "#ef4444" },
              { name: "Net Flow", value: Math.abs(A.netCashFlow || 0), fill: A.netCashFlow >= 0 ? "#3b82f6" : "#f97316" },
            ]}
            margin={{ top: 4, right: 24, left: 16, bottom: 4 }}
          >
            <XAxis type="number" tickFormatter={fmtAmt} tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} width={90} />
            <Tooltip
              formatter={(v, _, { payload }) => [`${currency} ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, payload.name]}
              contentStyle={{ background: "var(--tooltip-bg, #1f2937)", border: "none", borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {[{ fill: "#10b981" }, { fill: "#ef4444" }, { fill: "#3b82f6" }].map((c, i) => (
                <Cell key={i} fill={c.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">{title}</h3>
      {children}
    </div>
  );
}

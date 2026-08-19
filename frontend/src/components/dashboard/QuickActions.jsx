// src/components/dashboard/QuickActions.jsx
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Upload, FileText, BarChart2, MessageSquare,
  ScanLine, Table2, Landmark, History, Presentation,
} from "lucide-react";

const ACTIONS = [
  { to: "/upload",        icon: Upload,        label: "Upload PDF",        sub: "Summarize any document",  grad: "linear-gradient(135deg,#4F46E5,#818cf8)" },
  { to: "/presentation",  icon: Presentation,  label: "AI Presentation",   sub: "Generate PPTX decks",     grad: "linear-gradient(135deg,#10b981,#34d399)" },
  { to: "/upload",        icon: MessageSquare, label: "Ask Questions",     sub: "Chat with your docs",     grad: "linear-gradient(135deg,#f59e0b,#fcd34d)" },
  { to: "/excel",         icon: Table2,        label: "Table Generator",   sub: "Structured data export",  grad: "linear-gradient(135deg,#8b5cf6,#c4b5fd)" },
  { to: "/banking",       icon: Landmark,      label: "Banking Analysis",  sub: "Financial statement AI",  grad: "linear-gradient(135deg,#06b6d4,#67e8f9)" },
  { to: "/history",       icon: History,       label: "History",           sub: "Browse past summaries",   grad: "linear-gradient(135deg,#f97316,#fdba74)" },
];

function ActionCard({ to, icon: Icon, label, sub, grad, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: .92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: .35, delay }}
      whileHover={{ y: -3 }}
    >
      <Link to={to}>
        <div
          className="group flex flex-col items-center gap-3 p-5 rounded-2xl cursor-pointer transition-all duration-200"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "rgba(var(--primary-rgb),.3)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(var(--primary-rgb),.12)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "var(--shadow)";
          }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200"
            style={{ background: grad }}
          >
            <Icon size={20} className="text-white" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{label}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>{sub}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function QuickActions() {
  return (
    <div>
      <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text)" }}>Quick Actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        {ACTIONS.map((a, i) => <ActionCard key={a.label} {...a} delay={i * .05} />)}
      </div>
    </div>
  );
}

export default QuickActions;
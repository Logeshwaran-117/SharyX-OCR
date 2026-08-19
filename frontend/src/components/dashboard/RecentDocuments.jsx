// src/components/dashboard/RecentDocuments.jsx
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FileText, Eye, Download, Trash2, ChevronRight } from "lucide-react";

function StatusBadge({ status = "done" }) {
  const map = {
    done:       { label: "Done",       bg: "rgba(16,185,129,.12)",  color: "var(--success)" },
    processing: { label: "Processing", bg: "rgba(245,158,11,.12)",  color: "var(--warning)" },
    failed:     { label: "Failed",     bg: "rgba(239,68,68,.12)",   color: "var(--danger)"  },
  };
  const s = map[status] || map.done;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

function DocRow({ doc, index }) {
  const ext  = (doc.filename || "").split(".").pop()?.toUpperCase() || "DOC";
  const date = new Date(doc.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .28, delay: index * .06 }}
      className="group"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <td className="py-3 px-4">
        <Link to={`/history/${doc._id}`} className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(var(--primary-rgb),.1)" }}>
            <FileText size={14} style={{ color: "var(--primary)" }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{doc.filename}</p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>{date}</p>
          </div>
        </Link>
      </td>
      <td className="py-3 px-4">
        <span className="text-xs" style={{ color: "var(--muted)" }}>{doc.stats?.words ?? "—"}</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md"
          style={{ background: "var(--secondary)", color: "var(--muted)" }}>
          {ext}
        </span>
      </td>
      <td className="py-3 px-4"><StatusBadge status="done" /></td>
      <td className="py-3 px-4">
        <span className="text-xs" style={{ color: "var(--muted)" }}>Gemini 1.5 Pro</span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link to={`/history/${doc._id}`}>
            <ActionBtn icon={Eye} label="View" />
          </Link>
          <ActionBtn icon={Download} label="Download" />
          <ActionBtn icon={Trash2} label="Delete" danger />
        </div>
      </td>
    </motion.tr>
  );
}

function ActionBtn({ icon: Icon, label, danger }) {
  return (
    <button
      title={label}
      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105"
      style={{
        background: danger ? "rgba(239,68,68,.1)" : "var(--secondary)",
        color: danger ? "var(--danger)" : "var(--muted)",
      }}
    >
      <Icon size={13} />
    </button>
  );
}

function RecentDocuments({ docs }) {
  if (!docs?.length) {
    return (
      <div className="rounded-2xl p-8 text-center"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: "var(--secondary)" }}>
          <FileText size={24} style={{ color: "var(--muted)" }} />
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>No documents yet</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>Upload your first document to get started</p>
        <Link to="/upload">
          <button className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "var(--primary)" }}>
            Upload Document
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Recent Documents</p>
        <Link to="/history" className="flex items-center gap-1 text-xs font-medium"
          style={{ color: "var(--primary)" }}>
          View all <ChevronRight size={12} />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[640px]">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Document", "Words", "Type", "Status", "Model", "Actions"].map(h => (
                <th key={h} className="text-[11px] font-semibold uppercase tracking-wider px-4 py-3"
                  style={{ color: "var(--muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {docs.map((doc, i) => <DocRow key={doc._id} doc={doc} index={i} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RecentDocuments;
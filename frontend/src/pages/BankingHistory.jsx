import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";

const TYPE_LABELS = {
  bank_statement: { label: "Bank Statement", icon: "🏦", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
  loan: { label: "Loan Document", icon: "📋", color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" },
  financial_report: { label: "Financial Report", icon: "📈", color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" },
  investment: { label: "Investment Portfolio", icon: "💼", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" },
  unknown: { label: "Document", icon: "📄", color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" },
};

const DOC_TYPES = ["all", "bank_statement", "loan", "financial_report", "investment"];

export default function BankingHistory({ onViewDoc }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [docType, setDocType] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  useEffect(() => { load(); }, [page, search, docType]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/api/banking/history", {
        params: { page, limit: 12, search, type: docType }
      });
      setDocs(res.data.docs);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } catch {
      toast.error("Failed to load banking history");
    } finally {
      setLoading(false);
    }
  }

  async function deleteDoc(id, name, e) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/banking/history/${id}`);
      toast.success("Deleted");
      load();
    } catch {
      toast.error("Failed to delete");
    }
  }

  const fmt = (n) => n != null ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Banking History</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{total} document{total !== 1 ? "s" : ""} analysed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by filename…"
          className="flex-1 min-w-[180px] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={docType}
          onChange={e => { setDocType(e.target.value); setPage(1); }}
          className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          {DOC_TYPES.slice(1).map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t]?.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🏦</p>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-1">No banking documents yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Upload your first bank statement to get started.</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map(doc => {
              const meta = TYPE_LABELS[doc.documentType] || TYPE_LABELS.unknown;
              const A = doc.analytics;
              return (
                <div
                  key={doc._id}
                  onClick={() => onViewDoc(doc._id)}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color} mb-2 inline-block`}>
                        {meta.icon} {meta.label}
                      </span>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{doc.filename}</p>
                      {doc.bankName && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">🏛 {doc.bankName}</p>}
                    </div>
                    <button
                      onClick={e => deleteDoc(doc._id, doc.filename, e)}
                      className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition shrink-0 opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>

                  {A && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2.5 text-center">
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Credits</p>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{doc.currency} {fmt(A.totalCredits)}</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2.5 text-center">
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Debits</p>
                        <p className="text-xs font-bold text-red-600 dark:text-red-400">{doc.currency} {fmt(A.totalDebits)}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {A?.transactionCount ?? 0} transactions
                      {A?.anomalyCount > 0 && <span className="ml-2 text-orange-500">⚠️ {A.anomalyCount}</span>}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition"
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

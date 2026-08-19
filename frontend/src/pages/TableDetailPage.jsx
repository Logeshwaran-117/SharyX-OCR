import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";
import { useNotifications } from "../context/NotificationContext";
import { exportTableToExcel, exportTableToPDF, exportTableToDocx } from "../utils/tableExport";
import TableChat from "../components/TableChat";

function TableDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 10;
  const { addNotification } = useNotifications();

  useEffect(() => {
    fetchTable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchTable() {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await api.get(`/api/tables/${id}`);
      setTable(res.data);
    } catch (error) {
      if (error.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error("Failed to load table");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${table.filename}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/api/tables/${id}`);
      toast.success("Table deleted");
      addNotification({ title: "Table deleted", message: `${table.filename} removed.`, type: "info" });
      navigate("/history");
    } catch {
      toast.error("Failed to delete table");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-4">🔍</p>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Table not found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">It may have been deleted already.</p>
        <button onClick={() => navigate("/history")} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
          ← Back to History
        </button>
      </div>
    );
  }

  const baseName = (table.filename || "table").replace(/\.[^/.]+$/, "");

  return (
    <div className="max-w-5xl mx-auto">
      <button
        onClick={() => navigate("/history")}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-flex items-center gap-1"
      >
        ← Back to History
      </button>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 transition-colors duration-300">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white break-all">{table.filename}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Extracted {new Date(table.createdAt).toLocaleString()} · {table.fields.length} field{table.fields.length !== 1 ? "s" : ""} · {table.rows.length} row{table.rows.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium transition shrink-0"
          >
            {deleting ? "Deleting..." : "🗑️ Delete"}
          </button>
        </div>

        <div className="flex gap-3 flex-wrap mb-6">
          <button
            onClick={() => exportTableToExcel(table.fields, table.rows, baseName)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition font-medium"
          >
            📗 Excel
          </button>
          <button
            onClick={() => exportTableToPDF(table.fields, table.rows, baseName)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition font-medium"
          >
            📕 PDF
          </button>
          <button
            onClick={() => exportTableToDocx(table.fields, table.rows, baseName)}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 transition font-medium"
          >
            📘 Word
          </button>
        </div>

        {/* Paginated table */}
        {(() => {
          const totalPages = Math.ceil(table.rows.length / TABLE_PAGE_SIZE);
          const pageRows = table.rows.slice(
            (tablePage - 1) * TABLE_PAGE_SIZE,
            tablePage * TABLE_PAGE_SIZE
          );
          return (
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap w-10">#</th>
                      {table.fields.map((f) => (
                        <th key={f} className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                          {f}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {pageRows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs tabular-nums">
                          {(tablePage - 1) * TABLE_PAGE_SIZE + i + 1}
                        </td>
                        {table.fields.map((f) => (
                          <td key={f} className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {row[f]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination bar */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Showing {(tablePage - 1) * TABLE_PAGE_SIZE + 1}–{Math.min(tablePage * TABLE_PAGE_SIZE, table.rows.length)} of {table.rows.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTablePage(1)}
                      disabled={tablePage === 1}
                      className="px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      title="First page"
                    >«</button>
                    <button
                      onClick={() => setTablePage(p => Math.max(1, p - 1))}
                      disabled={tablePage === 1}
                      className="px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >‹ Prev</button>

                    {/* Page number pills */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - tablePage) <= 1)
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, idx) =>
                        item === "..." ? (
                          <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400 dark:text-gray-500">…</span>
                        ) : (
                          <button
                            key={item}
                            onClick={() => setTablePage(item)}
                            className={`min-w-[28px] px-2 py-1 rounded text-xs font-medium transition
                              ${tablePage === item
                                ? "bg-blue-600 text-white"
                                : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                              }`}
                          >{item}</button>
                        )
                      )
                    }

                    <button
                      onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
                      disabled={tablePage === totalPages}
                      className="px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >Next ›</button>
                    <button
                      onClick={() => setTablePage(totalPages)}
                      disabled={tablePage === totalPages}
                      className="px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      title="Last page"
                    >»</button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* QA Chat about this table */}
        <TableChat tableId={table._id} initialChatHistory={table.chatHistory || []} />
      </div>
    </div>
  );
}

export default TableDetailPage;
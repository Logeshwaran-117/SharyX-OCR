import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import api from "../api";
import toast from "react-hot-toast";
import { useNotifications } from "../context/NotificationContext";
import TableFieldsModal from "../components/TableFieldsModal";
import { exportTableToExcel, exportTableToPDF, exportTableToDocx } from "../utils/tableExport";
import TableChat from "../components/TableChat";
import UsageBadge from "../components/UsageBadge";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ── SSE progress hook (same as in Uploadcard) ─────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function useProgress() {
  const [progress, setProgress] = useState({ stage: "idle", percent: 0, message: "", done: false, error: false });
  const esRef = useRef(null);

  const reset = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setProgress({ stage: "idle", percent: 0, message: "", done: false, error: false });
  }, []);

  const startListening = useCallback((jobId) => {
    reset();
    setProgress({ stage: "uploading", percent: 5, message: "Uploading file…", done: false, error: false });

    const es = new EventSource(`${API_BASE}/api/progress/${jobId}`, { withCredentials: true });
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setProgress({ stage: data.stage, percent: data.percent, message: data.message, done: data.stage === "done", error: data.stage === "error" });
        if (data.stage === "done" || data.stage === "error") { es.close(); esRef.current = null; }
      } catch (_) {}
    };
    es.onerror = () => { es.close(); esRef.current = null; };
  }, [reset]);

  useEffect(() => () => { if (esRef.current) esRef.current.close(); }, []);
  return { progress, startListening, reset };
}

// ── Table-specific stages ─────────────────────────────────────────────────────
const STAGE_STEPS = [
  { key: "uploading",  label: "Upload",   icon: "⬆️" },
  { key: "extracting", label: "Read",     icon: "📖" },
  { key: "ai",         label: "AI",       icon: "🤖" },
  { key: "saving",     label: "Save",     icon: "💾" },
  { key: "done",       label: "Done",     icon: "✅" },
];
const STAGE_ORDER = STAGE_STEPS.map(s => s.key);

function ProgressBar({ progress, isImage }) {
  const { stage, percent, message, error } = progress;
  const currentIdx = error ? -1 : STAGE_ORDER.indexOf(stage);

  const barBg    = error ? "var(--danger)"  : percent === 100 ? "var(--success)" : "var(--primary)";
  const titleCol = error ? "var(--danger)"  : "var(--primary)";

  return (
    <div
      className="mt-5 p-5 rounded-xl"
      style={{
        background: "rgba(var(--primary-rgb), .06)",
        border: "1px solid rgba(var(--primary-rgb), .15)",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-bold text-sm" style={{ color: titleCol }}>
          {error ? "Error" : stage === "done" ? "Table Extracted!" : isImage ? "🖼️ Reading image with AI…" : "📊 Building your table…"}
        </h2>
        <span className="text-sm font-bold tabular-nums" style={{ color: error ? "var(--danger)" : "var(--primary)" }}>
          {error ? "Failed" : `${percent}%`}
        </span>
      </div>

      <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>{message}</p>

      <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
        <div
          className={`h-3 rounded-full transition-all duration-500 ${stage !== "done" && !error ? "relative overflow-hidden" : ""}`}
          style={{ width: `${error ? 100 : percent}%`, background: barBg }}
        >
          {stage !== "done" && !error && (
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.4s_infinite]" />
          )}
        </div>
      </div>

      <div className="flex justify-between mt-3">
        {STAGE_STEPS.map((step, idx) => {
          const done   = !error && currentIdx >= idx;
          const active = !error && currentIdx === idx;
          return (
            <div key={step.key} className="flex flex-col items-center gap-0.5" style={{ flex: 1 }}>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all duration-300"
                style={{
                  background: done ? "var(--primary)" : error ? "rgba(239,68,68,.2)" : "var(--secondary)",
                  color: done ? "#fff" : error ? "var(--danger)" : "var(--muted)",
                  boxShadow: done ? "0 1px 4px rgba(var(--primary-rgb),.3)" : "none",
                }}
              >
                {done ? (active && stage !== "done" ? "⋯" : step.icon) : step.icon}
              </div>
              <span
                className="text-[10px] font-medium leading-none"
                style={{
                  color: done ? "var(--primary)" : error ? "var(--danger)" : "var(--muted)",
                  opacity: done ? 1 : 0.6,
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
];

function isImageFile(file) { return file && file.type.startsWith("image/"); }
function isPDFFile(file)   { return file && file.type === "application/pdf"; }

// ── Main ExcelSummary ─────────────────────────────────────────────────────────
function ExcelSummary() {
  const [selectedFile,       setSelectedFile]       = useState(null);
  const [previewUrl,         setPreviewUrl]         = useState(null);
  const [dragging,           setDragging]           = useState(false);
  const [showFieldsModal,    setShowFieldsModal]    = useState(false);
  const [extracting,         setExtracting]         = useState(false);
  const [result,             setResult]             = useState(null);
  const [numPages,           setNumPages]           = useState(null);
  const [currentPage,        setCurrentPage]        = useState(1);
  const [suggestedFields,    setSuggestedFields]    = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [tablePage,          setTablePage]          = useState(1);
  const [usageKey,           setUsageKey]           = useState(0);
  const TABLE_PAGE_SIZE = 10;

  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { progress, startListening, reset: resetProgress } = useProgress();

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  function handleFileSelect(file) {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only PDF, DOCX, TXT, JPG, PNG, and WEBP files are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Maximum file size is 10 MB");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setResult(null);
    setSuggestedFields([]);
    setCurrentPage(1);
    setNumPages(null);
    resetProgress();
    setPreviewUrl(URL.createObjectURL(file));
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setResult(null);
    setPreviewUrl(null);
    setSuggestedFields([]);
    setCurrentPage(1);
    setNumPages(null);
    resetProgress();
  }

  async function handleGenerateClick() {
    if (!selectedFile) return;
    setShowFieldsModal(true);
    setLoadingSuggestions(true);
    setSuggestedFields([]);

    try {
      const formData = new FormData();
      formData.append("document", selectedFile);
      const res = await api.post("/api/suggest-fields", formData);
      setSuggestedFields(res.data.fields || []);
    } catch (err) {
      console.warn("Field suggestion failed:", err);
      const message = err.response?.data?.message;
      if (message) toast.error(`Couldn't auto-suggest fields: ${message}`);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function handleExtract(fields) {
    if (!selectedFile) return;
    setShowFieldsModal(false);
    setExtracting(true);

    try {
      // Generate job id and open SSE before posting
      const jobId = crypto.randomUUID();
      startListening(jobId);

      const formData = new FormData();
      formData.append("document", selectedFile);
      formData.append("fields", JSON.stringify(fields));
      formData.append("jobId", jobId);

      const response = await api.post("/api/extract-table", formData);
      setResult(response.data);
      setTablePage(1);
      setUsageKey(k => k + 1); // refresh usage badge
      toast.success("Table extracted successfully!");
      addNotification({ title: "Table ready", message: `${selectedFile.name} was converted into a table.`, type: "success" });
    } catch (error) {
      console.error(error);
      const errData = error.response?.data || {};
      const message = errData.message || "Error extracting table";
      if (errData.limitReached) {
        toast.error(`Plan limit reached — ${message}`);
        addNotification({ title: "Usage limit reached", message: `Upgrade your plan to continue. ${message}`, type: "warning" });
      } else {
        toast.error(message);
        addNotification({ title: "Extraction failed", message, type: "error" });
      }
      setResult(null);
    } finally {
      setExtracting(false);
    }
  }

  const onDocumentLoadSuccess = useCallback(({ numPages }) => { setNumPages(numPages); }, []);
  const baseName = (result?.filename || selectedFile?.name || "table").replace(/\.[^/.]+$/, "");
  const showProgress = extracting || progress.stage === "done" || progress.stage === "error";

  return (
    <section className="rounded-xl shadow-lg transition-colors duration-300 overflow-hidden"
      style={{ background: "var(--card)" }}>

      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-4 px-6 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Table Generator</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            Upload any document or image and extract structured data into a table.
          </p>
        </div>
        <UsageBadge key={usageKey} type="tables" className="w-56 shrink-0" />
      </div>

      <div className="p-6">

        {/* ── EMPTY STATE: full drop zone ── */}
        {!selectedFile && (
          <div
            className="border-2 border-dashed rounded-xl p-14 flex flex-col items-center transition-all duration-300"
            style={{
              borderColor: dragging ? "var(--primary)" : "var(--border)",
              background: dragging ? "rgba(var(--primary-rgb),.06)" : "transparent",
            }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileSelect(e.dataTransfer.files[0]); }}
          >
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>
              Drag & Drop your document here
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              PDF, DOCX, TXT, JPG, PNG, WEBP supported
            </p>
            <label className="px-7 py-3 rounded-lg cursor-pointer text-white font-medium transition hover:opacity-90 shadow"
              style={{ background: "var(--primary)" }}>
              Select File
              <input type="file" className="hidden" accept=".pdf,.txt,.docx,.jpg,.jpeg,.png,.webp,.gif"
                onChange={(e) => handleFileSelect(e.target.files[0])} />
            </label>
            <p className="text-xs mt-4" style={{ color: "var(--muted)", opacity: 0.5 }}>Max file size: 10 MB</p>
          </div>
        )}

        {/* ── FILE SELECTED: compact source card ── */}
        {selectedFile && (
          <div className="rounded-xl overflow-hidden mb-5"
            style={{ border: "1px solid var(--border)" }}>

            {/* Source bar — always visible */}
            <div className="flex items-center gap-3 px-4 py-3"
              style={{ background: "var(--secondary)", borderBottom: previewUrl || !isImageFile(selectedFile) && !isPDFFile(selectedFile) ? "1px solid var(--border)" : undefined }}>

              {/* File icon + info */}
              <div className="text-2xl shrink-0">
                {isImageFile(selectedFile) ? "🖼️" : isPDFFile(selectedFile) ? "📑" : "📄"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{selectedFile.name}</p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {isImageFile(selectedFile) ? "Image" : isPDFFile(selectedFile) ? "PDF" : "Document"} · {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>

              {/* Actions: replace + clear + generate */}
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs px-3 py-1.5 rounded-lg cursor-pointer font-medium transition hover:opacity-80"
                  style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--muted)" }}>
                  Replace
                  <input type="file" className="hidden" accept=".pdf,.txt,.docx,.jpg,.jpeg,.png,.webp,.gif"
                    onChange={(e) => handleFileSelect(e.target.files[0])} />
                </label>
                <button onClick={clearFile}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition hover:opacity-80"
                  style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--muted)" }}>
                  ✕ Clear
                </button>
                <button onClick={handleGenerateClick} disabled={extracting}
                  className="text-sm px-5 py-1.5 rounded-lg text-white font-semibold transition"
                  style={{
                    background: extracting ? "var(--warning)" : "var(--primary)",
                    cursor: extracting ? "not-allowed" : "pointer",
                    boxShadow: extracting ? "none" : "0 2px 10px rgba(var(--primary-rgb),.3)",
                  }}>
                  {extracting ? "Extracting…" : "⚡ Generate Table"}
                </button>
              </div>
            </div>

            {/* Collapsible preview — image */}
            {isImageFile(selectedFile) && previewUrl && (
              <div className="flex justify-center py-4 px-4"
                style={{ background: "var(--card)" }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileSelect(e.dataTransfer.files[0]); }}>
                <img src={previewUrl} alt="preview"
                  className="max-h-56 max-w-full rounded-lg object-contain shadow-md" />
              </div>
            )}

            {/* Collapsible preview — PDF */}
            {isPDFFile(selectedFile) && previewUrl && (
              <div className="flex flex-col items-center gap-3 py-4 px-4"
                style={{ background: "var(--card)" }}>
                <Document file={previewUrl} onLoadSuccess={onDocumentLoadSuccess}
                  className="shadow-lg rounded overflow-hidden">
                  <Page pageNumber={currentPage} width={Math.min(480, window.innerWidth - 80)}
                    renderTextLayer={true} renderAnnotationLayer={false} />
                </Document>
                {numPages && numPages > 1 && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                      className="px-3 py-1 rounded-lg transition disabled:opacity-40"
                      style={{ background: "var(--secondary)" }}>
                      ← Prev
                    </button>
                    <span>Page {currentPage} of {numPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage === numPages}
                      className="px-3 py-1 rounded-lg transition disabled:opacity-40"
                      style={{ background: "var(--secondary)" }}>
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Non-previewable */}
            {!isImageFile(selectedFile) && !isPDFFile(selectedFile) && (
              <div className="py-4 px-4 text-center text-sm"
                style={{ background: "var(--card)", color: "var(--muted)" }}>
                📝 Text document ready — click <strong>Generate Table</strong> to extract data.
              </div>
            )}
          </div>
        )}

        {/* ── Progress Bar ── */}
        {showProgress && (
          <ProgressBar progress={progress} isImage={isImageFile(selectedFile)} />
        )}

        {/* ── Result Table ── */}
        {result && (() => {
          const totalPages = Math.ceil(result.rows.length / TABLE_PAGE_SIZE);
          const pageRows = result.rows.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE);
          return (
            <div className="mt-6">

              {/* Table header row */}
              <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Extracted Table</h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                    {result.rows.length} row{result.rows.length !== 1 ? "s" : ""} · {result.fields.length} field{result.fields.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => exportTableToExcel(result.fields, result.rows, baseName)}
                    className="px-4 py-2 rounded-lg text-sm text-white font-medium transition hover:opacity-90"
                    style={{ background: "#16a34a" }}>📗 Excel</button>
                  <button onClick={() => exportTableToPDF(result.fields, result.rows, baseName)}
                    className="px-4 py-2 rounded-lg text-sm text-white font-medium transition hover:opacity-90"
                    style={{ background: "var(--danger)" }}>📕 PDF</button>
                  <button onClick={() => exportTableToDocx(result.fields, result.rows, baseName)}
                    className="px-4 py-2 rounded-lg text-sm text-white font-medium transition hover:opacity-90"
                    style={{ background: "var(--primary)" }}>📘 Word</button>
                  <button onClick={() => navigate("/history")}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-80"
                    style={{ background: "var(--secondary)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                    📚 History
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-xl overflow-hidden"
                style={{ border: "1px solid var(--border)" }}>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr style={{ background: "var(--secondary)" }}>
                        <th className="text-left px-4 py-3 font-semibold whitespace-nowrap w-10 text-xs"
                          style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>#</th>
                        {result.fields.map((f) => (
                          <th key={f} className="text-left px-4 py-3 font-semibold whitespace-nowrap text-xs"
                            style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{f}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((row, i) => (
                        <tr key={i} className="transition"
                          style={{ background: i % 2 === 0 ? "var(--card)" : "var(--secondary)" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(var(--primary-rgb),.06)"}
                          onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "var(--card)" : "var(--secondary)"}>
                          <td className="px-4 py-3 text-xs tabular-nums"
                            style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                            {(tablePage - 1) * TABLE_PAGE_SIZE + i + 1}
                          </td>
                          {result.fields.map((f) => (
                            <td key={f} className="px-4 py-3 whitespace-nowrap"
                              style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{row[f]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3"
                    style={{ borderTop: "1px solid var(--border)", background: "var(--secondary)" }}>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      Showing {(tablePage - 1) * TABLE_PAGE_SIZE + 1}–{Math.min(tablePage * TABLE_PAGE_SIZE, result.rows.length)} of {result.rows.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setTablePage(1)} disabled={tablePage === 1}
                        className="px-2 py-1 rounded text-xs transition disabled:opacity-30"
                        style={{ color: "var(--muted)" }}>«</button>
                      <button onClick={() => setTablePage(p => Math.max(1, p - 1))} disabled={tablePage === 1}
                        className="px-2 py-1 rounded text-xs transition disabled:opacity-30"
                        style={{ color: "var(--muted)" }}>‹ Prev</button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - tablePage) <= 1)
                        .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push("..."); acc.push(p); return acc; }, [])
                        .map((item, idx) =>
                          item === "..." ? <span key={`e-${idx}`} className="px-1 text-xs" style={{ color: "var(--muted)" }}>…</span>
                          : <button key={item} onClick={() => setTablePage(item)}
                              className="min-w-[28px] px-2 py-1 rounded text-xs font-medium transition"
                              style={{
                                background: tablePage === item ? "var(--primary)" : "transparent",
                                color: tablePage === item ? "#fff" : "var(--muted)",
                              }}>{item}</button>
                        )
                      }
                      <button onClick={() => setTablePage(p => Math.min(totalPages, p + 1))} disabled={tablePage === totalPages}
                        className="px-2 py-1 rounded text-xs transition disabled:opacity-30"
                        style={{ color: "var(--muted)" }}>Next ›</button>
                      <button onClick={() => setTablePage(totalPages)} disabled={tablePage === totalPages}
                        className="px-2 py-1 rounded text-xs transition disabled:opacity-30"
                        style={{ color: "var(--muted)" }}>»</button>
                    </div>
                  </div>
                )}
              </div>

              <TableChat tableId={result._id} />
            </div>
          );
        })()}

      </div>

      <TableFieldsModal
        open={showFieldsModal}
        onCancel={() => setShowFieldsModal(false)}
        onConfirm={handleExtract}
        loading={extracting}
        suggestedFields={suggestedFields}
        loadingSuggestions={loadingSuggestions}
      />
    </section>
  );
}

export default ExcelSummary;
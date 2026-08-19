import api from "../api";
import { useState, useRef, useEffect, useCallback } from "react";
import { jsPDF } from "jspdf";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import toast from "react-hot-toast";
import { useNotifications } from "../context/NotificationContext";
import DocumentChat from "./DocumentChat";
import UsageBadge from "./UsageBadge";
import {
  Upload as UploadIcon, BookOpen, Sparkles, Save, CheckCircle2,
  FileText, FileSpreadsheet, FileImage, File, MessageSquare,
  Copy, Download, ArrowRight, Maximize2, Minimize2, ZoomIn, ZoomOut,
  RotateCcw, Eye, Layers, X, Check, Info, ExternalLink
} from "lucide-react";

// ── SSE progress hook (inline — no extra file needed) ────────────────────────
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

// ── Stage label map ───────────────────────────────────────────────────────────
const STAGE_STEPS = [
  { key: "uploading",  label: "Upload",  Icon: UploadIcon   },
  { key: "extracting", label: "Extract", Icon: BookOpen     },
  { key: "ai",         label: "AI",      Icon: Sparkles     },
  { key: "saving",     label: "Save",    Icon: Save         },
  { key: "done",       label: "Done",    Icon: CheckCircle2 },
];

const STAGE_ORDER = STAGE_STEPS.map(s => s.key);

// ── ProgressBar — uses CSS design token vars, not raw Tailwind colour classes ─
function ProgressBar({ progress, isImage }) {
  const { stage, percent, message, error } = progress;
  const currentIdx = error ? -1 : STAGE_ORDER.indexOf(stage);

  // Colours sourced from design token vars so they survive a palette change
  const barBg    = error ? "var(--danger)"  : percent === 100 ? "var(--success)" : "var(--primary)";
  const titleCol = error ? "var(--danger)"  : "var(--primary)";

  return (
    <div
      className="mt-6 p-5 rounded-xl"
      style={{
        background: "rgba(var(--primary-rgb), .06)",
        border: "1px solid rgba(var(--primary-rgb), .15)",
      }}
    >
      {/* Title row */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-bold text-sm" style={{ color: titleCol }}>
          {error
            ? "Error"
            : stage === "done"
            ? "Summary Complete!"
            : isImage
            ? "Analyzing image with AI…"
            : "Generating AI Summary…"}
        </h2>
        <span className="text-sm font-bold tabular-nums" style={{ color: error ? "var(--danger)" : "var(--primary)" }}>
          {error ? "Failed" : `${percent}%`}
        </span>
      </div>

      {/* Sub-message */}
      <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>{message}</p>

      {/* Bar track */}
      <div
        className="w-full h-3 rounded-full overflow-hidden"
        style={{ background: "var(--secondary)" }}
      >
        <div
          className={`h-3 rounded-full transition-all duration-500 ${stage !== "done" && !error ? "relative overflow-hidden" : ""}`}
          style={{ width: `${error ? 100 : percent}%`, background: barBg }}
        >
          {/* Shimmer while in progress */}
          {stage !== "done" && !error && (
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.4s_infinite]" />
          )}
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex justify-between mt-3">
        {STAGE_STEPS.map((step, idx) => {
          const done   = !error && currentIdx >= idx;
          const active = !error && currentIdx === idx;
          const StepIcon = step.Icon;
          return (
            <div key={step.key} className="flex flex-col items-center gap-0.5" style={{ flex: 1 }}>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  background: done
                    ? "var(--primary)"
                    : error
                    ? "rgba(239,68,68,.2)"
                    : "var(--secondary)",
                  boxShadow: done ? "0 1px 4px rgba(var(--primary-rgb),.3)" : "none",
                }}
              >
                <StepIcon
                  size={11}
                  color={done ? "#fff" : error ? "var(--danger)" : "var(--muted)"}
                  className={active && stage !== "done" ? "animate-pulse" : ""}
                />
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

// ── File type helpers ─────────────────────────────────────────────────────────
const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv", "application/csv",
];

const EXCEL_EXTENSIONS = [".xlsx", ".xls", ".csv"];
function getExt(file) { return "." + file.name.split(".").pop().toLowerCase(); }
function isImageFile(file)  { return file && file.type.startsWith("image/"); }
function isPdfFile(file)    { return file && (file.type === "application/pdf" || getExt(file) === ".pdf"); }
function isExcelFile(file)  { return file && EXCEL_EXTENSIONS.includes(getExt(file)); }
function isTextFile(file)   { return file && (file.type === "text/plain" || getExt(file) === ".txt"); }
function isDocxFile(file)   { return file && (getExt(file) === ".docx"); }
function isAllowedFile(file){ return file && (ALLOWED_TYPES.includes(file.type) || isExcelFile(file)); }

function fileTypeLabel(file) {
  if (isImageFile(file))  return { label: "Image",       color: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300", Icon: FileImage       };
  if (isPdfFile(file))    return { label: "PDF",         color: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",             Icon: FileText        };
  if (isExcelFile(file))  return { label: "Spreadsheet", color: "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300", Icon: FileSpreadsheet };
  if (isDocxFile(file))   return { label: "Word Doc",    color: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",         Icon: FileText        };
  if (isTextFile(file))   return { label: "Text",        color: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",         Icon: FileText        };
  return                         { label: "Document",    color: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",         Icon: File            };
}

// ── FilePreview component (Enhanced v2) ────────────────────────────────────────
function FilePreview({ file }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("visual"); // visual | text | info
  const [zoom, setZoom] = useState(100);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);

  const objUrlRef = useRef(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    if (objUrlRef.current) { URL.revokeObjectURL(objUrlRef.current); objUrlRef.current = null; }
    setPreview(null);
    setZoom(100);
    setActiveSheetIdx(0);

    if (isImageFile(file)) {
      const url = URL.createObjectURL(file);
      objUrlRef.current = url;
      setPreview({ type: "image", src: url, name: file.name, size: file.size });
      return;
    }
    if (isPdfFile(file)) {
      const url = URL.createObjectURL(file);
      objUrlRef.current = url;
      setPreview({ type: "pdf", src: url, name: file.name, size: file.size });
      return;
    }
    if (isTextFile(file)) {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result || "";
        setPreview({ type: "text", content: text, name: file.name, size: file.size });
        setLoading(false);
      };
      reader.onerror = () => setLoading(false);
      reader.readAsText(file);
      return;
    }
    if (getExt(file) === ".csv") {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result || "";
        const rows = text.trim().split("\n").map(r => r.split(",").map(c => c.replace(/^"|"$/g, "").trim()));
        setPreview({
          type: "table",
          sheets: [{ sheetName: "Data", rows }],
          content: text,
          name: file.name,
          size: file.size
        });
        setLoading(false);
      };
      reader.onerror = () => setLoading(false);
      reader.readAsText(file);
      return;
    }
    if (isExcelFile(file)) {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
          const wb = XLSX.read(e.target.result, { type: "array" });
          const sheets = wb.SheetNames.map(sName => {
            const ws = wb.Sheets[sName];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
            return { sheetName: sName, rows: rows.slice(0, 30) };
          });
          const firstSheetText = sheets.map(s => `--- ${s.sheetName} ---\n` + s.rows.map(r => r.join("\t")).join("\n")).join("\n\n");
          setPreview({ type: "table", sheets, content: firstSheetText, name: file.name, size: file.size });
        } catch {
          setPreview({ type: "error", message: "Could not render spreadsheet preview." });
        }
        setLoading(false);
      };
      reader.onerror = () => { setPreview({ type: "error", message: "Failed to read file." }); setLoading(false); };
      reader.readAsArrayBuffer(file);
      return;
    }
    if (isDocxFile(file)) {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const mammoth = await import("https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js");
          const result = await mammoth.convertToHtml({ arrayBuffer: e.target.result });
          const rawText = result.value.replace(/<[^>]+>/g, " ");
          setPreview({ type: "docx-html", html: result.value, content: rawText, name: file.name, size: file.size });
        } catch {
          setPreview({ type: "docx", name: file.name, size: file.size });
        }
        setLoading(false);
      };
      reader.onerror = () => { setPreview({ type: "docx", name: file.name, size: file.size }); setLoading(false); };
      reader.readAsArrayBuffer(file);
      return;
    }
  }, [file]);

  useEffect(() => () => { if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current); }, []);

  if (!file) return null;

  function copyContent() {
    const textToCopy = preview?.content || (preview?.type === "text" ? preview.content : file.name);
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      toast.success("Preview content copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const { Icon: FileIconComponent = File, label: typeLabel } = fileTypeLabel(file);

  const wordCount = preview?.content ? preview.content.trim().split(/\s+/).filter(Boolean).length : 0;
  const lineCount = preview?.content ? preview.content.split("\n").length : 0;

  function renderVisualContent(isModal = false) {
    if (!preview) return null;

    if (preview.type === "image") {
      return (
        <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
          <img
            src={preview.src}
            alt={file.name}
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center center" }}
            className={`rounded-xl object-contain transition-transform duration-200 shadow-lg ${isModal ? "max-h-[75vh]" : "max-h-[320px]"}`}
          />
        </div>
      );
    }

    if (preview.type === "pdf") {
      return (
        <div className="w-full h-full flex flex-col" style={{ minHeight: isModal ? "70vh" : "320px" }}>
          <iframe
            src={preview.src + "#toolbar=0&navpanes=0&scrollbar=1&page=1"}
            title="PDF Preview"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
            className="w-full h-full rounded-xl border-0 flex-1 transition-transform duration-200"
          />
        </div>
      );
    }

    if (preview.type === "text") {
      return (
        <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }} className="transition-transform duration-200">
          <pre className="text-xs whitespace-pre-wrap break-words font-mono leading-relaxed p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200">
            {preview.content || "(empty file)"}
          </pre>
        </div>
      );
    }

    if (preview.type === "table") {
      const currentSheet = preview.sheets?.[activeSheetIdx] || preview.sheets?.[0] || { rows: [] };
      const [header, ...rows] = currentSheet.rows || [];
      return (
        <div className="space-y-3" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}>
          {preview.sheets?.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {preview.sheets.map((s, idx) => (
                <button
                  key={s.sheetName}
                  onClick={() => setActiveSheetIdx(idx)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    activeSheetIdx === idx
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  📊 {s.sheetName}
                </button>
              ))}
            </div>
          )}
          <div className="overflow-x-auto overflow-y-auto max-h-[300px] rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="text-xs w-full border-collapse">
              {header && header.length > 0 && (
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800 sticky top-0 border-b border-gray-200 dark:border-gray-700">
                    {header.map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        {String(h || "")}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-gray-100 dark:border-gray-800/60 hover:bg-indigo-500/5 transition">
                    {(Array.isArray(row) ? row : []).map((cell, ci) => (
                      <td key={ci} className="px-3 py-1.5 whitespace-nowrap text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {String(cell ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (preview.type === "docx-html") {
      return (
        <div
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
          className="overflow-y-auto max-h-[320px] rounded-xl p-4 text-xs leading-relaxed bg-white text-gray-900 border border-gray-200 shadow-inner prose prose-xs max-w-none font-serif transition-transform duration-200"
          dangerouslySetInnerHTML={{ __html: preview.html || "<p><em>No content found in document.</em></p>" }}
        />
      );
    }

    if (preview.type === "docx") {
      return (
        <div className="flex items-center gap-4 py-6 px-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800">
          <div className="text-5xl">📝</div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-sm">{preview.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Word Document · {(preview.size / 1024).toFixed(1)} KB</p>
          </div>
        </div>
      );
    }

    if (preview.type === "error") {
      return <p className="text-xs py-4 text-center text-red-500 font-semibold">{preview.message}</p>;
    }

    return null;
  }

  function renderContent(isModal = false) {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-500 dark:text-gray-400">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold">Generating live preview…</span>
        </div>
      );
    }

    if (viewMode === "text") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 pb-2">
            <span>Extracted Text Content</span>
            <span className="font-mono">{wordCount} words · {lineCount} lines</span>
          </div>
          <textarea
            readOnly
            value={preview?.content || "No plain text available."}
            rows={isModal ? 16 : 9}
            className="w-full p-3 font-mono text-xs bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-800 rounded-xl resize-none focus:outline-none"
          />
        </div>
      );
    }

    if (viewMode === "info") {
      return (
        <div className="grid grid-cols-2 gap-3 text-xs p-1">
          <div className="glass-card p-3 rounded-xl border">
            <span className="text-gray-400 block text-[10px] uppercase font-bold mb-0.5">Filename</span>
            <span className="font-semibold text-gray-800 dark:text-white truncate block">{file.name}</span>
          </div>
          <div className="glass-card p-3 rounded-xl border">
            <span className="text-gray-400 block text-[10px] uppercase font-bold mb-0.5">File Size</span>
            <span className="font-semibold text-gray-800 dark:text-white font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <div className="glass-card p-3 rounded-xl border">
            <span className="text-gray-400 block text-[10px] uppercase font-bold mb-0.5">Type</span>
            <span className="font-semibold text-gray-800 dark:text-white">{typeLabel || file.type || "Document"}</span>
          </div>
          <div className="glass-card p-3 rounded-xl border">
            <span className="text-gray-400 block text-[10px] uppercase font-bold mb-0.5">Est. Words</span>
            <span className="font-semibold text-gray-800 dark:text-white font-mono">{wordCount || "N/A"}</span>
          </div>
        </div>
      );
    }

    return renderVisualContent(isModal);
  }

  return (
    <div className="w-full h-full flex flex-col rounded-2xl overflow-hidden glass-card border shadow-sm">
      {/* ── Toolbar Header ── */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-2 shrink-0 flex-wrap bg-gray-100/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
        
        {/* Mode switch */}
        <div className="flex items-center gap-1 bg-white/80 dark:bg-black/50 p-1 rounded-xl border border-gray-200 dark:border-gray-800 shadow-inner">
          <button
            onClick={() => setViewMode("visual")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
              viewMode === "visual"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Eye size={12} /> Visual
          </button>
          <button
            onClick={() => setViewMode("text")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
              viewMode === "text"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <FileText size={12} /> Text
          </button>
          <button
            onClick={() => setViewMode("info")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
              viewMode === "info"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Info size={12} /> Info
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-white/80 dark:bg-black/50 px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-800 text-xs">
            <button onClick={() => setZoom(z => Math.max(50, z - 25))} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300" title="Zoom out">
              <ZoomOut size={12} />
            </button>
            <span className="px-1 text-[10px] font-mono font-bold text-gray-700 dark:text-gray-300">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(200, z + 25))} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300" title="Zoom in">
              <ZoomIn size={12} />
            </button>
            {zoom !== 100 && (
              <button onClick={() => setZoom(100)} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400" title="Reset zoom">
                <RotateCcw size={11} />
              </button>
            )}
          </div>

          {/* Copy button */}
          <button
            onClick={copyContent}
            className="p-1.5 text-xs bg-white/80 dark:bg-black/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 transition"
            title="Copy Content"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </button>

          {/* Fullscreen button */}
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 text-xs bg-white/80 dark:bg-black/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 transition"
            title="Full Screen Preview"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* ── Content View ── */}
      <div className="flex-1 p-4 overflow-auto min-h-[300px]">
        {renderContent(false)}
      </div>

      {/* ── Fullscreen Overlay Modal ── */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col p-4 sm:p-8 animate-fadeIn">
          <div className="flex items-center justify-between mb-4 text-white">
            <div className="flex items-center gap-3">
              <FileIconComponent size={24} className="text-indigo-400" />
              <div>
                <h3 className="font-bold text-lg leading-snug">{file.name}</h3>
                <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB · {typeLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyContent}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />} Copy
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl overflow-hidden p-6 shadow-2xl border border-white/10 flex flex-col">
            {renderContent(true)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Uploadcard ───────────────────────────────────────────────────────────
function Uploadcard() {
  const [selectedFile,  setSelectedFile]  = useState(null);
  const [dragging,      setDragging]      = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [summary,       setSummary]       = useState("");
  const [filename,      setFilename]      = useState("");
  const [stats,         setStats]         = useState(null);
  const [copied,        setCopied]        = useState(false);
  const [documentId,    setDocumentId]    = useState(null);
  const [usageKey,      setUsageKey]      = useState(0);

  const { addNotification } = useNotifications();
  const { progress, startListening, reset: resetProgress } = useProgress();

  async function handleSummarize() {
    if (!selectedFile) return;

    if (!isAllowedFile(selectedFile)) {
      toast.error("Only PDF, DOCX, TXT, XLSX, XLS, CSV, JPG, PNG, and WEBP files are allowed");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("Maximum file size is 10 MB");
      return;
    }

    try {
      setLoading(true);
      setSummary("");
      setStats(null);
      setDocumentId(null);

      const jobId = crypto.randomUUID();
      startListening(jobId);

      const formData = new FormData();
      formData.append("document", selectedFile);
      formData.append("jobId", jobId);

      const response = await api.post("/api/summarize", formData);
      const data = response.data;

      setSummary(data.summary);
      setFilename(data.filename || selectedFile.name);
      setStats(data.stats);
      setDocumentId(data._id);
      setUsageKey(k => k + 1);
      toast.success("Summary generated successfully!");
      addNotification({ title: "Summary ready", message: `${selectedFile.name} was summarized successfully.`, type: "success" });
    } catch (error) {
      console.error(error);
      const errData = error.response?.data || {};
      const message = errData.message || "Error summarizing document";
      if (errData.limitReached) {
        toast.error(`Plan limit reached — ${message}`);
        addNotification({ title: "Usage limit reached", message: `Upgrade your plan to continue. ${message}`, type: "warning" });
      } else {
        toast.error(message);
        addNotification({ title: "Summarization failed", message: `${selectedFile?.name || "Document"}: ${message}`, type: "error" });
      }
      setSummary("");
      setStats(null);
      setDocumentId(null);
    } finally {
      setLoading(false);
    }
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error("Failed to copy"); }
  }

  function downloadTXT() {
    try {
      const blob = new Blob([summary], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "Summary.txt"; a.click();
      URL.revokeObjectURL(url);
      toast.success("Downloaded as TXT");
      addNotification({ title: "Download complete", message: "Summary.txt was downloaded.", type: "info" });
    } catch { toast.error("Failed to download"); }
  }

  function downloadPDF() {
    try {
      const pdf = new jsPDF();
      pdf.setFontSize(18);
      pdf.text("AI Document Summary", 10, 15);
      pdf.setFontSize(11);
      pdf.text(pdf.splitTextToSize(summary, 180), 10, 30);
      pdf.save("Summary.pdf");
      toast.success("Downloaded as PDF");
      addNotification({ title: "Download complete", message: "Summary.pdf was downloaded.", type: "info" });
    } catch { toast.error("Failed to download PDF"); }
  }



  function clearFile() {
    setSelectedFile(null);
    setSummary("");
    setFilename("");
    setStats(null);
    setDocumentId(null);
    resetProgress();
  }

  function handleFileSelect(file) {
    if (!file) return;
    setSelectedFile(file);
    setSummary("");
    setStats(null);
    setDocumentId(null);
    resetProgress();
  }

  const { Icon: FileTypeIcon = File, label: typeLabel, color: typeBadgeColor } = selectedFile ? fileTypeLabel(selectedFile) : {};

  const dropLabel = selectedFile && isImageFile(selectedFile) ? "Image ready for analysis"
    : selectedFile && isPdfFile(selectedFile)   ? "PDF ready for summary"
    : selectedFile && isExcelFile(selectedFile) ? "Spreadsheet ready for summary"
    : selectedFile && isDocxFile(selectedFile)  ? "Word document ready for summary"
    : selectedFile && isTextFile(selectedFile)  ? "Text file ready for summary"
    : "Drag & Drop your file here";

  const summarizeLabel = loading
    ? (isImageFile(selectedFile) ? "Analyzing Image…" : isExcelFile(selectedFile) ? "Summarizing Spreadsheet…" : "Generating Summary…")
    : (isImageFile(selectedFile) ? "Analyze Image"    : isExcelFile(selectedFile) ? "Summarize Spreadsheet"    : "Summarize Document");

  const showProgress = loading || progress.stage === "done" || progress.stage === "error";

  return (
    <section className="rounded-xl shadow-lg transition-colors duration-300 overflow-hidden"
      style={{ background: "var(--card)" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 px-6 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Upload Document</h2>
        <UsageBadge key={usageKey} type="summarize" className="w-56 shrink-0" />
      </div>

      {/* ── Two-panel body ── */}
      <div className={`flex gap-0 ${selectedFile ? "flex-col lg:flex-row" : ""}`}>

        {/* LEFT PANEL — Drop zone / Preview */}
        <div
          className={`flex flex-col ${selectedFile ? "lg:w-[55%] lg:min-h-[520px]" : "w-full"}`}
          style={selectedFile ? { borderRight: "1px solid var(--border)" } : {}}
        >
          {!selectedFile ? (
            /* ── Empty drop zone ── */
            <div
              className="m-6 border-2 border-dashed rounded-xl p-14 flex flex-col items-center transition-all duration-300"
              style={{
                borderColor: dragging ? "var(--primary)" : "var(--border)",
                background: dragging ? "rgba(var(--primary-rgb),.06)" : "transparent",
              }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileSelect(e.dataTransfer.files[0]); }}
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(var(--primary-rgb),.08)" }}>
                <UploadIcon size={28} style={{ color: "var(--primary)" }} />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>Drag & Drop your file here</h3>
              <p className="text-sm mb-6 text-center" style={{ color: "var(--muted)" }}>
                PDF, DOCX, TXT, XLSX, CSV, JPG, PNG, WEBP supported
              </p>
              <label className="px-7 py-3 rounded-lg cursor-pointer text-white font-medium transition hover:opacity-90 shadow"
                style={{ background: "var(--primary)" }}>
                Select File
                <input type="file" className="hidden" accept=".pdf,.txt,.docx,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp,.gif"
                  onChange={(e) => handleFileSelect(e.target.files[0])} />
              </label>
              <p className="text-xs mt-4" style={{ color: "var(--muted)", opacity: 0.5 }}>Max file size: 10 MB</p>
            </div>
          ) : (
            /* ── File selected: show full-height preview ── */
            <div className="flex flex-col h-full">
              {/* File name bar */}
              <div className="px-5 py-3 flex items-center gap-3 shrink-0"
                style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}>
                <FileTypeIcon size={18} style={{ color: "var(--primary)", flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{selectedFile.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {typeLabel && <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${typeBadgeColor}`}>{typeLabel}</span>}
                    <span className="text-[11px]" style={{ color: "var(--muted)" }}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
                {/* Replace file */}
                <label className="shrink-0 text-xs px-3 py-1.5 rounded-lg cursor-pointer font-medium transition hover:opacity-80"
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted)" }}>
                  Replace
                  <input type="file" className="hidden" accept=".pdf,.txt,.docx,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp,.gif"
                    onChange={(e) => handleFileSelect(e.target.files[0])} />
                </label>
              </div>

              {/* Preview fills remaining height */}
              <div className="flex-1 p-4"
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileSelect(e.dataTransfer.files[0]); }}>
                <FilePreview file={selectedFile} />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL — AI controls + summary (only when file selected) */}
        {selectedFile && (
          <div className="flex flex-col lg:w-[45%] px-6 py-5 gap-4">

            {/* AI badge */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                style={{ background: "rgba(var(--primary-rgb),.12)", color: "var(--primary)" }}>✦</div>
              <span className="text-sm font-semibold" style={{ color: "var(--primary)" }}>AI Analysis</span>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>
                {isImageFile(selectedFile) ? "Analyze Image" : "Summarize Document"}
              </h3>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {isImageFile(selectedFile)
                  ? "AI will describe and analyze the image content."
                  : "AI will extract key insights and summarize the document."}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button onClick={handleSummarize} disabled={loading}
                className="flex-1 py-3 rounded-lg text-white font-semibold transition"
                style={{
                  background: loading ? "var(--warning)" : "var(--primary)",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 2px 12px rgba(var(--primary-rgb),.3)",
                }}>
                {summarizeLabel}
              </button>
              <button onClick={clearFile}
                className="px-4 py-3 rounded-lg font-semibold transition hover:opacity-80"
                style={{ background: "var(--secondary)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                ✕
              </button>
            </div>

            {/* Progress */}
            {showProgress && (
              <ProgressBar progress={progress} isImage={isImageFile(selectedFile)} />
            )}

            {/* Summary Output */}
            {summary && (
              <div className="rounded-xl p-5 flex-1 overflow-y-auto"
                style={{ background: "rgba(var(--primary-rgb),.04)", border: "1px solid rgba(var(--primary-rgb),.12)" }}>
                <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>AI Summary</h2>

                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                  h1: ({ children }) => <h1 className="text-2xl font-bold mb-3" style={{ color: "var(--primary)" }}>{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold mt-4 mb-2" style={{ color: "var(--text)" }}>{children}</h2>,
                  p:  ({ children }) => <p className="leading-6 mb-2 text-sm" style={{ color: "var(--muted)" }}>{children}</p>,
                  ul: ({ children }) => <ul className="list-disc ml-5 mb-2 text-sm" style={{ color: "var(--muted)" }}>{children}</ul>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  strong: ({ children }) => <strong className="font-bold" style={{ color: "var(--text)" }}>{children}</strong>,
                }}>
                  {summary}
                </ReactMarkdown>

                {stats && (
                  <div className="mt-5">
                    <h2 className="text-base font-bold mb-3" style={{ color: "var(--text)" }}>Document Statistics</h2>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { icon: "📝", label: "Words",        value: stats.words },
                        { icon: "🔤", label: "Characters",   value: stats.characters },
                        { icon: "⏱",  label: "Reading Time", value: `${stats.readingTime} min` },
                      ].map(({ icon, label, value }) => (
                        <div key={label} className="rounded-lg p-3 shadow"
                          style={{ background: "var(--secondary)" }}>
                          <h3 className="text-xs" style={{ color: "var(--muted)" }}>{icon} {label}</h3>
                          <p className="text-xl font-bold mt-0.5" style={{ color: "var(--text)" }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Next-step CTA panel ── */}
                <div
                  className="mt-5 rounded-xl p-4"
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
                >
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>
                    What's next?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        // Scroll down to the chat section
                        document.getElementById("doc-chat-anchor")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition hover:opacity-80"
                      style={{ background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)" }}
                    >
                      <MessageSquare size={14} />
                      Chat with doc
                    </button>
                    <button
                      onClick={copySummary}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition hover:opacity-80"
                      style={{ background: "var(--card)", color: "var(--muted)", border: "1px solid var(--border)" }}
                    >
                      <Copy size={13} />
                      {copied ? "Copied!" : "Copy text"}
                    </button>
                  </div>
                </div>

                {/* ── Export options ── */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button onClick={copySummary}
                    className="px-4 py-2 rounded-lg text-white text-sm transition hover:opacity-90"
                    style={{ background: "var(--primary)" }}>
                    {copied ? "✅ Copied!" : "📋 Copy"}
                  </button>
                  <button onClick={downloadTXT}
                    className="px-4 py-2 rounded-lg text-white text-sm transition hover:opacity-90"
                    style={{ background: "var(--success)" }}>
                    📄 TXT
                  </button>
                  <button onClick={downloadPDF}
                    className="px-4 py-2 rounded-lg text-white text-sm transition hover:opacity-90"
                    style={{ background: "var(--danger)" }}>
                    📑 PDF
                  </button>
                </div>

                <div id="doc-chat-anchor"><DocumentChat documentId={documentId} /></div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default Uploadcard;
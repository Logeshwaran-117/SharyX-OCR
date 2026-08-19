// src/components/BulkUpload.jsx
// 3.4 — Bulk Upload: queue multiple files, process them sequentially.
//
// Usage in Upload page:
//   import BulkUpload from "../components/BulkUpload";
//   <BulkUpload user={user} onComplete={(results) => { /* navigate or show results */ }} />
//
// The component re-uses the existing single-upload endpoint (/api/summarize)
// sequentially — no server changes needed.

import { useState, useRef, useCallback } from "react";
import api from "../api";
import toast from "react-hot-toast";
import { Upload, X, CheckCircle2, AlertCircle, Loader2, FileText, Plus } from "lucide-react";

const ACCEPTED = ".pdf,.docx,.txt,.png,.jpg,.jpeg";
const MAX_QUEUE = 10; // hard cap regardless of plan

// Map plan → max files per bulk batch
const PLAN_LIMITS = {
  free:       2,
  pro:        10,
  enterprise: 10,
};

function fileIcon(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (["jpg","jpeg","png"].includes(ext)) return "🖼️";
  if (ext === "pdf") return "📕";
  if (ext === "docx") return "📘";
  return "📄";
}

function FileRow({ file, status, error, onRemove }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
      style={{
        background: status === "done"
          ? "rgba(34,197,94,0.07)"
          : status === "error"
          ? "rgba(239,68,68,0.07)"
          : "var(--secondary)",
        border: "1px solid var(--border)",
      }}
    >
      <span className="text-lg shrink-0">{fileIcon(file.name)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
          {file.name}
        </p>
        {error && <p className="text-xs" style={{ color: "var(--danger, #ef4444)" }}>{error}</p>}
        {status === "processing" && (
          <p className="text-xs" style={{ color: "var(--muted)" }}>Processing…</p>
        )}
        {status === "done" && (
          <p className="text-xs" style={{ color: "#16a34a" }}>Done ✓</p>
        )}
        {status === "pending" && (
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {(file.size / 1024 / 1024).toFixed(1)} MB
          </p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {status === "done" && <CheckCircle2 size={16} color="#22c55e" />}
        {status === "error" && <AlertCircle size={16} color="#ef4444" />}
        {status === "processing" && (
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--primary)" }} />
        )}
        {(status === "pending" || status === "error") && (
          <button
            onClick={() => onRemove(file)}
            className="w-6 h-6 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
            style={{ background: "var(--border)", color: "var(--muted)" }}
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function BulkUpload({ user, onComplete }) {
  const [queue, setQueue]         = useState([]); // [{ file, status, error }]
  const [running, setRunning]     = useState(false);
  const [results, setResults]     = useState([]);
  const inputRef                  = useRef(null);

  const planLimit = PLAN_LIMITS[user?.plan] ?? PLAN_LIMITS.free;

  const addFiles = useCallback((files) => {
    const incoming = Array.from(files).slice(0, MAX_QUEUE);
    setQueue((prev) => {
      const existing = new Set(prev.map((q) => q.file.name));
      const newItems = incoming
        .filter((f) => !existing.has(f.name))
        .slice(0, planLimit - prev.length)
        .map((f) => ({ file: f, status: "pending", error: null }));

      if (incoming.length > newItems.length) {
        toast.error(`Your ${user?.plan || "free"} plan allows ${planLimit} files per batch.`);
      }
      return [...prev, ...newItems];
    });
  }, [planLimit, user?.plan]);

  const removeFile = useCallback((file) => {
    setQueue((prev) => prev.filter((q) => q.file !== file));
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  async function processQueue() {
    if (running || queue.length === 0) return;
    setRunning(true);
    setResults([]);

    const batchResults = [];

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === "done") { batchResults.push({ file: item.file, success: true }); continue; }

      // Mark as processing
      setQueue((prev) => prev.map((q, idx) =>
        idx === i ? { ...q, status: "processing", error: null } : q
      ));

      try {
        const form = new FormData();
        form.append("document", item.file);

        const res = await api.post("/api/summarize", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setQueue((prev) => prev.map((q, idx) =>
          idx === i ? { ...q, status: "done" } : q
        ));
        batchResults.push({ file: item.file, success: true, docId: res.data._id });
        toast.success(`✓ ${item.file.name}`);
      } catch (err) {
        const msg = err.response?.data?.message || "Upload failed";
        setQueue((prev) => prev.map((q, idx) =>
          idx === i ? { ...q, status: "error", error: msg } : q
        ));
        batchResults.push({ file: item.file, success: false, error: msg });
        toast.error(`${item.file.name}: ${msg}`);
      }
    }

    setResults(batchResults);
    setRunning(false);
    onComplete?.(batchResults);
  }

  const pending = queue.filter((q) => q.status === "pending").length;
  const done    = queue.filter((q) => q.status === "done").length;
  const errors  = queue.filter((q) => q.status === "error").length;

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Bulk Upload
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Queue up to {planLimit} files — processed one by one
          </p>
        </div>
        {queue.length > 0 && !running && (
          <button
            onClick={() => setQueue([])}
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: "var(--muted)" }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Drop zone */}
      {queue.length < planLimit && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-xl py-6 cursor-pointer transition-all hover:opacity-80 mb-4"
          style={{
            border: "2px dashed var(--border)",
            background: "var(--secondary)",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(var(--primary-rgb), 0.1)" }}
          >
            <Plus size={18} style={{ color: "var(--primary)" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
            Drop files or click to select
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            PDF, DOCX, TXT, PNG, JPG · up to {planLimit} files
          </p>
        </div>
      )}

      {/* File list */}
      {queue.length > 0 && (
        <div className="space-y-2 mb-4">
          {queue.map((item, i) => (
            <FileRow
              key={`${item.file.name}-${i}`}
              file={item.file}
              status={item.status}
              error={item.error}
              onRemove={removeFile}
            />
          ))}
        </div>
      )}

      {/* Progress summary */}
      {(running || results.length > 0) && (
        <div
          className="flex items-center gap-4 text-xs px-3 py-2 rounded-xl mb-4"
          style={{ background: "var(--secondary)", color: "var(--muted)" }}
        >
          <span>📄 {done} done</span>
          {errors > 0 && <span style={{ color: "var(--danger, #ef4444)" }}>⚠️ {errors} failed</span>}
          {running && <span style={{ color: "var(--primary)" }}>⏳ Processing…</span>}
        </div>
      )}

      {/* Action button */}
      {queue.length > 0 && (
        <button
          onClick={processQueue}
          disabled={running || pending === 0}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, var(--primary), #4f46e5)",
            color: "#fff",
          }}
        >
          {running ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Processing {queue.findIndex((q) => q.status === "processing") + 1} of {queue.length}…
            </>
          ) : (
            <>
              <Upload size={15} />
              Process {pending} file{pending !== 1 ? "s" : ""}
            </>
          )}
        </button>
      )}
    </div>
  );
}
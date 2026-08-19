import { useState, useRef, useEffect, useCallback } from "react";
import api from "../api";
import BankingReport from "./BankingReport";

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
        setProgress({
          stage: data.stage,
          percent: data.percent,
          message: data.message,
          done: data.stage === "done",
          error: data.stage === "error"
        });
        if (data.stage === "done" || data.stage === "error") {
          es.close();
          esRef.current = null;
        }
      } catch (_) {}
    };
    es.onerror = () => {
      es.close();
      esRef.current = null;
    };
  }, [reset]);

  useEffect(() => () => { if (esRef.current) esRef.current.close(); }, []);

  return { progress, startListening, resetProgress: reset };
}

const ACCEPTED = ".pdf,.csv,.xlsx,.xls,.txt,.doc,.docx,.png,.jpg,.jpeg,.webp";

export default function BankingUpload({ onAnalysisDone }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState("idle"); // idle | uploading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const { progress, startListening, resetProgress } = useProgress();

  function pickFile(f) {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError("");
    setStage("idle");
    resetProgress();
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files[0]);
  }

  async function analyse() {
    if (!file) return;
    setStage("uploading");
    setError("");
    setResult(null);

    const jobId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);

    startListening(jobId);

    try {
      const fd = new FormData();
      fd.append("document", file);
      fd.append("jobId", jobId);

      const res = await api.post("/api/banking/analyse", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      setStage("done");
      if (onAnalysisDone) onAnalysisDone();
    } catch (err) {
      setError(err.response?.data?.message || "Analysis failed. Please try again.");
      setStage("error");
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError("");
    setStage("idle");
    resetProgress();
  }

  if (stage === "done" && result) {
    return <BankingReport result={result} onBack={reset} />;
  }

  const isProcessing = stage === "uploading";
  const displayPct = isProcessing ? Math.max(progress.percent || 5, 5) : 0;
  const displayMsg = progress.message || "Analyzing financial structures & running AI heuristics…";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Banking & Finance Analyser</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Upload bank statements, loan documents, financial reports, or investment portfolios for AI-powered analysis.
        </p>
      </div>

      {/* Supported types */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: "🏦", label: "Bank Statements", sub: "PDF / CSV / Image", color: "from-blue-500/10 to-indigo-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400" },
          { icon: "📋", label: "Loan Documents", sub: "PDF / Word", color: "from-violet-500/10 to-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400" },
          { icon: "📈", label: "Financial Reports", sub: "PDF / XLSX / Word", color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
          { icon: "💼", label: "Investments", sub: "PDF / CSV / XLSX", color: "from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" },
        ].map(({ icon, label, sub, color }) => (
          <div key={label} className={`bg-gradient-to-br ${color} backdrop-blur-md border rounded-2xl p-3.5 text-center transition-all duration-200 hover:-translate-y-0.5 shadow-sm`}>
            <div className="text-2xl mb-1.5">{icon}</div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">{label}</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !isProcessing && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-200 select-none glass-card
          ${isProcessing ? "opacity-75 pointer-events-none" : ""}
          ${dragging ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]" : "border-gray-300 dark:border-gray-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-500/5"}`}
      >
        <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={e => pickFile(e.target.files[0])} />
        {file ? (
          <div className="py-2">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">📄</div>
            <p className="font-bold text-gray-900 dark:text-white text-base">{file.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
            {!isProcessing && (
              <button onClick={e => { e.stopPropagation(); reset(); }} className="mt-3 px-3 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium transition">Remove file</button>
            )}
          </div>
        ) : (
          <div className="py-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">🏦</div>
            <p className="text-gray-900 dark:text-white font-bold text-lg">Drop your financial document here</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">or click to browse from device</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 max-w-sm mx-auto">PDF, Word, Excel, CSV, TXT, or Image (PNG/JPG) · Max 10 MB</p>
          </div>
        )}
      </div>

      {/* Real-time SSE Upload progress */}
      {isProcessing && (
        <div className="mt-6 glass-card rounded-2xl p-6 shadow-lg border border-indigo-500/20 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              {displayMsg}
            </span>
            <span className="text-sm text-indigo-600 dark:text-indigo-400 font-bold font-mono bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/20">
              {displayPct}%
            </span>
          </div>

          <div className="w-full h-3.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden p-0.5 relative shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500 ease-out shadow-md"
              style={{ width: `${displayPct}%` }}
            />
          </div>

          {/* Pipeline stage milestones */}
          <div className="grid grid-cols-4 gap-1 mt-4 text-[11px] font-medium text-gray-400 dark:text-gray-500 text-center">
            <div className={`py-1 rounded-lg ${displayPct >= 15 ? "text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-500/10" : ""}`}>
              1. Extract Text
            </div>
            <div className={`py-1 rounded-lg ${displayPct >= 30 ? "text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-500/10" : ""}`}>
              2. Extract Transactions
            </div>
            <div className={`py-1 rounded-lg ${displayPct >= 78 ? "text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-500/10" : ""}`}>
              3. Categorise
            </div>
            <div className={`py-1 rounded-lg ${displayPct >= 88 ? "text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-500/10" : ""}`}>
              4. AI Summary
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <p className="text-xs">Processing bank statement with multi-engine AI & direct vision heuristics…</p>
          </div>
        </div>
      )}

      {/* Error */}
      {stage === "error" && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-sm text-red-600 dark:text-red-400 font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Analyse button */}
      {stage === "idle" && (
        <button
          onClick={analyse}
          disabled={!file}
          className={`mt-6 w-full py-4 rounded-2xl text-white font-bold text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-2
            ${file ? "btn-gradient hover:opacity-95 hover:shadow-indigo-500/25" : "bg-gray-300 dark:bg-gray-800 cursor-not-allowed text-gray-400 dark:text-gray-600"}`}
        >
          <span>🔍</span> Analyse Document
        </button>
      )}

      {stage === "error" && (
        <button onClick={reset} className="mt-3 w-full py-3.5 rounded-2xl bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold transition">
          Try Again
        </button>
      )}
    </div>
  );
}
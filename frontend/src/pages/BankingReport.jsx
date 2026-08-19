import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "../api";
import toast from "react-hot-toast";
import BankingCharts from "./BankingCharts";

// ── Voice input hook ──────────────────────────────────────────────────────────
function useVoiceInput(onResult) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  function startListening() {
    if (!supported) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      setListening(false);
      if (e.error !== "no-speech") toast.error("Mic error: " + e.error);
    };
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
    };

    recognitionRef.current = rec;
    rec.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  return { listening, supported, startListening, stopListening };
}

// ── Mic button ────────────────────────────────────────────────────────────────
function MicButton({ listening, supported, onStart, onStop }) {
  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={listening ? onStop : onStart}
      title={listening ? "Stop recording" : "Speak your question"}
      className={`flex-shrink-0 p-2.5 rounded-xl transition ${
        listening
          ? "bg-red-500 text-white animate-pulse"
          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      }`}
    >
      {listening ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-7 8a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5zm7 10v-3h-2v3H8v2h8v-2h-2z" />
        </svg>
      )}
    </button>
  );
}

const TYPE_LABELS = {
  bank_statement: "🏦 Bank Statement",
  loan: "📋 Loan Document",
  financial_report: "📈 Financial Report",
  investment: "💼 Investment Portfolio",
  unknown: "📄 Financial Document",
};

const TABS = ["Summary", "Analytics", "Transactions", "Anomalies", "Q&A"];

// Live exchange rates (fallback if fetch fails)
const FALLBACK_RATES = { USD: 1, INR: 83.5, GBP: 0.79, EUR: 0.92, AED: 3.67, SGD: 1.35 };

export default function BankingReport({ result, onBack }) {
  const [tab, setTab] = useState("Summary");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState(result.chatHistory || []);
  const [chatLoading, setChatLoading] = useState(false);

  const { listening, supported, startListening, stopListening } = useVoiceInput(
    (transcript) => setChatInput((prev) => (prev ? prev + " " + transcript : transcript))
  );
  const [txSearch, setTxSearch] = useState("");
  const [txCategory, setTxCategory] = useState("all");
  const [showAnomalyOnly, setShowAnomalyOnly] = useState(false);
  const [exportLoading, setExportLoading] = useState(null);

  // Currency conversion
  const originalCurrency = result.currency || "USD";
  const [displayCurrency, setDisplayCurrency] = useState(originalCurrency);
  const [rates, setRates] = useState(FALLBACK_RATES);
  const [ratesLoaded, setRatesLoaded] = useState(false);

  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/USD")
      .then(r => r.json())
      .then(data => {
        if (data?.rates) { setRates({ ...FALLBACK_RATES, ...data.rates }); setRatesLoaded(true); }
      })
      .catch(() => setRatesLoaded(false));
  }, []);

  function convert(val) {
    if (val == null) return null;
    if (displayCurrency === originalCurrency) return val;
    const usdRate = rates[originalCurrency] || 1;
    const dstRate = rates[displayCurrency] || 1;
    return (val / usdRate) * dstRate;
  }

  function fmtVal(val) {
    const converted = convert(val);
    if (converted == null) return "—";
    return Number(converted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const cur = displayCurrency;

  const { analytics: rawA, transactions: rawTx = [], _id } = result;

  // Build converted analytics — FIXED: always build A even if rawA has zero values
  const A = rawA ? {
    ...rawA,
    totalCredits: convert(rawA.totalCredits),
    totalDebits: convert(rawA.totalDebits),
    netCashFlow: convert(rawA.netCashFlow),
    openingBalance: convert(rawA.openingBalance),
    closingBalance: convert(rawA.closingBalance),
    avgTransactionAmount: convert(rawA.avgTransactionAmount),
    largestCredit: convert(rawA.largestCredit),
    largestDebit: convert(rawA.largestDebit),
    categoryBreakdown: rawA.categoryBreakdown
      ? Object.fromEntries(Object.entries(rawA.categoryBreakdown).map(([k, v]) => [k, convert(v)]))
      : {},
    monthlyFlow: (rawA.monthlyFlow || []).map(m => ({
      ...m,
      credits: convert(m.credits),
      debits: convert(m.debits),
      net: convert(m.net),
    })),
    anomalies: (rawA.anomalies || []).map(a => ({ ...a, amount: convert(a.amount) })),
  } : null;

  const fmt = (n) => (n != null ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—");

  // Filtered transactions & categories list
  const ALL_CATEGORIES = [
    'Salary & Income', 'Food & Dining', 'Groceries & Supermarket', 'Shopping & Retail',
    'Fuel & Petrol', 'Travel & Transport', 'Utilities & Bills', 'Healthcare & Medical',
    'Entertainment & Media', 'Transfers (P2P)', 'Merchant Payments (P2M)', 'Loan & EMI',
    'Credit Card Bill', 'Investment & Wealth', 'Rent & Maintenance', 'Education & Learning',
    'Cash Withdrawal & ATM', 'Tax & Government Fees', 'Bank Charges & Fees',
    'Subscriptions & Software', 'Business & Professional', 'Other'
  ];

  const presentCategories = Array.from(new Set(rawTx.map(t => t.category).filter(Boolean)));
  const categories = ["all", ...presentCategories, ...ALL_CATEGORIES.filter(c => !presentCategories.includes(c))];

  const filteredTx = rawTx.filter(t => {
    const matchSearch = !txSearch || (t.description || "").toLowerCase().includes(txSearch.toLowerCase()) || (t.counterparty || "").toLowerCase().includes(txSearch.toLowerCase());
    const matchCat = txCategory === "all" || t.category === txCategory;
    const matchAnomaly = !showAnomalyOnly || t.isAnomaly;
    return matchSearch && matchCat && matchAnomaly;
  });

  // FIXED: detect zero-data state so we can show a helpful message
  const hasRealData = rawTx.length > 0 || (rawA && rawA.transactionCount > 0);
  const analyticsHasData = A && (A.totalCredits > 0 || A.totalDebits > 0 || rawTx.length > 0);

  async function doExport(format) {
    if (!_id) { toast.error("Save document first to export"); return; }
    setExportLoading(format);
    try {
      const res = await api.get(`/api/banking/history/${_id}/export`, {
        params: { format },
        responseType: "blob",
      });
      const mimeMap = {
        csv: "text/csv",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        pdf: "application/pdf",
        txt: "text/plain",
      };
      const extMap = { csv: "csv", xlsx: "xlsx", pdf: "pdf", txt: "txt" };
      const blob = new Blob([res.data], { type: mimeMap[format] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(result.filename || "report").replace(/\.[^/.]+$/, "")}_report.${extMap[format]}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} exported!`);
    } catch (err) {
      // When responseType is "blob", error response bodies come back as Blob objects.
      // We must read the Blob as text to extract the real server error message.
      let errorMessage = err.message;
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          errorMessage = json.message || errorMessage;
        } catch {
          // ignore parse errors — keep the default message
        }
      } else {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      toast.error(`Export failed: ${errorMessage}`);
    } finally {
      setExportLoading(null);
    }
  }

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return;
    if (!_id) {
      toast.error("Document ID missing. Please re-upload or select from history.");
      return;
    }
    const question = chatInput.trim();
    setChatInput("");
    setChatLoading(true);
    const prev = [...chatHistory, { role: "user", text: question }];
    setChatHistory(prev);
    try {
      const res = await api.post(`/api/banking/history/${_id}/chat`, { question });
      setChatHistory(res.data.chatHistory || prev);
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.message || "Failed to get answer";
      toast.error(serverMsg);
      setChatHistory([...prev, { role: "assistant", text: `Sorry, ${serverMsg}. Please try asking again.` }]);
    } finally {
      setChatLoading(false);
    }
  }

  const chatEndRef = useRef(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory, chatLoading]);

  const SUPPORTED_CURRENCIES = [originalCurrency, ...["USD", "INR", "GBP", "EUR"].filter(c => c !== originalCurrency)];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="min-w-0">
          <button onClick={onBack} className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 inline-flex items-center gap-1">
            ← New Analysis
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white break-all">{result.filename}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-medium">
              {TYPE_LABELS[result.documentType] || "📄 Document"}
            </span>
            {result.bankName && <span className="text-xs text-gray-500 dark:text-gray-400">🏛 {result.bankName}</span>}
            {result.periodStart && result.periodEnd && (
              <span className="text-xs text-gray-500 dark:text-gray-400">📅 {result.periodStart} → {result.periodEnd}</span>
            )}
          </div>
        </div>

        {/* Controls: currency toggle + export */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">💱</span>
            {SUPPORTED_CURRENCIES.map(c => (
              <button
                key={c}
                onClick={() => setDisplayCurrency(c)}
                className={`text-xs font-semibold px-2 py-0.5 rounded-md transition
                  ${displayCurrency === c
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
              >
                {c}
              </button>
            ))}
            {!ratesLoaded && displayCurrency !== originalCurrency && (
              <span className="text-[10px] text-amber-500">~est</span>
            )}
          </div>
          <ExportMenu onExport={doExport} loading={exportLoading} />
        </div>
      </div>

      {/* KPI strip — FIXED: show even when values are 0 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Credits", val: `${cur} ${A ? fmt(A.totalCredits) : "—"}`, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Total Debits", val: `${cur} ${A ? fmt(A.totalDebits) : "—"}`, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
          { label: "Net Cash Flow", val: `${cur} ${A ? fmt(A.netCashFlow) : "—"}`, color: A && A.netCashFlow >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Transactions", val: rawTx.length || rawA?.transactionCount || 0, color: "text-gray-800 dark:text-white", bg: "bg-gray-100 dark:bg-gray-800" },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 border border-gray-100 dark:border-gray-700`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            <p className={`text-lg font-bold ${color} break-all`}>{val}</p>
          </div>
        ))}
      </div>

      {A?.anomalyCount > 0 && (
        <div className="mb-4 flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl px-4 py-3 text-sm text-orange-700 dark:text-orange-400">
          ⚠️ <strong>{A.anomalyCount} anomalies detected</strong> — review the Anomalies tab for details.
        </div>
      )}

      {/* FIXED: zero-data warning when transactions came back empty */}
      {!hasRealData && result.summary && (
        <div className="mb-4 flex items-start gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
          ℹ️ <span>Transaction data could not be extracted numerically from this document. The AI summary above is based on the raw text. Try re-uploading or use a clearer PDF.</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition
              ${tab === t
                ? "bg-white dark:bg-gray-900 border border-b-white dark:border-b-gray-900 border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 -mb-px"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
          >
            {t === "Anomalies" && rawA?.anomalyCount > 0 ? `${t} (${rawA.anomalyCount})` : t}
            {t === "Transactions" && rawTx.length > 0 ? ` (${rawTx.length})` : ""}
          </button>
        ))}
      </div>

      {/* ── SUMMARY TAB ── */}
      {tab === "Summary" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">AI Executive Summary</h2>
            <button
              onClick={() => { navigator.clipboard.writeText(result.summary); toast.success("Copied!"); }}
              className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg transition font-medium"
            >
              📋 Copy
            </button>
          </div>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => <h2 className="text-base font-bold text-gray-900 dark:text-white mt-5 mb-2 border-b border-gray-100 dark:border-gray-800 pb-1">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-3 mb-1">{children}</h3>,
              p: ({ children }) => <p className="text-sm leading-7 text-gray-700 dark:text-gray-300 mb-3">{children}</p>,
              ul: ({ children }) => <ul className="list-disc ml-5 mb-3 text-sm text-gray-700 dark:text-gray-300 space-y-1">{children}</ul>,
              li: ({ children }) => <li>{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
            }}
          >
            {result.summary}
          </ReactMarkdown>
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {tab === "Analytics" && (
        <div className="space-y-5">
          {/* FIXED: always show analytics cards, even if values are 0 */}
          {A ? (
            <>
              {(A.openingBalance != null || A.closingBalance != null) && (
                <div className="grid grid-cols-2 gap-4">
                  <StatCard label="Opening Balance" val={`${cur} ${fmt(A.openingBalance)}`} icon="🔓" />
                  <StatCard label="Closing Balance" val={`${cur} ${fmt(A.closingBalance)}`} icon="🔒" />
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <StatCard label="Avg Transaction" val={`${cur} ${fmt(A.avgTransactionAmount)}`} icon="📊" />
                <StatCard label="Largest Credit" val={`${cur} ${fmt(A.largestCredit)}`} icon="💚" />
                <StatCard label="Largest Debit" val={`${cur} ${fmt(A.largestDebit)}`} icon="🔴" />
              </div>
              {analyticsHasData ? (
                <BankingCharts analytics={A} currency={cur} />
              ) : (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center">
                  <p className="text-3xl mb-3">📊</p>
                  <p className="text-gray-600 dark:text-gray-300 font-semibold">No chart data available</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Charts appear once transactions with amounts are extracted.</p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center">
              <p className="text-3xl mb-3">📊</p>
              <p className="text-gray-600 dark:text-gray-300 font-semibold">Analytics unavailable</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Re-upload the document to generate analytics.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TRANSACTIONS TAB ── */}
      {tab === "Transactions" && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              value={txSearch}
              onChange={e => setTxSearch(e.target.value)}
              placeholder="Search transactions…"
              className="flex-1 min-w-[180px] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={txCategory}
              onChange={e => setTxCategory(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(c => <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
              <input type="checkbox" checked={showAnomalyOnly} onChange={e => setShowAnomalyOnly(e.target.checked)} className="rounded" />
              Anomalies only
            </label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {filteredTx.length} of {rawTx.length} transactions
          </p>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {["Date", "Description", "Mode", "Category", "Debit", "Credit", "Balance", ""].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-gray-400 dark:text-gray-500">
                        {rawTx.length === 0
                          ? "No transactions were extracted from this document. Try uploading a clearer PDF."
                          : "No transactions match your filters"}
                      </td>
                    </tr>
                  ) : filteredTx.map((t, i) => (
                    <tr key={i} className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition ${t.isAnomaly ? "bg-orange-50 dark:bg-orange-900/10" : ""}`}>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs">{t.date || "—"}</td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200 max-w-[240px]">
                        <p className="truncate font-medium">{t.description || "—"}</p>
                        {t.counterparty && (
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 truncate">Payee: {t.counterparty}</p>
                        )}
                      </td>
                      <td className="px-4 py-3"><PaymentMethodBadge mode={t.paymentMethod} /></td>
                      <td className="px-4 py-3"><CategoryBadge cat={t.category} /></td>
                      <td className="px-4 py-3 text-red-600 dark:text-red-400 font-medium whitespace-nowrap">
                        {t.debit != null ? `${cur} ${fmtVal(t.debit)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                        {t.credit != null ? `${cur} ${fmtVal(t.credit)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {t.balance != null ? `${cur} ${fmtVal(t.balance)}` : "—"}
                      </td>
                      <td className="px-4 py-3">{t.isAnomaly && <span title={t.anomalyReason} className="text-orange-500 cursor-help" aria-label="Anomaly">⚠️</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ANOMALIES TAB ── */}
      {tab === "Anomalies" && (
        <div>
          {(rawA?.anomalyCount ?? 0) === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-gray-600 dark:text-gray-300 font-semibold">No anomalies detected</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your transactions look clean.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(A?.anomalies || []).map((a, i) => (
                <div key={i} className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-orange-600 dark:text-orange-400 font-bold text-sm">⚠️ Anomaly #{i + 1}</span>
                        {a.date && <span className="text-xs text-gray-500 dark:text-gray-400">{a.date}</span>}
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{a.description}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{a.reason}</p>
                    </div>
                    {a.amount != null && (
                      <span className="shrink-0 text-sm font-bold text-orange-700 dark:text-orange-300">
                        {cur} {fmt(a.amount)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Q&A TAB ── */}
      {tab === "Q&A" && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: 480 }}>
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-bold text-gray-800 dark:text-white">Ask about this document</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Ask anything — spending by category, largest transactions, trends, etc.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ maxHeight: 340 }}>
            {chatHistory.length === 0 && (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">💬</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ask your first question to get started.</p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {[
                    "What is my biggest expense category?",
                    "Are there any unusual charges?",
                    "What is my total spending?",
                    "Show transfers above ₹1000",
                  ].map(q => (
                    <button key={q} onClick={() => setChatInput(q)}
                      className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatHistory.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm
                  ${m.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm prose dark:prose-invert max-w-none font-normal"}`}
                >
                  {m.role === "user" ? (
                    m.text
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  {[0, 1, 2].map(d => (
                    <div key={d} className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 p-4 flex gap-3">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()}
              placeholder={listening ? "🎙️ Listening..." : "Ask a question about this document…"}
              className={`flex-1 border rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                listening
                  ? "border-red-400 dark:border-red-500"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            />
            <MicButton
              listening={listening}
              supported={supported}
              onStart={startListening}
              onStop={stopListening}
            />
            <button
              onClick={sendChat}
              disabled={!chatInput.trim() || chatLoading}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl text-sm font-semibold transition"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Export dropdown menu ──────────────────────────────────────────────────────
function ExportMenu({ onExport, loading }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const OPTIONS = [
    { fmt: "csv",  icon: "📊", label: "CSV",        sub: "Spreadsheet-ready" },
    { fmt: "xlsx", icon: "📗", label: "Excel",       sub: "Multi-sheet workbook" },
    { fmt: "pdf",  icon: "📄", label: "PDF Report",  sub: "Formatted report" },
    { fmt: "txt",  icon: "📝", label: "Text File",   sub: "Plain text report" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
      >
        {loading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "⬇"}
        Export
        <span className="text-xs opacity-70">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 px-3 pt-3 pb-1 uppercase tracking-wider">Download as</p>
          {OPTIONS.map(({ fmt, icon, label, sub }) => (
            <button
              key={fmt}
              disabled={loading === fmt}
              onClick={() => { setOpen(false); onExport(fmt); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left disabled:opacity-50"
            >
              <span className="text-lg">{icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>
              </div>
              {loading === fmt && <span className="ml-auto w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, val, icon }) {
  return (
    <div className="glass-card rounded-2xl p-4.5 border transition-all duration-200 hover:-translate-y-0.5 shadow-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{icon}</span>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-lg font-bold text-gray-900 dark:text-white break-all font-heading tracking-tight">{val}</p>
    </div>
  );
}

const CAT_COLORS = {
  "Salary & Income": "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
  "Food & Dining": "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
  "Groceries & Supermarket": "bg-lime-100 dark:bg-lime-900/40 text-lime-700 dark:text-lime-300 border border-lime-200 dark:border-lime-800",
  "Shopping & Retail": "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800",
  "Fuel & Petrol": "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800",
  "Travel & Transport": "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800",
  "Utilities & Bills": "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800",
  "Healthcare & Medical": "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
  "Entertainment & Media": "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
  "Transfers (P2P)": "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800",
  "Merchant Payments (P2M)": "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800",
  "Loan & EMI": "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800",
  "Credit Card Bill": "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800",
  "Investment & Wealth": "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
  "Rent & Maintenance": "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800",
  "Education & Learning": "bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-800",
  "Cash Withdrawal & ATM": "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
  "Tax & Government Fees": "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700",
  "Bank Charges & Fees": "bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700",
  "Subscriptions & Software": "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800",
  "Business & Professional": "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800",
  "Other": "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700",
};

const METHOD_COLORS = {
  UPI: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  NEFT: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  IMPS: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  RTGS: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  ATM: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  POS: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  CHEQUE: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700",
  INTEREST: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  CHARGE: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  OTHER: "bg-gray-100 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700",
};

function PaymentMethodBadge({ mode }) {
  if (!mode || mode === 'OTHER') return null;
  const cls = METHOD_COLORS[mode] || METHOD_COLORS["OTHER"];
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${cls}`}>
      {mode}
    </span>
  );
}

function CategoryBadge({ cat }) {
  const cls = CAT_COLORS[cat] || CAT_COLORS["Other"];
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{cat || "Other"}</span>;
}
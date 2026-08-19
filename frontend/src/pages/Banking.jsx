import { useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Zap, Building2, Search, FolderOpen } from "lucide-react";
import BankingUpload from "./BankingUpload";
import BankingHistory from "./BankingHistory";
import BankingDetailPage from "./BankingDetailPage";
import UsageBadge from "../components/UsageBadge";

const TABS = [
  { id: "analyse", label: "Analyse", icon: Search },
  { id: "history", label: "History", icon: FolderOpen },
];

// Plans that are allowed to use banking
const ALLOWED_PLANS = ["pro", "enterprise"];

function BankingAccessGate({ user }) {
  // user.subscription.plan is the canonical source; user.plan is the top-level mirror.
  // Check both so the gate works regardless of which shape the backend returns.
  const plan = (user?.subscription?.plan || user?.plan || "free").toLowerCase();
  const allowed = ALLOWED_PLANS.includes(plan);

  if (allowed) return null; // no gate needed

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {/* Lock icon — Lucide instead of emoji */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
        style={{
          background: "linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb),.7))",
          boxShadow: "0 8px 24px rgba(var(--primary-rgb),.3)",
        }}
      >
        <Lock size={32} className="text-white" />
      </div>

      <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
        Pro &amp; Enterprise Only
      </h2>
      <p className="text-sm mb-1 max-w-sm" style={{ color: "var(--muted)" }}>
        Banking &amp; Finance analysis is available on the{" "}
        <span className="font-semibold" style={{ color: "var(--primary)" }}>Pro</span> and{" "}
        <span className="font-semibold" style={{ color: "var(--primary)" }}>Enterprise</span> plans.
      </p>
      <p className="text-xs mb-8" style={{ color: "var(--muted)", opacity: 0.7 }}>
        Your current plan: <span className="capitalize font-medium">{plan}</span>
      </p>

      {/* Plan cards — design token classes instead of raw Tailwind colour values */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {/* Pro card */}
        <div
          className="rounded-xl p-4 text-left w-52"
          style={{
            border: "1px solid rgba(var(--primary-rgb),.25)",
            background: "rgba(var(--primary-rgb),.06)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} style={{ color: "var(--primary)" }} />
            <span className="font-bold text-sm" style={{ color: "var(--primary)" }}>Pro</span>
          </div>
          <ul className="text-xs space-y-1" style={{ color: "var(--muted)" }}>
            <li className="flex items-center gap-1.5">
              <span className="text-[var(--success)]">✓</span> Banking document analysis
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-[var(--success)]">✓</span> 15 summaries / day
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-[var(--success)]">✓</span> 15 table extractions / day
            </li>
          </ul>
        </div>

        {/* Enterprise card */}
        <div
          className="rounded-xl p-4 text-left w-52"
          style={{
            border: "1px solid rgba(var(--primary-rgb),.25)",
            background: "rgba(var(--primary-rgb),.06)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={16} style={{ color: "var(--primary)" }} />
            <span className="font-bold text-sm" style={{ color: "var(--primary)" }}>Enterprise</span>
          </div>
          <ul className="text-xs space-y-1" style={{ color: "var(--muted)" }}>
            <li className="flex items-center gap-1.5">
              <span className="text-[var(--success)]">✓</span> Unlimited banking analyses
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-[var(--success)]">✓</span> Unlimited everything
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-[var(--success)]">✓</span> Priority support
            </li>
          </ul>
        </div>
      </div>

      <Link
        to="/pricing"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90"
        style={{
          background: "linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb),.8))",
          boxShadow: "0 4px 16px rgba(var(--primary-rgb),.35)",
        }}
      >
        View Plans &amp; Upgrade →
      </Link>
    </div>
  );
}

export default function Banking({ user }) {
  const [tab, setTab] = useState("analyse");
  const [viewingDocId, setViewingDocId] = useState(null);
  const [usageKey, setUsageKey] = useState(0);

  const plan = (user?.subscription?.plan || user?.plan || "free").toLowerCase();
  const isAllowed = ALLOWED_PLANS.includes(plan);

  function handleViewDoc(id) { setViewingDocId(id); }
  function handleBackFromDetail() { setViewingDocId(null); }
  function handleAnalysisDone() { setUsageKey(k => k + 1); }

  if (viewingDocId) {
    return (
      <div>
        <button
          onClick={handleBackFromDetail}
          className="text-sm hover:underline mb-4 inline-flex items-center gap-1"
          style={{ color: "var(--primary)" }}
        >
          ← Back to History
        </button>
        <BankingDetailPage docId={viewingDocId} onBack={handleBackFromDetail} />
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "var(--primary)" }}
            >
              {/* Lucide Landmark replaces 🏦 emoji in the header icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <line x1="3" y1="22" x2="21" y2="22" />
                <line x1="6" y1="18" x2="6" y2="11" />
                <line x1="10" y1="18" x2="10" y2="11" />
                <line x1="14" y1="18" x2="14" y2="11" />
                <line x1="18" y1="18" x2="18" y2="11" />
                <polygon points="12 2 20 7 4 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Banking &amp; Finance</h1>
              <p className="text-xs" style={{ color: "var(--muted)" }}>AI-powered financial document analysis</p>
            </div>
          </div>

          {/* Usage badge — only visible if allowed */}
          {isAllowed && (
            <UsageBadge key={usageKey} type="banking" className="w-64 shrink-0" />
          )}
        </div>
      </div>

      {/* Access gate for free users */}
      {!isAllowed ? (
        <BankingAccessGate user={user} />
      ) : (
        <>
          {/* Tabs — Lucide icons instead of emojis */}
          <div className="flex gap-1 mb-6 border-b" style={{ borderColor: "var(--border)" }}>
            {TABS.map(t => {
              const TabIcon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-t-lg transition -mb-px`}
                  style={
                    active
                      ? {
                          border: "1px solid var(--border)",
                          borderBottomColor: "var(--card)",
                          background: "var(--card)",
                          color: "var(--primary)",
                        }
                      : { color: "var(--muted)" }
                  }
                >
                  <TabIcon size={14} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === "analyse" && <BankingUpload onAnalysisDone={handleAnalysisDone} />}
          {tab === "history" && <BankingHistory onViewDoc={handleViewDoc} />}
        </>
      )}
    </div>
  );
}
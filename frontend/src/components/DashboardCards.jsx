// src/components/DashboardCards.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../api";

import HeroSection     from "./dashboard/HeroSection";
import AnalyticsCharts from "./dashboard/AnalyticsCharts";
import RecentDocuments from "./dashboard/RecentDocuments";
import SidePanel       from "./dashboard/SidePanel";
import { useNavigate, useLocation } from "react-router-dom";
import OnboardingWizard from "./OnboardingWizard";
import { Upload } from "lucide-react";

/* ── Skeleton ── */
function Skeleton({ className }) {
  return (
    <div
      className={`rounded-xl animate-pulse ${className}`}
      style={{ background: "var(--secondary)" }}
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-64 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-48" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-52" />
        </div>
      </div>
    </div>
  );
}

// ── Empty state shown when user has no documents yet ─────────────────────────
function EmptyDocState() {
  const navigate = useNavigate();
  return (
    <div
      className="rounded-2xl flex flex-col items-center justify-center text-center py-14 px-6"
      style={{ background: "var(--card)", border: "2px dashed var(--border)" }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(var(--primary-rgb),.10)" }}
      >
        <Upload size={22} style={{ color: "var(--primary)" }} />
      </div>
      <h3 className="text-base font-bold mb-1.5" style={{ color: "var(--text)" }}>
        No documents yet
      </h3>
      <p className="text-sm mb-5 max-w-xs" style={{ color: "var(--muted)" }}>
        Upload your first PDF, Word doc, or spreadsheet to get an AI summary in seconds.
      </p>
      <button
        onClick={() => navigate("/upload")}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
        style={{ background: "var(--primary)", boxShadow: "0 2px 12px rgba(var(--primary-rgb),.3)" }}
      >
        Upload your first document →
      </button>
    </div>
  );
}

// ── Module-level cache (survives page-to-page navigation, cleared after 60 s) ──
let _dashCache = null;
let _dashCacheAt = 0;
const DASH_CACHE_TTL = 60_000; // 60 seconds

/* ── Main ── */
function DashboardCards({ user }) {
  const [stats,      setStats]      = useState(() => _dashCache?.stats      ?? null);
  const [recentDocs, setRecentDocs] = useState(() => _dashCache?.recentDocs ?? []);
  const [chartData,  setChartData]  = useState(() => _dashCache?.chartData  ?? []);
  const [billing,    setBilling]    = useState(() => _dashCache?.billing     ?? null);
  const [loading,    setLoading]    = useState(() => !_dashCache || Date.now() - _dashCacheAt > DASH_CACHE_TTL);

  useEffect(() => {
    // If cache is still fresh, skip the fetch
    if (_dashCache && Date.now() - _dashCacheAt < DASH_CACHE_TTL) return;
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [statsRes, historyRes, weeklyRes, billingRes] = await Promise.all([
        api.get("/api/dashboard/stats"),
        api.get("/api/history", { params: { page: 1, limit: 5 } }),
        api.get("/api/dashboard/weekly-uploads"),
        api.get("/api/billing/status").catch(() => ({ data: null })),
      ]);
      const data = {
        stats:      statsRes.data,
        recentDocs: historyRes.data.documents || [],
        chartData:  weeklyRes.data || [],
        billing:    billingRes.data,
      };
      // Save to module-level cache
      _dashCache   = data;
      _dashCacheAt = Date.now();
      setStats(data.stats);
      setRecentDocs(data.recentDocs);
      setChartData(data.chartData);
      setBilling(data.billing);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const location = useLocation();
  const navigate  = useNavigate();
  const storageKey = `onboarding_done_${user?._id}`;

  // Show onboarding if:
  // 1. User just signed up (arrives with ?onboarding=1), OR
  // 2. They haven't completed it yet (key not set in localStorage)
  const fromSignup = new URLSearchParams(location.search).get("onboarding") === "1";
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (fromSignup) {
      // Clear the flag from the URL immediately but keep wizard open
      return true;
    }
    return !localStorage.getItem(storageKey);
  });

  // Strip ?onboarding=1 from URL without a page reload
  useEffect(() => {
    if (fromSignup) {
      navigate("/", { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismissOnboarding = () => {
    localStorage.setItem(storageKey, "1");
    setShowOnboarding(false);
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto"
    >

      {showOnboarding && (
        <OnboardingWizard user={user} onDismiss={handleDismissOnboarding} />
      )}
      {/* ── Unified Hero: greeting + plan badge + quick actions + stat pills ── */}
      <HeroSection user={user} stats={stats} billing={billing} />

      {/* ── Main content: charts + side panel ── */}
      <div className="dashboard-main-grid gap-6">
        <div className="space-y-6 min-w-0">
          <AnalyticsCharts chartData={chartData} />
          {recentDocs.length === 0 && !loading ? (
            <EmptyDocState />
          ) : (
            <RecentDocuments docs={recentDocs} />
          )}
        </div>
        <SidePanel billing={billing} docs={recentDocs} />
      </div>
    </motion.div>
  );
}

export default DashboardCards;
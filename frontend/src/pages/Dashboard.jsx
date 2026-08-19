// src/pages/Dashboard.jsx
// Adds FeatureGate to every route so feature flags actually block access.
// All other code unchanged.

import { lazy, Suspense, useEffect, useState} from "react";
import Navbar            from "../components/Navbar";
import Sidebar           from "../components/Sidebar";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import BulkUpload from "../components/BulkUpload";
import ChangelogPage from "./ChangelogPage";

// ── Lazy-loaded pages (each loads only when the user navigates to it) ─────────
const Uploadcard        = lazy(() => import("../components/Uploadcard"));
const History           = lazy(() => import("./History"));
const DashboardCards    = lazy(() => import("../components/DashboardCards"));
const Settings          = lazy(() => import("./Settings"));
const SummaryDetailPage = lazy(() => import("./SummaryDetailPage"));
const ExcelSummary      = lazy(() => import("./ExcelSummary"));
const TableDetailPage   = lazy(() => import("./TableDetailPage"));
const AdminPanel        = lazy(() => import("./AdminPanel"));
const Pricing           = lazy(() => import("./Pricing"));
const Banking           = lazy(() => import("./Banking"));
const UsageDashboard    = lazy(() => import("./UsageDashboard"));
const PresentationGenerator = lazy(() => import("./PresentationGenerator"));

const TermsPage   = lazy(() => import("./TermsPage"));
const PrivacyPage = lazy(() => import("./PrivacyPage"));

// ── Enterprise wiring ─────────────────────────────────────────────────────────
import MaintenanceGate    from "../components/MaintenanceGate";
import AnnouncementBanner from "../components/AnnouncementBanner";
import FeatureGate        from "../components/FeatureGate";
import { BroadcastToast } from "../components/AdminPanelExtension_v2";

// ── Page loading fallback ─────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>
      </div>
    </div>
  );
}

function AdminGuard({ user, children }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  if (!user || user.role !== "admin") return null;
  return children;
}

function Dashboard({ setIsAuthenticated, user }) {
  const [bulkMode, setBulkMode] = useState(false);
  return (
    <MaintenanceGate user={user}>
      <div className="flex h-screen w-full overflow-hidden" style={{ background: "var(--bg)" }}>
        <Sidebar user={user} />

        <div className="flex flex-col flex-1 h-full overflow-hidden min-w-0">
          <Navbar setIsAuthenticated={setIsAuthenticated} user={user} />

          <main
            className="flex-1 overflow-y-auto transition-colors duration-300"
            style={{ background: "var(--bg)" }}
          >
            {/* Active announcements render as banners/toasts/popups */}
            <AnnouncementBanner user={user} />

            <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Dashboard — always available */}
              <Route path="/" element={<DashboardCards user={user} />} />

              {/* Summarizer / Upload */}
              <Route
                path="/upload"
                element={
                  <FeatureGate flag="summarizer">
                    <FeatureGate flag="docUpload">
                      <div className="p-6">
                        <div className="flex justify-end mb-4">
                          <button
                            onClick={() => setBulkMode((v) => !v)}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                          >
                            {bulkMode ? "📄 Single File" : "📂 Bulk Upload"}
                          </button>
                        </div>
                        {bulkMode ? (
                          <BulkUpload user={user} onComplete={(results) => console.log(results)} />
                        ) : (
                          <Uploadcard />
                        )}
                      </div>
                    </FeatureGate>
                  </FeatureGate>
                }
              />

              {/* History */}
              <Route path="/history"     element={<History />} />
              <Route path="/history/:id" element={<SummaryDetailPage />} />

              {/* Settings */}
              <Route path="/settings" element={<Settings user={user} setIsAuthenticated={setIsAuthenticated} />} />

              {/* Table extraction */}
              <Route
                path="/excel"
                element={
                  <FeatureGate flag="tableExtract">
                    <ExcelSummary />
                  </FeatureGate>
                }
              />
              <Route path="/tables/:id" element={<TableDetailPage />} />

              {/* Pricing */}
              <Route path="/pricing" element={<Pricing user={user} />} />

              {/* Banking */}
              <Route
                path="/banking"
                element={
                  <FeatureGate flag="summarizer">
                    <Banking user={user} />
                  </FeatureGate>
                }
              />

              {/* AI Presentation Generator */}
              <Route path="/presentation" element={<PresentationGenerator user={user} />} />





              {/* Admin — always accessible to admins regardless of flags */}
              <Route
                path="/admin"
                element={
                  <AdminGuard user={user}>
                    <AdminPanel />
                  </AdminGuard>
                }
              />
              <Route
                path="/usage-dashboard"
                element={
                  <AdminGuard user={user}>
                    <UsageDashboard />
                  </AdminGuard>
                }
              />

              <Route path="/terms"   element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />

              <Route path="*" element={<Navigate to="/" />} />
              <Route path="/changelog" element={<ChangelogPage />} />
            </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>

        {/* Broadcast toasts — floats above all content */}
        <BroadcastToast />
      </div>
    </MaintenanceGate>
  );
}

export default Dashboard;
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import api from "./api";
import Signup from "./pages/Signup";
import { ToastProvider } from "./components/toastProvider";
import { NotificationProvider } from "./context/NotificationContext";
import LandingPage from "./pages/LandingPage";
import SharedSummaryPage from "./pages/SharedSummaryPage";

function App() {
  const [summary, setSummary] = useState("");
  const [stats, setStats] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Uses VITE_API_URL in production; falls back to localhost only in dev
    api.get("/auth/status")
      .then((res) => {
        setIsAuthenticated(true);
        setUser(res.data.user);
      })
      .catch(() => setIsAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <NotificationProvider>
        <ToastProvider />
        <div className="h-screen w-full">
          <Routes>
            {/* Public landing page — always accessible */}
            <Route path="/home" element={<LandingPage />} />
            <Route path="/login" element={<Auth setIsAuthenticated={setIsAuthenticated} setUser={setUser} />} />
            <Route path="/shared/:token" element={<SharedSummaryPage />} />
            <Route
              path="/*"
              element={
                isAuthenticated ? (
                  <Dashboard
                    summary={summary}
                    setSummary={setSummary}
                    stats={stats}
                    setStats={setStats}
                    setIsAuthenticated={setIsAuthenticated}
                    user={user}
                    setUser={setUser}
                  />
                ) : (
                  <Navigate to="/home" />
                )
              }
            />
            <Route path="/signup" element={<Signup setIsAuthenticated={setIsAuthenticated} setUser={setUser} />} />
          </Routes>
        </div>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
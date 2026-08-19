import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import googleLogo from "../assets/google.png";
import { FileText, Landmark, MessageSquare } from "lucide-react";

/* ── Feature bullets shown on the left panel ── */
const FEATURES = [
  {
    Icon: FileText,
    title: "Instant AI Summaries",
    desc: "Summarize 100-page PDFs in under 30 seconds",
  },
  {
    Icon: Landmark,
    title: "Banking Intelligence",
    desc: "Auto-detect and analyse financial documents",
  },
  {
    Icon: MessageSquare,
    title: "Chat with your Docs",
    desc: "Ask questions, get answers from your documents",
  },
];

/* ── Floating stat badges shown on the left panel ── */
const STATS = [
  { value: "10k+", label: "Documents processed" },
  { value: "98%", label: "Accuracy rate" },
  { value: "30s", label: "Avg. summary time" },
];

function Auth({ setIsAuthenticated, setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await api.post("/auth/login", { email, password });
      setUser?.(r.data.user);
      setIsAuthenticated(true);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  const handleGoogleLogin = () => {
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    window.location.href = `${base}/auth/google`;
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--bg)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── LEFT PANEL ── */}
      <div
        style={{
          flex: "0 0 480px",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(145deg, #1e1b4b 0%, #312e81 40%, #4338ca 75%, #6366f1 100%)",
          padding: "48px 48px",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
        className="auth-left-panel"
      >
        {/* Ambient blobs */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-60px",
            width: "320px",
            height: "320px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,.35) 0%, transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            left: "-80px",
            width: "260px",
            height: "260px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,.3) 0%, transparent 70%)",
            filter: "blur(48px)",
            pointerEvents: "none",
          }}
        />

        {/* Logo */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "56px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "rgba(255,255,255,.18)",
                border: "1px solid rgba(255,255,255,.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
              }}
            >
              ✦
            </div>
            <div>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: "18px", lineHeight: 1 }}>SharyX OCR</p>
              <p style={{ color: "rgba(255,255,255,.55)", fontSize: "12px", marginTop: "2px" }}>
                Powered by Gemini
              </p>
            </div>
          </div>

          {/* Headline */}
          <h1
            style={{
              color: "#fff",
              fontSize: "34px",
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              marginBottom: "16px",
            }}
          >
            Summarize smarter.
            <br />
            <span style={{ color: "#a5b4fc" }}>Work faster.</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,.65)", fontSize: "15px", lineHeight: 1.6, marginBottom: "40px" }}>
            AI-powered document intelligence — summaries, tables, presentations and banking analysis in one place.
          </p>

          {/* Feature list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {FEATURES.map((f) => {
              const Icon = f.Icon;
              return (
              <div key={f.title} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,.12)",
                    border: "1px solid rgba(255,255,255,.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} color="rgba(255,255,255,0.9)" />
                </div>
                <div>
                  <p style={{ color: "#fff", fontWeight: 600, fontSize: "14px", marginBottom: "2px" }}>{f.title}</p>
                  <p style={{ color: "rgba(255,255,255,.55)", fontSize: "13px" }}>{f.desc}</p>
                </div>
              </div>
            );})}
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            gap: "8px",
            marginTop: "40px",
          }}
        >
          {STATS.map((s) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                background: "rgba(255,255,255,.1)",
                border: "1px solid rgba(255,255,255,.18)",
                borderRadius: "12px",
                padding: "12px",
                textAlign: "center",
              }}
            >
              <p style={{ color: "#fff", fontWeight: 800, fontSize: "20px", lineHeight: 1 }}>{s.value}</p>
              <p style={{ color: "rgba(255,255,255,.55)", fontSize: "11px", marginTop: "4px" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL (form) ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          background: "var(--bg)",
        }}
      >
        <div style={{ width: "100%", maxWidth: "400px" }}>
          {/* Mobile logo (hidden on desktop via the left panel) */}
          <div
            className="auth-mobile-logo"
            style={{ textAlign: "center", marginBottom: "32px" }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 16px",
                background: "rgba(var(--primary-rgb),.08)",
                borderRadius: "12px",
                border: "1px solid rgba(var(--primary-rgb),.2)",
              }}
            >
              <span style={{ fontSize: "20px" }}>✦</span>
              <span
                style={{ fontWeight: 700, fontSize: "16px", color: "var(--primary)" }}
              >
                SharyX OCR
              </span>
            </div>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: "28px" }}>
            <h2
              style={{
                fontSize: "26px",
                fontWeight: 800,
                color: "var(--text)",
                letterSpacing: "-0.02em",
                marginBottom: "6px",
              }}
            >
              Welcome back
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "14px" }}>
              Sign in to your workspace to continue
            </p>
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "11px 16px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              marginBottom: "20px",
              transition: "border-color .15s, box-shadow .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(var(--primary-rgb),.4)";
              e.currentTarget.style.boxShadow = "0 2px 12px rgba(var(--primary-rgb),.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <img src={googleLogo} alt="" style={{ width: "18px", height: "18px" }} />
            Continue with Google
          </button>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            <span style={{ color: "var(--muted)", fontSize: "12px", fontWeight: 500 }}>
              or continue with email
            </span>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: "rgba(239,68,68,.08)",
                border: "1px solid rgba(239,68,68,.25)",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "16px",
                color: "#ef4444",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>⚠</span> {error}
            </div>
          )}

          {/* Email field */}
          <div style={{ marginBottom: "14px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--text)",
                marginBottom: "6px",
              }}
            >
              Email address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                width: "100%",
                padding: "10px 13px",
                borderRadius: "9px",
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                fontSize: "14px",
                outline: "none",
                transition: "border-color .15s, box-shadow .15s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--primary)";
                e.target.style.boxShadow = "0 0 0 3px rgba(var(--primary-rgb),.12)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Password field */}
          <div style={{ marginBottom: "22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label
                style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)" }}
              >
                Password
              </label>
              <p style={{ textAlign: "center", marginTop: "0.75rem", fontSize: "0.85rem" }}>
                <Link to="/forgot-password" style={{ color: "#2563eb" }}>Forgot your password?</Link>
             </p>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                width: "100%",
                padding: "10px 13px",
                borderRadius: "9px",
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                fontSize: "14px",
                outline: "none",
                transition: "border-color .15s, box-shadow .15s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--primary)";
                e.target.style.boxShadow = "0 0 0 3px rgba(var(--primary-rgb),.12)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Sign in button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "10px",
              border: "none",
              background: loading
                ? "rgba(var(--primary-rgb),.5)"
                : "linear-gradient(135deg, var(--primary), #818cf8)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "0.01em",
              transition: "opacity .15s, transform .1s",
              boxShadow: "0 4px 14px rgba(var(--primary-rgb),.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = ".9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    width: "14px",
                    height: "14px",
                    border: "2px solid rgba(255,255,255,.4)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin .7s linear infinite",
                  }}
                />
                Signing in…
              </>
            ) : (
              "Sign in to workspace →"
            )}
          </button>

          {/* Sign up link */}
          <p
            style={{
              textAlign: "center",
              marginTop: "20px",
              fontSize: "13px",
              color: "var(--muted)",
            }}
          >
            Don't have an account?{" "}
            <Link
              to="/signup"
              style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}
            >
              Create one free →
            </Link>
          </p>

          {/* Trust badges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "18px",
              marginTop: "32px",
              paddingTop: "20px",
              borderTop: "1px solid var(--border)",
            }}
          >
            {["🔒 SSL secured", "🛡️ GDPR safe", "⚡ Instant access"].map((t) => (
              <span key={t} style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500 }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Responsive styles injected inline */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .auth-left-panel { display: none; }
        @media (min-width: 900px) {
          .auth-left-panel { display: flex !important; }
          .auth-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default Auth;
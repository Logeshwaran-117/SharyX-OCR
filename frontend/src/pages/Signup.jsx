import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import googleLogo from "../assets/google.png";

/* ── Plan perks shown in the left panel ── */
const PERKS = [
  { icon: "✦", text: "5 free AI summaries daily" },
  { icon: "✦", text: "PDF, DOCX, image & scanned doc support" },
  { icon: "✦", text: "Table extraction & Excel export" },
  { icon: "✦", text: "Chat with your documents" },
  { icon: "✦", text: "One-click PowerPoint generation" },
];

function Signup({ setIsAuthenticated, setUser }) {
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const navigate = useNavigate();

  // Password strength: 0 = empty, 1 = weak, 2 = medium, 3 = strong
  function passwordStrength(pw) {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }
  const strength = passwordStrength(password);
  const strengthLabel = ["", "Weak", "Medium", "Strong"][strength];
  const strengthColor = ["", "#ef4444", "#f59e0b", "#22c55e"][strength];

  const handleSignup = async () => {
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await api.post("/auth/signup", { name, email, password });
      setUser?.(r.data.user);
      setIsAuthenticated(true);
      // Fresh signups go to onboarding — DashboardCards reads this flag
      navigate("/?onboarding=1");
    } catch (err) {
      setError(err.response?.data?.message || "Could not create account. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSignup();
  };

  const handleGoogleLogin = () => {
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    window.location.href = `${base}/auth/google`;
  };

  const inputStyle = {
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
  };

  const handleFocus = (e) => {
    e.target.style.borderColor = "var(--primary)";
    e.target.style.boxShadow = "0 0 0 3px rgba(var(--primary-rgb),.12)";
  };
  const handleBlur = (e) => {
    e.target.style.borderColor = "var(--border)";
    e.target.style.boxShadow = "none";
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
          flex: "0 0 440px",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(145deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)",
          padding: "48px 44px",
          flexDirection: "column",
        }}
        className="signup-left-panel"
      >
        {/* Glow blobs */}
        <div
          style={{
            position: "absolute",
            top: "-60px",
            left: "-60px",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,.3) 0%, transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "80px",
            right: "-80px",
            width: "240px",
            height: "240px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,.25) 0%, transparent 70%)",
            filter: "blur(48px)",
            pointerEvents: "none",
          }}
        />

        {/* Logo */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "52px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "rgba(255,255,255,.15)",
                border: "1px solid rgba(255,255,255,.22)",
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
              <p style={{ color: "rgba(255,255,255,.5)", fontSize: "12px", marginTop: "2px" }}>
                Powered by Gemini
              </p>
            </div>
          </div>

          <p
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              background: "rgba(99,102,241,.25)",
              border: "1px solid rgba(99,102,241,.4)",
              borderRadius: "20px",
              color: "#a5b4fc",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              marginBottom: "20px",
            }}
          >
            ⚡ FREE FOREVER PLAN
          </p>

          <h1
            style={{
              color: "#fff",
              fontSize: "30px",
              fontWeight: 800,
              lineHeight: 1.22,
              letterSpacing: "-0.02em",
              marginBottom: "14px",
            }}
          >
            Start summarizing
            <br />
            <span style={{ color: "#a5b4fc" }}>in 60 seconds.</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,.6)", fontSize: "14px", lineHeight: 1.65, marginBottom: "36px" }}>
            No credit card required. Get instant access to AI-powered document intelligence.
          </p>

          {/* Perks */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {PERKS.map((p) => (
              <div key={p.text} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "6px",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    color: "#fff",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </div>
                <span style={{ color: "rgba(255,255,255,.75)", fontSize: "13px" }}>{p.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom testimonial */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            marginTop: "48px",
            padding: "18px",
            background: "rgba(255,255,255,.07)",
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: "14px",
          }}
        >
          <p style={{ color: "rgba(255,255,255,.75)", fontSize: "13px", lineHeight: 1.6, marginBottom: "12px" }}>
            "SharyX OCR saved our team 6 hours a week on document review. The banking analysis feature alone paid for the subscription."
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: "12px",
              }}
            >
              PK
            </div>
            <div>
              <p style={{ color: "#fff", fontWeight: 600, fontSize: "12px" }}>Priya K.</p>
              <p style={{ color: "rgba(255,255,255,.45)", fontSize: "11px" }}>Finance Analyst</p>
            </div>
          </div>
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
          {/* Mobile logo */}
          <div className="signup-mobile-logo" style={{ textAlign: "center", marginBottom: "28px" }}>
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
              <span style={{ fontWeight: 700, fontSize: "16px", color: "var(--primary)" }}>SharyX OCR</span>
            </div>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: "24px" }}>
            <h2
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: "var(--text)",
                letterSpacing: "-0.02em",
                marginBottom: "6px",
              }}
            >
              Create your account
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "14px" }}>
              Free forever · No credit card needed
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
              marginBottom: "18px",
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
            Sign up with Google
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            <span style={{ color: "var(--muted)", fontSize: "12px", fontWeight: 500 }}>
              or with email
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

          {/* Name field */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text)", marginBottom: "5px" }}>
              Full name <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Logesh Waran"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {/* Email field */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text)", marginBottom: "5px" }}>
              Email address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {/* Password field */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text)", marginBottom: "5px" }}>
              Password
            </label>
            <input
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            {/* Password strength bar */}
            {password.length > 0 && (
              <div style={{ marginTop: "8px" }}>
                <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      style={{
                        flex: 1,
                        height: "3px",
                        borderRadius: "99px",
                        background: strength >= level ? strengthColor : "var(--border)",
                        transition: "background 0.25s",
                      }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: "11px", color: strengthColor, fontWeight: 600 }}>
                  {strengthLabel}
                  {strength === 1 && " — add uppercase, numbers or symbols"}
                  {strength === 2 && " — add more variety to strengthen"}
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text)", marginBottom: "5px" }}>
              Confirm password
            </label>
            <input
              type="password"
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                ...inputStyle,
                borderColor: confirm && password !== confirm ? "rgba(239,68,68,.5)" : undefined,
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            {confirm && password !== confirm && (
              <p style={{ fontSize: "12px", color: "#ef4444", marginTop: "4px" }}>
                Passwords don't match
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSignup}
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
              transition: "opacity .15s",
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
                Creating account…
              </>
            ) : (
              "Create free account →"
            )}
          </button>

          <p style={{ fontSize: "11px", color: "var(--muted)", textAlign: "center", marginTop: "12px", lineHeight: 1.5 }}>
            By signing up you agree to our{" "}
            <a href="#" style={{ color: "var(--primary)", textDecoration: "none" }}>Terms</a>{" "}
            and{" "}
            <a href="#" style={{ color: "var(--primary)", textDecoration: "none" }}>Privacy Policy</a>.
          </p>

          {/* Sign in link */}
          <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "var(--muted)" }}>
            Already have an account?{" "}
            <Link
              to="/login"
              style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}
            >
              Sign in →
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .signup-left-panel { display: none; }
        @media (min-width: 900px) {
          .signup-left-panel { display: flex !important; }
          .signup-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default Signup;
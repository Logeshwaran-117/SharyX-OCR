// src/components/OnboardingWizard.jsx
//
// Shown to new users on first login. Persists completion state in localStorage
// under the key "onboarding_done_<userId>".
//
// Usage — drop into DashboardCards.jsx:
//
//   import OnboardingWizard from "../components/OnboardingWizard";
//
//   // Inside DashboardCards, before the main return:
//   const storageKey = `onboarding_done_${user?._id}`;
//   const [showOnboarding, setShowOnboarding] = useState(
//     !localStorage.getItem(storageKey)
//   );
//   const handleDismiss = () => {
//     localStorage.setItem(storageKey, "1");
//     setShowOnboarding(false);
//   };
//
//   // Then in JSX above <HeroSection>:
//   {showOnboarding && <OnboardingWizard user={user} onDismiss={handleDismiss} />}

import { useState } from "react";
import { useNavigate } from "react-router-dom";

const STEPS = [
  {
    id: "welcome",
    icon: "👋",
    title: (name) => `Welcome${name ? `, ${name.split(" ")[0]}` : ""}!`,
    body: "You're all set. Let's walk you through the three things you can do right now.",
    cta: "Show me around",
    secondary: null,
  },
  {
    id: "upload",
    icon: "📄",
    title: () => "Upload your first document",
    body: "Drag in a PDF or Word file and get a plain-English summary in under 10 seconds. Supports PDFs, DOCX, and TXT up to 10 MB.",
    cta: "Go to upload",
    secondary: "Next",
    route: "/upload",
  },
  {
    id: "tables",
    icon: "📊",
    title: () => "Extract tables from any file",
    body: "Pull structured data from PDFs and spreadsheets without copying and pasting. Export to CSV in one click.",
    cta: "Try table extraction",
    secondary: "Next",
    route: "/excel",
  },
  {
    id: "banking",
    icon: "🏦",
    title: () => "Analyze a bank statement",
    body: "Upload a bank PDF and get categorized spend, charts, and a downloadable report — great for month-end reviews.",
    cta: "Try banking analysis",
    secondary: "Next",
    route: "/banking",
  },
  {
    id: "done",
    icon: "🎉",
    title: () => "You're ready to go",
    body: "That's everything. Explore at your own pace — your history is saved and you can revisit any summary anytime.",
    cta: "Go to dashboard",
    secondary: null,
  },
];

export default function OnboardingWizard({ user, onDismiss }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function handleCta() {
    if (isLast || step === 0) {
      if (isLast) { onDismiss(); return; }
      setStep((s) => s + 1);
      return;
    }
    if (current.route) {
      onDismiss();
      navigate(current.route);
    }
  }

  function handleSecondary() {
    setStep((s) => s + 1);
  }

  return (
    /* Overlay */
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
    }}>
      {/* Card */}
      <div style={{
        background: "var(--bg, #fff)",
        borderRadius: "20px",
        padding: "2.5rem 2rem 2rem",
        maxWidth: "460px", width: "100%",
        position: "relative",
        boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
      }}>
        {/* Dismiss */}
        <button
          onClick={onDismiss}
          aria-label="Skip onboarding"
          style={{
            position: "absolute", top: "1rem", right: "1rem",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--muted, #9ca3af)", fontSize: "1.2rem", lineHeight: 1,
            padding: "0.25rem",
          }}
        >
          ✕
        </button>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "2rem" }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: "4px",
              flex: 1,
              borderRadius: "4px",
              background: i <= step
                ? "#2563eb"
                : "var(--secondary, #e5e7eb)",
              transition: "background 0.25s",
            }} />
          ))}
        </div>

        {/* Icon */}
        <div style={{ fontSize: "2.8rem", marginBottom: "1rem" }}>{current.icon}</div>

        {/* Heading */}
        <h2 style={{
          fontSize: "1.35rem", fontWeight: 800, margin: "0 0 0.6rem",
          color: "var(--text, #111827)", letterSpacing: "-0.02em",
        }}>
          {current.title(user?.name)}
        </h2>

        {/* Body */}
        <p style={{
          color: "var(--muted, #6b7280)", fontSize: "0.95rem",
          lineHeight: 1.7, margin: "0 0 2.25rem",
        }}>
          {current.body}
        </p>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {/* Primary CTA */}
          <button
            onClick={handleCta}
            style={{
              flex: 1,
              background: "#2563eb", color: "#fff",
              border: "none", borderRadius: "10px",
              padding: "0.7rem 1rem", fontWeight: 700,
              fontSize: "0.95rem", cursor: "pointer",
            }}
          >
            {current.cta}
          </button>

          {/* Secondary (skip to next step) */}
          {current.secondary && (
            <button
              onClick={handleSecondary}
              style={{
                background: "none",
                color: "var(--muted, #6b7280)",
                border: "1px solid var(--border, #d1d5db)",
                borderRadius: "10px",
                padding: "0.7rem 1rem", fontWeight: 600,
                fontSize: "0.9rem", cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {current.secondary}
            </button>
          )}
        </div>

        {/* Step count */}
        <p style={{
          textAlign: "center", color: "var(--muted, #9ca3af)",
          fontSize: "0.78rem", marginTop: "1.25rem", marginBottom: 0,
        }}>
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
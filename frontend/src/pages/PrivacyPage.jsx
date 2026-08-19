// src/pages/PrivacyPage.jsx
import { useNavigate } from "react-router-dom";

const SECTIONS = [
  {
    title: "1. Information We Collect",
    items: [
      { label: "Account Data", detail: "Name, email address, and password (hashed) when you register." },
      { label: "Uploaded Documents", detail: "Files you upload are processed by our AI to produce summaries, tables, or other outputs. They are stored temporarily and deleted per our retention schedule." },
      { label: "Usage Data", detail: "We log page views, feature interactions, API request counts, and performance metrics to improve the service." },
      { label: "Payment Data", detail: "Billing is handled by our payment processor (Cashfree). We do not store full card numbers on our servers." },
    ],
  },
  {
    title: "2. How We Use Your Information",
    items: [
      { label: "Service Delivery", detail: "To process your documents and return AI-generated outputs." },
      { label: "Account Management", detail: "To manage subscriptions, quotas, and billing." },
      { label: "Communication", detail: "To send transactional emails (invoices, alerts, plan changes)." },
      { label: "Analytics", detail: "Aggregated, anonymised usage data helps us improve features and performance." },
    ],
  },
  {
    title: "3. Data Sharing",
    items: [
      { label: "We do not sell your data.", detail: "Your documents and personal information are never sold to third parties." },
      { label: "AI Processing", detail: "Document content is sent to our AI provider solely to generate your requested output and is not used for model training." },
      { label: "Legal Requirements", detail: "We may disclose information if required by law, court order, or to protect the rights and safety of SharyX OCR or its users." },
    ],
  },
  {
    title: "4. Data Retention",
    items: [
      { label: "Documents", detail: "Uploaded files are retained for a limited period to allow re-processing, then permanently deleted." },
      { label: "Account Data", detail: "Retained while your account is active. Deleted within 30 days of account closure upon request." },
      { label: "Logs", detail: "System logs are retained for up to 90 days for debugging and security purposes." },
    ],
  },
  {
    title: "5. Security",
    items: [
      { label: "Encryption", detail: "All data is encrypted in transit (TLS) and at rest (AES-256)." },
      { label: "Access Control", detail: "Only authorised personnel can access production systems and user data." },
      { label: "Incidents", detail: "In the event of a data breach, we will notify affected users within 72 hours." },
    ],
  },
  {
    title: "6. Your Rights",
    items: [
      { label: "Access", detail: "Request a copy of the personal data we hold about you." },
      { label: "Correction", detail: "Ask us to correct inaccurate information." },
      { label: "Deletion", detail: "Request deletion of your account and associated data." },
      { label: "Portability", detail: "Request your data in a machine-readable format." },
    ],
  },
  {
    title: "7. Cookies",
    items: [
      { label: "Session Cookies", detail: "Used to keep you logged in across page loads." },
      { label: "Preference Cookies", detail: "Store your theme (light/dark) and UI preferences." },
      { label: "No tracking cookies", detail: "We do not use third-party advertising or tracking cookies." },
    ],
  },
  {
    title: "8. Contact Us",
    items: [
      { label: "Privacy enquiries", detail: "privacy@sharyxocr.com — we aim to respond within 5 business days." },
    ],
  },
];

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full" style={{ color: "var(--text)" }}>
      {/* Page header */}
      <div
        className="border-b px-6 py-4 flex items-center gap-4"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg"
          style={{ color: "var(--muted)", background: "var(--secondary)" }}
        >
          ← Back
        </button>
        <div>
          <h1 className="font-bold text-lg" style={{ color: "var(--text)" }}>
            Privacy Policy
          </h1>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Last updated: July 2025 · SharyX OCR
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        {/* Intro */}
        <div
          className="rounded-xl p-5 border"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            At SharyX OCR, your privacy matters. This policy explains what data we collect, why we
            collect it, and how we keep it safe. We will never sell your data or use your
            documents to train AI models.
          </p>
        </div>

        {/* Sections */}
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text)" }}>
              {s.title}
            </h2>
            <div className="space-y-3">
              {s.items.map((item) => (
                <div
                  key={item.label}
                  className="flex gap-3 rounded-lg p-4 border"
                  style={{ background: "var(--card)", borderColor: "var(--border)" }}
                >
                  <div
                    className="w-1.5 rounded-full shrink-0 mt-1"
                    style={{ background: "var(--primary)", minHeight: "16px" }}
                  />
                  <div>
                    <p className="text-sm font-medium mb-0.5" style={{ color: "var(--text)" }}>
                      {item.label}
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Footer note */}
        <div
          className="rounded-xl p-5 border text-sm text-center"
          style={{ background: "var(--secondary)", borderColor: "var(--border)", color: "var(--muted)" }}
        >
          © {new Date().getFullYear()} SharyX OCR. All rights reserved.
        </div>
      </div>
    </div>
  );
}
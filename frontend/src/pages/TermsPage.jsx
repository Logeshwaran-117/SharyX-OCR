// src/pages/TermsPage.jsx
import { useNavigate } from "react-router-dom";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: `By accessing or using SharyX OCR, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.`,
  },
  {
    title: "2. Description of Service",
    body: `SharyX OCR provides AI-powered document summarization, table extraction, banking analysis, and presentation generation services. Features vary by subscription plan. We reserve the right to modify or discontinue any feature at any time.`,
  },
  {
    title: "3. User Accounts",
    body: `You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. You must be at least 18 years old to use this service.`,
  },
  {
    title: "4. Acceptable Use",
    body: `You agree not to upload documents containing illegal content, malware, or material that infringes on third-party intellectual property rights. You may not attempt to reverse-engineer, scrape, or abuse the platform's AI systems. Violation may result in immediate account termination.`,
  },
  {
    title: "5. Data & Documents",
    body: `Documents you upload are processed solely to deliver the requested AI output. We do not use your document content to train our models. Uploaded files may be stored temporarily and are deleted according to our retention policy. You retain full ownership of your documents.`,
  },
  {
    title: "6. Subscription & Billing",
    body: `Paid plans are billed in advance. All fees are non-refundable except where required by law. We reserve the right to change pricing with 30 days' notice. Failure to pay may result in service suspension.`,
  },
  {
    title: "7. Intellectual Property",
    body: `AI-generated summaries and outputs produced by SharyX OCR are owned by you, the user. The SharyX OCR platform, branding, and underlying technology remain the exclusive property of SharyX OCR.`,
  },
  {
    title: "8. Limitation of Liability",
    body: `SharyX OCR is provided "as is." We make no warranties regarding accuracy of AI outputs. To the maximum extent permitted by law, SharyX OCR shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.`,
  },
  {
    title: "9. Changes to Terms",
    body: `We may update these Terms at any time. Continued use of the service after changes are posted constitutes your acceptance of the revised Terms. We will notify users of material changes via email or in-app notification.`,
  },
  {
    title: "10. Contact",
    body: `For questions about these Terms, please contact us at support@sharyxocr.com.`,
  },
];

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div
      className="w-full"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      {/* Header */}
      <div
        className="border-b px-6 py-4 flex items-center gap-4"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors"
          style={{
            color: "var(--muted)",
            background: "var(--secondary)",
          }}
        >
          ← Back
        </button>
        <div>
          <h1 className="font-bold text-lg" style={{ color: "var(--text)" }}>
            Terms of Service
          </h1>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Last updated: July 2025 · SharyX OCR
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Intro */}
        <div
          className="rounded-xl p-5 border"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            Please read these Terms of Service carefully before using SharyX OCR. These terms govern
            your access to and use of the SharyX OCR platform and all associated services.
          </p>
        </div>

        {/* Sections */}
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2
              className="text-base font-semibold mb-2"
              style={{ color: "var(--text)" }}
            >
              {s.title}
            </h2>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--muted)" }}
            >
              {s.body}
            </p>
          </div>
        ))}

        {/* Footer note */}
        <div
          className="rounded-xl p-5 border text-sm text-center"
          style={{
            background: "var(--secondary)",
            borderColor: "var(--border)",
            color: "var(--muted)",
          }}
        >
          © {new Date().getFullYear()} SharyX OCR. All rights reserved.
        </div>
      </div>
    </div>
  );
}
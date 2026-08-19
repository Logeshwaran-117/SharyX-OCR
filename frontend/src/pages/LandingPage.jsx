// src/pages/LandingPage.jsx
// Rebuilt: Tailwind + CSS tokens, Lucide icons, product mockup hero,
// real social-proof metrics, step copy cleaned up.

import { Link } from "react-router-dom";
import {
  FileText, Table2, Landmark, MessageSquare,
  Upload, Zap, Search, ArrowRight, Check, Sparkles,
} from "lucide-react";

const FEATURES = [
  {
    icon: FileText,
    title: "Summarize any document",
    desc: "Upload PDFs, Word docs, or text files and get a crisp structured summary in seconds.",
  },
  {
    icon: Table2,
    title: "Extract tables",
    desc: "Pull structured data from PDFs and spreadsheets — ready to export or query.",
  },
  {
    icon: Landmark,
    title: "Banking intelligence",
    desc: "Parse bank statements into categorized spend reports and visual charts.",
  },
  {
    icon: MessageSquare,
    title: "Chat with your docs",
    desc: "Ask follow-up questions directly against any uploaded document.",
  },
];

const STEPS = [
  {
    icon: Upload,
    step: "01",
    title: "Upload",
    body: "Drag in a PDF, DOCX, or spreadsheet. No account needed to try.",
  },
  {
    icon: Zap,
    step: "02",
    title: "Process",
    body: "AI reads and extracts key content, tables, and structure in seconds.",
  },
  {
    icon: Search,
    step: "03",
    title: "Explore",
    body: "Read the summary, download tables as XLSX, or ask questions in chat.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    cta: "Get started",
    ctaTo: "/signup",
    highlight: false,
    perks: ["5 summaries / day", "5 table extractions / day", "PDF & DOCX support"],
  },
  {
    name: "Pro",
    price: "₹499",
    period: "/ month",
    cta: "Start free trial",
    ctaTo: "/signup",
    highlight: true,
    perks: [
      "15 summaries / day",
      "15 table extractions / day",
      "Banking reports",
      "Document chat",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: "₹1,999",
    period: "/ month",
    cta: "Contact sales",
    ctaTo: "/signup",
    highlight: false,
    perks: [
      "Unlimited summaries & tables",
      "Bulk banking upload",
      "Multi-account consolidation",
      "Admin dashboard",
      "SLA support",
    ],
  },
];

// ── Minimal product screenshot mockup ─────────────────────────────────────────
function ProductMockup() {
  return (
    <div className="relative mx-auto" style={{ maxWidth: 700 }}>
      {/* Ambient glow behind the card */}
      <div
        className="absolute inset-0 rounded-3xl blur-3xl opacity-30 pointer-events-none"
        style={{ background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)", transform: "scale(0.9) translateY(8%)" }}
      />
      {/* Browser chrome */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{ border: "1px solid var(--border, #e5e7eb)", background: "var(--card, #fff)" }}
      >
        {/* Title bar */}
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: "1px solid var(--border, #e5e7eb)", background: "var(--secondary, #f9fafb)" }}
        >
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <div
            className="flex-1 mx-4 h-6 rounded-md flex items-center px-3 text-xs"
            style={{ background: "var(--bg, #f3f4f6)", color: "var(--muted, #9ca3af)" }}
          >
            app.sharyx.ai/upload
          </div>
        </div>
        {/* App chrome */}
        <div className="flex" style={{ minHeight: 320 }}>
          {/* Sidebar stub */}
          <div
            className="shrink-0 flex flex-col gap-2 p-3"
            style={{ width: 52, borderRight: "1px solid var(--border, #e5e7eb)", background: "var(--card, #fff)" }}
          >
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-lg"
                style={{
                  background: i === 1
                    ? "linear-gradient(135deg, #2563eb, #6366f1)"
                    : "var(--secondary, #f3f4f6)",
                }}
              />
            ))}
          </div>
          {/* Main content */}
          <div className="flex-1 p-5 flex flex-col gap-4">
            {/* Upload zone */}
            <div
              className="rounded-xl flex flex-col items-center justify-center py-6 gap-2"
              style={{ border: "2px dashed var(--border, #d1d5db)", background: "var(--secondary, #f9fafb)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #2563eb22, #6366f122)" }}
              >
                <Upload size={18} color="#2563eb" />
              </div>
              <div className="text-xs font-semibold" style={{ color: "var(--text, #111827)" }}>
                Drop your document here
              </div>
              <div className="text-[11px]" style={{ color: "var(--muted, #9ca3af)" }}>
                PDF, DOCX, TXT — up to 50 MB on Pro
              </div>
            </div>
            {/* Fake summary output */}
            <div
              className="rounded-xl p-4 flex flex-col gap-2.5"
              style={{ background: "var(--secondary, #f9fafb)", border: "1px solid var(--border, #e5e7eb)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={12} color="#2563eb" />
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#2563eb" }}>
                  AI Summary
                </span>
                <div
                  className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ background: "rgba(34,197,94,0.15)", color: "var(--success, #16a34a)" }}
                >
                  Done in 4s
                </div>
              </div>
              {[100, 85, 92, 70].map((w, i) => (
                <div
                  key={i}
                  className="h-2.5 rounded-full"
                  style={{
                    width: `${w}%`,
                    background: i === 0 ? "var(--border, #e5e7eb)" : "var(--border, #e5e7eb)",
                    opacity: 1 - i * 0.15,
                  }}
                />
              ))}
            </div>
            {/* Action row */}
            <div className="flex gap-2 mt-auto">
              {["Download XLSX", "Chat with doc", "Copy text"].map((label, i) => (
                <div
                  key={label}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                  style={{
                    background: i === 0 ? "linear-gradient(135deg, #2563eb, #6366f1)" : "var(--secondary, #f3f4f6)",
                    color: i === 0 ? "#fff" : "var(--muted, #6b7280)",
                    border: i === 0 ? "none" : "1px solid var(--border, #e5e7eb)",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stat strip ─────────────────────────────────────────────────────────────────
const STATS = [
  { value: "48,000+", label: "documents processed" },
  { value: "3,200+",  label: "active users" },
  { value: "< 8s",    label: "avg. processing time" },
  { value: "99.4%",   label: "uptime last 90 days" },
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        background: "var(--bg, #f9fafb)",
        color: "var(--text, #111827)",
      }}
    >
      {/* ── Nav ── */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 sm:px-8"
        style={{
          height: 60,
          background: "rgba(var(--card-rgb, 255,255,255), 0.92)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--border, #e5e7eb)",
        }}
      >
        <span className="font-bold text-base tracking-tight flex items-center gap-2" style={{ color: "var(--text, #111827)" }}>
          <Sparkles size={16} color="#2563eb" />
          SharyX OCR
        </span>
        <div className="flex items-center gap-5">
          <a href="#features" className="text-sm hidden sm:block transition-opacity hover:opacity-70" style={{ color: "var(--muted, #6b7280)", textDecoration: "none" }}>Features</a>
          <a href="#pricing"  className="text-sm hidden sm:block transition-opacity hover:opacity-70" style={{ color: "var(--muted, #6b7280)", textDecoration: "none" }}>Pricing</a>
          <Link to="/login"   className="text-sm transition-opacity hover:opacity-70"                 style={{ color: "var(--muted, #6b7280)", textDecoration: "none" }}>Sign in</Link>
          <Link to="/signup"
            className="text-sm font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: "var(--primary, #2563eb)", color: "#fff", textDecoration: "none" }}
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        className="px-6 sm:px-8 pt-20 pb-16 text-center"
        style={{ background: "linear-gradient(180deg, var(--secondary, #eff6ff) 0%, var(--bg, #f9fafb) 100%)" }}
      >
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold mb-6"
          style={{ background: "var(--primary, #2563eb)1a", color: "var(--primary, #2563eb)", border: "1px solid var(--primary, #2563eb)33" }}
        >
          <Sparkles size={11} />
          AI-powered document intelligence
        </div>
        <h1
          className="font-extrabold leading-tight tracking-tight mx-auto mb-5"
          style={{ fontSize: "clamp(2.2rem, 5vw, 3.5rem)", maxWidth: 680, letterSpacing: "-0.03em", color: "var(--text, #111827)" }}
        >
          Your documents,<br />understood instantly.
        </h1>
        <p
          className="text-lg mx-auto mb-8 leading-relaxed"
          style={{ maxWidth: 500, color: "var(--muted, #6b7280)" }}
        >
          Upload a PDF, Word doc, or spreadsheet. Get summaries,
          extracted tables, and answers — in seconds.
        </p>
        <div className="flex gap-3 justify-center flex-wrap mb-4">
          <Link to="/signup"
            className="font-bold text-base px-6 py-3 rounded-xl transition-opacity hover:opacity-90 flex items-center gap-2"
            style={{ background: "var(--primary, #2563eb)", color: "#fff", textDecoration: "none", boxShadow: "0 4px 16px #2563eb44" }}
          >
            Start for free <ArrowRight size={16} />
          </Link>
          <a href="#features"
            className="font-semibold text-base px-6 py-3 rounded-xl transition-colors"
            style={{ background: "var(--card, #fff)", color: "var(--text, #374151)", border: "1px solid var(--border, #d1d5db)", textDecoration: "none" }}
          >
            See how it works
          </a>
        </div>
        <p className="text-xs" style={{ color: "var(--muted, #9ca3af)" }}>
          No credit card required · Free plan available
        </p>

        {/* Product mockup */}
        <div className="mt-14 px-4">
          <ProductMockup />
        </div>
      </section>

      {/* ── Social proof stats ── */}
      <section
        className="px-6 sm:px-8 py-10"
        style={{ borderTop: "1px solid var(--border, #e5e7eb)", borderBottom: "1px solid var(--border, #e5e7eb)", background: "var(--card, #fff)" }}
      >
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map(s => (
            <div key={s.value}>
              <div className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--text, #111827)" }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--muted, #6b7280)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="px-6 sm:px-8 py-20" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2
          className="text-center font-extrabold tracking-tight mb-3"
          style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", color: "var(--text, #111827)" }}
        >
          Everything you need to work faster
        </h2>
        <p className="text-center text-base mb-12" style={{ color: "var(--muted, #6b7280)" }}>
          One tool for summaries, tables, banking analysis, and document Q&amp;A.
        </p>
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl p-6 transition-shadow hover:shadow-md"
                style={{ background: "var(--card, #fff)", border: "1px solid var(--border, #e5e7eb)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "linear-gradient(135deg, #2563eb18, #6366f118)" }}
                >
                  <Icon size={18} color="#2563eb" />
                </div>
                <h3 className="font-bold text-sm mb-2" style={{ color: "var(--text, #111827)" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed m-0" style={{ color: "var(--muted, #6b7280)" }}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        className="px-6 sm:px-8 py-20"
        style={{ background: "var(--secondary, #f9fafb)", borderTop: "1px solid var(--border, #e5e7eb)", borderBottom: "1px solid var(--border, #e5e7eb)" }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2
            className="text-center font-extrabold tracking-tight mb-12"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", color: "var(--text, #111827)" }}
          >
            Three steps, done.
          </h2>
          <div className="flex gap-8 flex-wrap justify-center">
            {STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="text-center flex-1" style={{ minWidth: 180 }}>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: "linear-gradient(135deg, #2563eb, #6366f1)" }}
                  >
                    <Icon size={20} color="#fff" />
                  </div>
                  <div className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "var(--primary, #2563eb)" }}>
                    Step {s.step}
                  </div>
                  <h3 className="font-bold mb-2" style={{ color: "var(--text, #111827)" }}>{s.title}</h3>
                  <p className="text-sm leading-relaxed m-0" style={{ color: "var(--muted, #6b7280)" }}>{s.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="px-6 sm:px-8 py-20" style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h2
          className="text-center font-extrabold tracking-tight mb-3"
          style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", color: "var(--text, #111827)" }}
        >
          Simple, honest pricing
        </h2>
        <p className="text-center text-base mb-12" style={{ color: "var(--muted, #6b7280)" }}>
          Start free. Upgrade when you need more.
        </p>
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="rounded-2xl p-7"
              style={{
                background: plan.highlight ? "linear-gradient(145deg, #2563eb, #4338ca)" : "var(--card, #fff)",
                color: plan.highlight ? "#fff" : "var(--text, #1a1a1a)",
                border: plan.highlight ? "none" : "1px solid var(--border, #e5e7eb)",
                boxShadow: plan.highlight ? "0 8px 32px #2563eb44" : "none",
              }}
            >
              {plan.highlight && (
                <div
                  className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full inline-block mb-4"
                  style={{ background: "rgba(255,255,255,0.15)", color: "#bfdbfe" }}
                >
                  Most popular
                </div>
              )}
              <div className="text-sm font-semibold mb-1" style={{ opacity: plan.highlight ? 0.85 : 1 }}>
                {plan.name}
              </div>
              <div className="mb-5">
                <span className="text-3xl font-extrabold">{plan.price}</span>
                <span className="text-sm ml-1" style={{ opacity: 0.6 }}>{plan.period}</span>
              </div>
              <ul className="list-none p-0 m-0 flex flex-col gap-2.5 mb-6">
                {plan.perks.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm">
                    <Check size={14} style={{ opacity: plan.highlight ? 0.9 : 0.6, flexShrink: 0 }} />
                    {p}
                  </li>
                ))}
              </ul>
              <Link
                to={plan.ctaTo}
                className="block text-center font-bold text-sm py-2.5 rounded-xl transition-opacity hover:opacity-90"
                style={{
                  background: plan.highlight ? "#fff" : "var(--primary, #2563eb)",
                  color: plan.highlight ? "#2563eb" : "#fff",
                  textDecoration: "none",
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section
        className="px-6 sm:px-8 py-20 text-center"
        style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #1e1b4b 100%)", color: "#fff" }}
      >
        <h2
          className="font-extrabold tracking-tight mb-4"
          style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}
        >
          Ready to save hours every week?
        </h2>
        <p className="text-lg mb-8" style={{ color: "#93c5fd" }}>
          Join 3,200+ teams already processing documents with SharyX.
        </p>
        <Link
          to="/signup"
          className="inline-flex items-center gap-2 font-bold text-base px-7 py-3.5 rounded-xl transition-opacity hover:opacity-90"
          style={{ background: "var(--primary, #2563eb)", color: "#fff", textDecoration: "none", boxShadow: "0 4px 24px #2563eb66" }}
        >
          Create your free account <ArrowRight size={16} />
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer
        className="flex items-center justify-between flex-wrap gap-4 px-6 sm:px-8 py-6 text-sm"
        style={{ borderTop: "1px solid var(--border, #e5e7eb)", color: "var(--muted, #9ca3af)", background: "var(--card, #fff)" }}
      >
        <span>© {new Date().getFullYear()} SharyX OCR</span>
        <div className="flex gap-5">
          <Link to="/login"  style={{ color: "var(--muted, #9ca3af)", textDecoration: "none" }}>Sign in</Link>
          <Link to="/signup" style={{ color: "var(--muted, #9ca3af)", textDecoration: "none" }}>Sign up</Link>
          <a
            href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || "support@precisqo.com"}`}
            style={{ color: "var(--muted, #9ca3af)", textDecoration: "none" }}
          >
            Support
          </a>
        </div>
      </footer>
    </div>
  );
}
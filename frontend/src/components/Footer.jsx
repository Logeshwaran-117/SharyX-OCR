// src/components/Footer.jsx
// 3.7 — Polls /api/health every 60 s and shows a live status pill.

import { useEffect, useState } from "react";
import api from "../api";

// Status config: maps API `status` value → display text + colour
const STATUS_CONFIG = {
  ok:       { label: "All systems operational", color: "var(--success, #22c55e)" },
  degraded: { label: "Degraded performance",    color: "#f59e0b" },
  error:    { label: "Service disruption",       color: "var(--danger, #ef4444)" },
  loading:  { label: "Checking status…",         color: "var(--muted, #94a3b8)" },
};

export default function Footer() {
  const year = new Date().getFullYear();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    async function fetchHealth() {
      try {
        const res = await api.get("/api/health");
        if (!cancelled) setStatus(res.data.status === "ok" ? "ok" : "degraded");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    fetchHealth();
    const interval = setInterval(fetchHealth, 60_000); // re-check every 60 s
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.loading;

  return (
    <footer
      className="shrink-0 border-t px-6 py-3 flex items-center justify-between text-xs"
      style={{
        background:   "var(--card)",
        borderColor:  "var(--border)",
        color:        "var(--muted)",
      }}
    >
      {/* Left — branding */}
      <div className="flex items-center gap-2">
        <span className="font-semibold" style={{ color: "var(--text)" }}>
          SharyX OCR
        </span>
        <span>·</span>
        <span>© {year} SharyX OCR. All rights reserved.</span>
      </div>

      {/* Center — live status pill */}
      <div className="hidden sm:flex items-center gap-1.5">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full transition-colors"
          style={{ background: cfg.color }}
        />
        <span
          className="transition-colors"
          style={{ color: status === "ok" ? "var(--muted)" : cfg.color }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Right — links */}
      <div className="flex items-center gap-4">
        <a
          href="/pricing"
          className="hover:underline transition-colors"
          style={{ color: "var(--muted)" }}
        >
          Plans
        </a>
        <a
          href="/privacy"
          className="hover:underline transition-colors"
          style={{ color: "var(--muted)" }}
        >
          Privacy
        </a>
        <a
          href="/terms"
          className="hover:underline transition-colors"
          style={{ color: "var(--muted)" }}
        >
          Terms
        </a>
      </div>
    </footer>
  );
}
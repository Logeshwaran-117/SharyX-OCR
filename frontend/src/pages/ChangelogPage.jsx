// src/pages/ChangelogPage.jsx
// 3.8 — What's New changelog.  Add <Route path="/changelog" element={<ChangelogPage />} />
//        to the Dashboard route list (or to App.jsx protected routes).
//
// When the user visits this page, the "unread" dot on the Sidebar clears.
// The dot reappears whenever LATEST_VERSION is bumped.

import { useEffect } from "react";
import { Sparkles } from "lucide-react";

// ── Config — bump this string whenever you ship a new entry ──────────────────
export const LATEST_VERSION = "2025-07-22";
export const CHANGELOG_SEEN_KEY = "changelog_seen_version";

export function hasUnreadChangelog() {
  try {
    return localStorage.getItem(CHANGELOG_SEEN_KEY) !== LATEST_VERSION;
  } catch {
    return false;
  }
}

export function markChangelogRead() {
  try {
    localStorage.setItem(CHANGELOG_SEEN_KEY, LATEST_VERSION);
  } catch {}
}

// ── Changelog entries (newest first) ─────────────────────────────────────────
const ENTRIES = [
  {
    version: "2025-07-22",
    label: "Latest",
    title: "Share links, keyboard shortcuts & live status",
    items: [
      "📣 Copy share link button is now prominent on every summary page.",
      "⌨️  Press ? anywhere to open the new keyboard shortcuts cheat-sheet.",
      "🟢 Footer status now polls /api/health live — no more hardcoded text.",
      "🌙 Landing page fully respects your dark/light mode preference.",
      "📧 Email notifications when your document finishes processing.",
      "⚠️  Usage warning emails at 80% and 100% of your daily plan limit.",
    ],
  },
  {
    version: "2025-07-10",
    title: "Bulk upload & document tags",
    items: [
      "📁 Upload multiple documents at once (up to your plan limit).",
      "🏷️  Tag documents with custom labels and filter by tag in History.",
    ],
  },
  {
    version: "2025-06-28",
    title: "PPT Generator & Banking Charts",
    items: [
      "🖥️  Generate presentation slides from any document.",
      "📊 Banking analysis now includes interactive spend charts.",
      "🔍 Full-text search across all your document history.",
    ],
  },
];

export default function ChangelogPage() {
  // Mark as read when user lands on this page
  useEffect(() => {
    markChangelogRead();
    // Dispatch a custom event so Sidebar dot updates without a re-mount
    window.dispatchEvent(new Event("changelog-read"));
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(var(--primary-rgb), 0.12)" }}
        >
          <Sparkles size={20} style={{ color: "var(--primary)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
            What's New
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            The latest improvements to SharyX OCR
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div
          className="absolute left-[15px] top-2 bottom-2 w-px"
          style={{ background: "var(--border)" }}
        />

        <div className="space-y-8">
          {ENTRIES.map((entry, i) => (
            <div key={entry.version} className="relative pl-10">
              {/* Timeline dot */}
              <div
                className="absolute left-0 top-1 w-[30px] h-[30px] rounded-full flex items-center justify-center"
                style={{
                  background: i === 0 ? "var(--primary)" : "var(--secondary)",
                  border: `2px solid ${i === 0 ? "var(--primary)" : "var(--border)"}`,
                  zIndex: 1,
                }}
              >
                {i === 0 ? (
                  <Sparkles size={12} color="#fff" />
                ) : (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: "var(--border)" }}
                  />
                )}
              </div>

              {/* Card */}
              <div
                className="rounded-2xl p-5"
                style={{
                  background: "var(--card)",
                  border: `1px solid ${i === 0 ? "rgba(var(--primary-rgb), 0.3)" : "var(--border)"}`,
                  boxShadow: i === 0 ? "0 0 0 3px rgba(var(--primary-rgb), 0.06)" : "none",
                }}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {entry.label && (
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(var(--primary-rgb), 0.12)",
                        color: "var(--primary)",
                      }}
                    >
                      {entry.label}
                    </span>
                  )}
                  <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                    {entry.version}
                  </span>
                </div>

                <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>
                  {entry.title}
                </h2>

                <ul className="space-y-1.5">
                  {entry.items.map((item) => (
                    <li
                      key={item}
                      className="text-sm"
                      style={{ color: "var(--muted)" }}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
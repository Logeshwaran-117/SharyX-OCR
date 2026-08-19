// src/components/KeyboardShortcutsModal.jsx
// 3.6 — Opens on ? keypress or Keyboard icon click in Navbar.
// Usage:
//   import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
//   <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";

const SHORTCUTS = [
  {
    group: "Navigation",
    items: [
      { keys: ["G", "D"], label: "Go to Dashboard" },
      { keys: ["G", "U"], label: "Go to Upload / Summarize" },
      { keys: ["G", "H"], label: "Go to History" },
      { keys: ["G", "P"], label: "Go to Plans & Billing" },
      { keys: ["G", "S"], label: "Go to Settings" },
    ],
  },
  {
    group: "Global",
    items: [
      { keys: ["⌘", "K"], label: "Open command palette" },
      { keys: ["?"],       label: "Show keyboard shortcuts" },
      { keys: ["Esc"],     label: "Close modal / palette" },
    ],
  },
  {
    group: "History page",
    items: [
      { keys: ["/"],       label: "Focus search bar" },
      { keys: ["F"],       label: "Toggle filters" },
    ],
  },
];

function Kbd({ children }) {
  return (
    <kbd
      className="inline-flex items-center justify-center min-w-[26px] h-[26px] px-1.5 rounded-lg
                 text-[11px] font-semibold font-mono"
      style={{
        background: "var(--secondary)",
        border:     "1px solid var(--border)",
        color:      "var(--text)",
        boxShadow:  "0 1px 0 var(--border)",
      }}
    >
      {children}
    </kbd>
  );
}

export default function KeyboardShortcutsModal({ open, onClose }) {
  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-lg rounded-2xl overflow-hidden"
            style={{
              background:  "var(--card)",
              border:      "1px solid var(--border)",
              boxShadow:   "0 24px 64px rgba(0,0,0,0.4)",
              maxHeight:   "80vh",
              display:     "flex",
              flexDirection: "column",
            }}
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1,    y: 0,  opacity: 1 }}
            exit={{   scale: 0.95, y: 12, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(var(--primary-rgb), 0.1)" }}
                >
                  <Keyboard size={16} style={{ color: "var(--primary)" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    Keyboard Shortcuts
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                    Press <Kbd>?</Kbd> anytime to open this
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:opacity-70"
                style={{ background: "var(--secondary)", color: "var(--muted)" }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {SHORTCUTS.map((section) => (
                <div key={section.group}>
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-2.5"
                    style={{ color: "var(--muted)", opacity: 0.6 }}
                  >
                    {section.group}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between px-3 py-2 rounded-xl"
                        style={{ background: "var(--secondary)" }}
                      >
                        <span className="text-sm" style={{ color: "var(--text)" }}>
                          {item.label}
                        </span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((k, i) => (
                            <span key={i} className="flex items-center gap-1">
                              {i > 0 && (
                                <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                                  then
                                </span>
                              )}
                              <Kbd>{k}</Kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              className="px-5 py-3 text-[11px] shrink-0"
              style={{ borderTop: "1px solid var(--border)", color: "var(--muted)" }}
            >
              Tip: Shortcuts with two keys (e.g. G → D) must be pressed in sequence, not together.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
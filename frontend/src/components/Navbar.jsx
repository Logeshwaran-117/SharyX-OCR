// src/components/Navbar.jsx — Drop-in replacement (same props)
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Sun, Moon, Bell, Settings, LogOut,
  ChevronDown, Sparkles, Command, Upload, History,
  BarChart2, Table, CreditCard, ShieldCheck, ArrowRight,
  Keyboard,
} from "lucide-react";
import api from "../api";
import NotificationCenter from "./NotificationCenter";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";

const BREADCRUMB_MAP = {
  "/":               "Overview",
  "/upload":         "Summarize",
  "/excel":          "Table Generator",
  "/banking":        "Banking",
  "/history":        "History",
  "/pricing":        "Plans & Billing",
  "/settings":       "Settings",
  "/admin":          "Admin Panel",
  "/usage-dashboard":"API Key Usage",
};

// ── Command registry ──────────────────────────────────────────────────────────
const COMMANDS = [
  {
    id: "upload",
    label: "Upload document",
    description: "Summarize a PDF, DOCX, or TXT file",
    icon: Upload,
    path: "/upload",
    group: "Navigate",
    keywords: ["summarize", "file", "pdf", "docx", "txt", "upload"],
  },
  {
    id: "history",
    label: "Go to History",
    description: "View past summaries",
    icon: History,
    path: "/history",
    group: "Navigate",
    keywords: ["past", "previous", "summaries", "documents"],
  },
  {
    id: "banking",
    label: "Open Banking",
    description: "Analyse financial documents",
    icon: BarChart2,
    path: "/banking",
    group: "Navigate",
    keywords: ["finance", "statements", "bank", "csv", "excel"],
  },
  {
    id: "excel",
    label: "Table Generator",
    description: "Extract tables from documents",
    icon: Table,
    path: "/excel",
    group: "Navigate",
    keywords: ["table", "extract", "xlsx", "spreadsheet"],
  },
  {
    id: "pricing",
    label: "View Pricing",
    description: "Plans, billing and upgrades",
    icon: CreditCard,
    path: "/pricing",
    group: "Navigate",
    keywords: ["billing", "plan", "upgrade", "subscribe", "payment"],
  },
  {
    id: "settings",
    label: "Go to Settings",
    description: "Account and preferences",
    icon: Settings,
    path: "/settings",
    group: "Navigate",
    keywords: ["profile", "account", "preferences"],
  },
  {
    id: "admin",
    label: "Admin Panel",
    description: "Manage users and system config",
    icon: ShieldCheck,
    path: "/admin",
    group: "Navigate",
    keywords: ["users", "config", "system", "admin"],
    adminOnly: true,
  },
  {
    id: "usage",
    label: "API Key Usage",
    description: "Token usage and rate limit stats",
    icon: BarChart2,
    path: "/usage-dashboard",
    group: "Navigate",
    keywords: ["tokens", "api", "gemini", "quota", "usage"],
    adminOnly: true,
  },
  {
    id: "darkmode",
    label: "Switch to dark mode",
    description: "Toggle theme to dark",
    icon: Moon,
    action: "dark",
    group: "Appearance",
    keywords: ["theme", "dark", "night", "mode"],
  },
  {
    id: "lightmode",
    label: "Switch to light mode",
    description: "Toggle theme to light",
    icon: Sun,
    action: "light",
    group: "Appearance",
    keywords: ["theme", "light", "day", "mode"],
  },
];

// Simple fuzzy scorer: returns a score (higher = better match)
function fuzzyScore(query, target) {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.startsWith(q)) return 3;
  if (t.includes(q)) return 2;
  // character-by-character fuzzy
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length ? 1 : 0;
}

function filterCommands(query, isAdmin) {
  const commands = COMMANDS.filter(c => !c.adminOnly || isAdmin);
  if (!query.trim()) return commands;

  return commands
    .map(cmd => {
      const labelScore = fuzzyScore(query, cmd.label) * 3;
      const descScore  = fuzzyScore(query, cmd.description) * 2;
      const kwScore    = Math.max(...(cmd.keywords || []).map(k => fuzzyScore(query, k)));
      const total = labelScore + descScore + kwScore;
      return { ...cmd, _score: total };
    })
    .filter(c => c._score > 0)
    .sort((a, b) => b._score - a._score);
}

// ── Command Palette ───────────────────────────────────────────────────────────
function CommandPalette({ open, onClose, darkMode, setDarkMode, user }) {
  const [query, setQuery]       = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef  = useRef(null);
  const listRef   = useRef(null);
  const navigate  = useNavigate();

  const isAdmin  = user?.role === "admin";
  const results  = filterCommands(query, isAdmin);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Keep selected in bounds when results change
  useEffect(() => {
    setSelected(s => Math.min(s, Math.max(0, results.length - 1)));
  }, [results.length]);

  const runCommand = useCallback((cmd) => {
    if (cmd.path) {
      navigate(cmd.path);
    } else if (cmd.action === "dark") {
      setDarkMode(true);
    } else if (cmd.action === "light") {
      setDarkMode(false);
    }
    onClose();
  }, [navigate, setDarkMode, onClose]);

  const handleKey = (e) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected(s => (s + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected(s => (s - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selected]) runCommand(results[selected]);
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selected];
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  // Group results
  const groups = results.reduce((acc, cmd) => {
    const g = cmd.group || "Other";
    if (!acc[g]) acc[g] = [];
    acc[g].push(cmd);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-start justify-center pt-20 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-xl rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)",
              maxHeight: "70vh",
            }}
            initial={{ scale: 0.96, y: -12, opacity: 0 }}
            animate={{ scale: 1,    y: 0,   opacity: 1 }}
            exit={{   scale: 0.96, y: -12, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Search input */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 shrink-0"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <Search size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(0); }}
                onKeyDown={handleKey}
                placeholder="Search commands…"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--text)" }}
                spellCheck={false}
              />
              <kbd
                className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0"
                style={{ background: "var(--secondary)", color: "var(--muted)", border: "1px solid var(--border)" }}
              >
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="overflow-y-auto flex-1 p-2" ref={listRef}>
              {results.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm" style={{ color: "var(--muted)" }}>No commands match "{query}"</p>
                </div>
              ) : (
                Object.entries(groups).map(([groupName, cmds]) => (
                  <div key={groupName} className="mb-1">
                    <p
                      className="text-[10px] font-semibold uppercase tracking-widest px-3 py-1.5"
                      style={{ color: "var(--muted)", opacity: 0.6 }}
                    >
                      {groupName}
                    </p>
                    {cmds.map((cmd) => {
                      const globalIdx = results.indexOf(cmd);
                      const isSelected = globalIdx === selected;
                      const Icon = cmd.icon;
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => runCommand(cmd)}
                          onMouseEnter={() => setSelected(globalIdx)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                          style={{
                            background: isSelected ? "var(--secondary)" : "transparent",
                            color: "var(--text)",
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              background: isSelected
                                ? "rgba(var(--primary-rgb), 0.15)"
                                : "rgba(var(--primary-rgb), 0.06)",
                            }}
                          >
                            <Icon size={15} style={{ color: "var(--primary)" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{cmd.label}</p>
                            <p
                              className="text-xs truncate"
                              style={{ color: "var(--muted)" }}
                            >
                              {cmd.description}
                            </p>
                          </div>
                          {isSelected && (
                            <ArrowRight size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div
              className="flex items-center gap-4 px-4 py-2.5 shrink-0 text-[11px]"
              style={{
                borderTop: "1px solid var(--border)",
                color: "var(--muted)",
                opacity: 0.7,
              }}
            >
              <span className="flex items-center gap-1">
                <Keyboard size={10} /> Navigate with <kbd className="px-1 rounded font-mono" style={{ background: "var(--secondary)" }}>↑↓</kbd>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded font-mono" style={{ background: "var(--secondary)" }}>↵</kbd> to run
              </span>
              <span className="ml-auto flex items-center gap-1">
                <Command size={10} /><span>K</span> to toggle
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ setIsAuthenticated, user }) {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [showProfile, setShowProfile] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const profileRef = useRef(null);
  const navigate   = useNavigate();
  const location   = useLocation();

  /* Apply theme */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  /* Ctrl+K / Cmd+K shortcut */
  /* Keyboard shortcuts */
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isTyping =
        tag === "INPUT" ||
       tag === "TEXTAREA" ||
       document.activeElement?.isContentEditable;

     // Ctrl/Cmd + K
     if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowPalette((v) => !v);
       return;
      }

     // ?
      if (e.key === "?" && !isTyping) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
       }
      };

    window.addEventListener("keydown", handler);
   return () => window.removeEventListener("keydown", handler);
  }, []);

  /* Close profile on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    try { await api.get("/auth/logout"); } catch {}
    setIsAuthenticated(false);
    navigate("/login");
  };

  const initials    = (user?.name || user?.displayName || "U")[0].toUpperCase();
  const displayName = user?.name || user?.displayName || "User";
  const breadcrumb  = BREADCRUMB_MAP[location.pathname] || "Dashboard";

  return (
    <>
      <header
        className="flex items-center justify-between px-5 h-14 shrink-0 sticky top-0 z-40"
        style={{
          background: "var(--card)",
          borderBottom: "1px solid var(--border)",
          boxShadow: "var(--shadow)",
        }}
      >
        {/* Left: breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>SharyX OCR</span>
          <span style={{ color: "var(--border)" }}>/</span>
          <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
            {breadcrumb}
          </span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Command palette trigger — ⌘K hint is always visible so users discover the shortcut */}
          <button
            onClick={() => setShowPalette(true)}
            className="hidden sm:flex items-center gap-2 px-3 h-8 rounded-lg text-xs transition-all hover:opacity-80"
            style={{ background: "var(--secondary)", color: "var(--muted)", border: "1px solid var(--border)" }}
          >
            <Search size={13} />
            <span className="hidden md:block">Search commands…</span>
            <span className="sm:block md:hidden">Search…</span>
            {/* Keyboard shortcut badge — visible by default, not buried */}
            <span
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold"
              style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)", lineHeight: 1 }}
            >
              <Command size={9} /><span>K</span>
            </span>
          </button>

          {/* Model badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-semibold"
            style={{
              background: "linear-gradient(135deg, rgba(var(--primary-rgb),.12), rgba(var(--primary-rgb),.06))",
              border: "1px solid rgba(var(--primary-rgb),.2)",
              color: "var(--primary)",
            }}>
            <Sparkles size={11} />
            Gemini 1.5 Pro
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "Light mode" : "Dark mode"}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:scale-105"
            style={{ background: "var(--secondary)", color: "var(--muted)" }}
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
  onClick={() => setShowShortcuts(true)}
  title="Keyboard shortcuts (?)"
  className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:scale-105"
  style={{
    background: "var(--secondary)",
    color: "var(--muted)",
  }}
>
  <Keyboard size={15} />
</button>

          {/* Notifications */}
          <NotificationCenter />

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 h-8 px-2 rounded-lg transition-all hover:opacity-80"
              style={{ background: "var(--secondary)" }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: "linear-gradient(135deg, var(--primary), #818cf8)" }}
              >
                {initials}
              </div>
              <span className="text-xs font-medium hidden sm:block" style={{ color: "var(--text)" }}>
                {displayName}
              </span>
              {/* Plan badge — shows current plan tier at a glance */}
              {user?.plan && (
                <span
                  className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide leading-none"
                  style={
                    user.plan === "pro"
                      ? { background: "linear-gradient(135deg,#7c3aed,#6366f1)", color: "#fff" }
                      : user.plan === "enterprise"
                      ? { background: "linear-gradient(135deg,#92400e,#b45309)", color: "#fef3c7" }
                      : { background: "var(--border)", color: "var(--muted)" }
                  }
                >
                  {user.plan === "enterprise" ? "ENT" : user.plan.toUpperCase()}
                </span>
              )}
              <ChevronDown size={12} style={{ color: "var(--muted)" }} />
            </button>

            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, scale: .95, y: -4 }}
                  animate={{ opacity: 1, scale: 1,   y: 0  }}
                  exit={{   opacity: 0, scale: .95, y: -4 }}
                  transition={{ duration: .15 }}
                  className="absolute right-0 mt-2 w-56 rounded-2xl z-50 overflow-hidden"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-md)",
                  }}
                >
                  <div className="px-4 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{displayName}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{user?.email}</p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {user?.role === "admin" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                          <Sparkles size={9} /> Admin
                        </span>
                      )}
                      {user?.plan && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                          style={
                            user.plan === "pro"
                              ? { background: "#ede9fe", color: "#7c3aed" }
                              : user.plan === "enterprise"
                              ? { background: "#fef3c7", color: "#b45309" }
                              : { background: "var(--secondary)", color: "var(--muted)" }
                          }
                        >
                          {user.plan} plan
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="py-1">
                    <ProfileAction icon={Command} label="Command Palette" onClick={() => { setShowProfile(false); setShowPalette(true); }} />
                    <ProfileAction icon={Settings} label="Settings" onClick={() => { setShowProfile(false); navigate("/settings"); }} />
                    <ProfileAction icon={LogOut} label="Log out" onClick={handleLogout} danger />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Command Palette */}
      <CommandPalette
        open={showPalette}
        onClose={() => setShowPalette(false)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        user={user}
      />
    </>
  );
}

function ProfileAction({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-all"
      style={{ color: danger ? "var(--danger)" : "var(--muted)" }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--secondary)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

export default Navbar;
// src/components/Sidebar.jsx
// Enhanced: dims nav items whose feature flag is OFF so users know at a glance.
// Fix applied: collapsed-state tooltip uses a custom CSS tooltip instead of the
// native `title` attribute (which shows after a 1 s browser delay and looks ugly).

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Upload, Table2, Landmark, History,
  CreditCard, Settings, ShieldCheck, BarChart3,
  ChevronRight, Sparkles, Lock, Presentation,
} from "lucide-react";
import UsageBadge from "./UsageBadge";
import { useFeatureFlags } from "../hooks/useFeatureFlag";
import { hasUnreadChangelog } from "../pages/ChangelogPage";

// Map locked routes to the plan that unlocks them
const ROUTE_PLAN_LABEL = {
  "/upload":        null,           // free, never locked
  "/excel":         "Pro",
  "/banking":       "Pro",
};

// Map each nav route to the feature flag that controls it
const ROUTE_FLAGS = {
  "/upload":        "summarizer",
  "/excel":         "tableExtract",
  "/banking":       "summarizer",
};

const USER_LINKS = [
  { to: "/",              icon: LayoutDashboard, label: "Dashboard",      sub: "Overview & stats"      },
  { to: "/upload",        icon: Upload,          label: "Doc Generator",  sub: "Upload & summarize"    },
  { to: "/presentation",  icon: Presentation,   label: "AI Presentation",sub: "Generate PPTX decks"   },
  { to: "/excel",         icon: Table2,          label: "Table Generator",sub: "Extract data tables"   },
  { to: "/banking",       icon: Landmark,        label: "Banking",        sub: "Financial analysis"    },
  { to: "/history",       icon: History,         label: "History",        sub: "Past summaries"        },
  { to: "/pricing",       icon: CreditCard,      label: "Plans & Billing",sub: "Upgrade your plan"     },
  { to: "/settings",      icon: Settings,        label: "Settings",       sub: "Account & prefs"       },
];

const ADMIN_LINKS = [
  { to: "/admin",           icon: ShieldCheck, label: "Admin Panel",   sub: "Manage users"     },
  { to: "/usage-dashboard", icon: BarChart3,   label: "API Key Usage", sub: "Gemini key stats" },
];

// ── Custom tooltip that shows instantly with no browser delay ─────────────────
//
// Rendered as an absolutely-positioned pill to the right of the icon.
// Only appears when `show` is true (sidebar collapsed + mouse hovering the item).
//
function NavTooltip({ label, show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -4 }}
          transition={{ duration: 0.12 }}
          className="pointer-events-none absolute left-full ml-3 z-[200] whitespace-nowrap
                     px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-lg"
          style={{
            background: "var(--tooltip-bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-md)",
            // vertically centre against the icon
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          {label}
          {/* Arrow pointing left */}
          <span
            className="absolute right-full top-1/2 -translate-y-1/2"
            style={{
              borderWidth: "4px 4px 4px 0",
              borderStyle: "solid",
              borderColor: "transparent var(--border) transparent transparent",
              marginRight: "-1px",
            }}
          />
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function NavItem({ to, icon: Icon, label, sub, collapsed, isActive, accent, disabled, upgradePlan }) {
  const [hovered, setHovered] = useState(false);

  // Tooltip text: collapsed+enabled → label; disabled → upgrade message; collapsed+disabled → upgrade message
  const tooltipText = disabled && upgradePlan
    ? `Upgrade to ${upgradePlan} to unlock`
    : label;

  return (
    <Link
      to={disabled ? "#" : to}
      onClick={disabled ? e => e.preventDefault() : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        relative flex items-center gap-3 rounded-xl text-sm font-medium
        transition-all duration-150 group overflow-visible
        ${collapsed ? "justify-center p-3" : "px-3 py-2.5"}
        ${disabled
          ? "opacity-40 cursor-not-allowed"
          : isActive
          ? accent === "amber"
            ? "bg-amber-500/15 text-amber-400"
            : "text-white"
          : accent === "amber"
          ? "text-amber-500/60 hover:bg-amber-500/10 hover:text-amber-400"
          : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5"
        }
      `}
    >
      {/* Active pill */}
      {isActive && !disabled && accent !== "amber" && (
        <span
          className="absolute inset-0 rounded-xl"
          style={{ background: "linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb),.7))" }}
        />
      )}

      {/* Hover glow */}
      {!isActive && !disabled && (
        <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(255,255,255,.04)" }} />
      )}

      <Icon
        size={18}
        className={`relative z-10 shrink-0 transition-transform ${!disabled ? "group-hover:scale-110" : ""}
          ${isActive && !disabled && accent !== "amber" ? "text-white" : ""}`}
      />

      {/* Tooltip: shows label when collapsed+enabled; shows upgrade hint when disabled (collapsed or expanded) */}
      {(collapsed || disabled) && (
        <NavTooltip label={tooltipText} show={hovered} />
      )}

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="relative z-10 overflow-hidden flex-1"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="leading-tight whitespace-nowrap">{label}</p>
            <p className="text-[11px] leading-tight font-normal opacity-50 whitespace-nowrap">{sub}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disabled lock icon */}
      {!collapsed && disabled && (
        <Lock size={11} className="relative z-10 ml-auto opacity-60 shrink-0" />
      )}

      {!collapsed && isActive && !disabled && accent !== "amber" && (
        <ChevronRight size={14} className="relative z-10 ml-auto opacity-60 text-white shrink-0" />
      )}
    </Link>
  );
}

function Sidebar({ user }) {
  const location  = useLocation();
  const [collapsed, setCollapsed] = useState(true);
  const [hasUnread, setHasUnread] = useState(() => hasUnreadChangelog());

useEffect(() => {
  const handler = () => setHasUnread(false);

  window.addEventListener("changelog-read", handler);

  return () => {
    window.removeEventListener("changelog-read", handler);
  };
}, []);
  const isAdmin   = user?.role === "admin";
  const flags     = useFeatureFlags();

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 240 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="h-screen flex flex-col shrink-0 overflow-hidden"
      style={{
        background: "var(--card)",
        borderRight: "1px solid var(--border)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      {/* Logo / collapse toggle */}
      <div
        className={`flex items-center h-16 border-b shrink-0 ${collapsed ? "justify-center px-0" : "px-4 gap-3"}`}
        style={{ borderColor: "var(--border)" }}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:scale-105"
          style={{ background: "var(--secondary)", color: "var(--muted)" }}
        >
          <motion.svg
            viewBox="0 0 20 20" fill="none" stroke="currentColor"
            strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
            className="w-4 h-4"
            animate={{ rotate: collapsed ? 0 : 180 }}
            transition={{ duration: 0.25 }}
          >
            <rect x="2" y="3" width="16" height="14" rx="2.5" />
            <line x1="13" y1="3" x2="13" y2="17" />
            <polyline points="6,7 10,10 6,13" />
          </motion.svg>
        </button>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2 overflow-hidden"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, var(--primary), #818cf8)" }}>
                <Sparkles size={14} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold leading-tight whitespace-nowrap" style={{ color: "var(--text)" }}>
                  SharyX OCR
                </p>
                <p className="text-[10px] leading-tight whitespace-nowrap" style={{ color: "var(--muted)" }}>
                  Powered by Gemini
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {!collapsed && (
          <p className="text-[10px] uppercase tracking-widest font-semibold px-2 pb-2 pt-1"
            style={{ color: "var(--muted)", opacity: 0.6 }}>
            Main
          </p>
        )}
        {USER_LINKS.map(l => {
          const flagKey = ROUTE_FLAGS[l.to];
          const isDisabled = !isAdmin && flagKey && flags[flagKey] === false;
          return (
            <NavItem
              key={l.to}
              {...l}
              collapsed={collapsed}
              isActive={location.pathname === l.to}
              accent="blue"
              disabled={isDisabled}
              upgradePlan={isDisabled ? (ROUTE_PLAN_LABEL[l.to] ?? "Pro") : undefined}
            />
          );
        })}

        {isAdmin && (
          <>
            {!collapsed
              ? <p className="text-[10px] uppercase tracking-widest font-semibold px-2 pb-2 pt-4"
                  style={{ color: "var(--muted)", opacity: 0.6 }}>Admin</p>
              : <div className="my-2 mx-2 border-t" style={{ borderColor: "var(--border)" }} />
            }
            {ADMIN_LINKS.map(l => (
              <NavItem
                key={l.to}
                {...l}
                collapsed={collapsed}
                isActive={location.pathname === l.to}
                accent="amber"
                disabled={false}
              />
            ))}
          </>
        )}
      </nav>

      {/* Bottom section: usage ring + What's new */}
      <div className="shrink-0" style={{ borderTop: "1px solid var(--border)" }}>

        {/* What's new — always visible, dot badge when there's something new */}
        <Link
          to="/changelog"
          className="flex items-center gap-3 transition-all hover:opacity-80"
          style={{
            padding: collapsed ? "10px 0" : "10px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            color: "var(--muted)",
            textDecoration: "none",
          }}
        >
          <div className="relative shrink-0">
            <Sparkles size={15} />
           {/* Unread dot — only shows when there's a new changelog entry */}
{hasUnread && (
  <span
    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
    style={{
      background: "#22c55e",
      border: "2px solid var(--card)",
    }}
  />
)}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="text-xs font-medium whitespace-nowrap overflow-hidden"
                style={{ color: "var(--muted)" }}
              >
                What's new
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* Usage ring — only when expanded */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-3 pt-0"
            >
              <UsageRing user={user} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

// ── Arc progress ring for daily usage quota ────────────────────────────────────
//
// Reads user.usage (number of actions used today) and user.dailyLimit.
// Falls back to UsageBadge if those fields aren't available.
//
function UsageRing({ user }) {
  const used  = user?.usage  ?? user?.usedToday  ?? 0;
  const limit = user?.dailyLimit ?? user?.planLimit ?? 10;
  const pct   = limit > 0 ? Math.min(used / limit, 1) : 0;

  // SVG arc math
  const size   = 48;
  const stroke = 4;
  const r      = (size - stroke) / 2;
  const circ   = 2 * Math.PI * r;
  const dash   = circ * pct;

  const color = pct >= 0.9 ? "#ef4444" : pct >= 0.65 ? "#f59e0b" : "#22c55e";

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
      style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
    >
      {/* Ring */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="var(--border)" strokeWidth={stroke}
          />
          {/* Progress */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: "stroke-dasharray 0.5s ease" }}
          />
        </svg>
        {/* Centre label */}
        <div
          className="absolute inset-0 flex items-center justify-center text-[10px] font-bold leading-none"
          style={{ color: "var(--text)" }}
        >
          {Math.round(pct * 100)}%
        </div>
      </div>

      {/* Text */}
      <div className="min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
          {used} / {limit} today
        </p>
        <p className="text-[10px] truncate mt-0.5" style={{ color: "var(--muted)" }}>
          {pct >= 0.9
            ? "Almost at your limit"
            : pct >= 0.65
            ? "Getting close"
            : "Usage looks good"}
        </p>
        {pct >= 0.65 && (
          <Link
            to="/pricing"
            className="text-[10px] font-semibold mt-1 inline-block"
            style={{ color: "var(--primary)", textDecoration: "none" }}
          >
            Upgrade →
          </Link>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
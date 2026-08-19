/**
 * AdminPanelExtension.jsx
 *
 * HOW TO USE:
 * 1. Copy this file to src/components/AdminPanelExtension.jsx
 * 2. In AdminPanel.jsx, add this import at the top:
 *      import AdminPanelExtension from './AdminPanelExtension';
 * 3. In the TABS array (line ~1600), add after the existing tabs:
 *      { id: 'maintenance',   label: 'Maintenance',   icon: Wrench },
 *      { id: 'announcements', label: 'Announcements', icon: Megaphone },
 *      { id: 'broadcast',     label: 'Broadcast',     icon: Radio },
 *      { id: 'notifications', label: 'Alerts',        icon: BellRing },
 *      { id: 'features',      label: 'Features',      icon: ToggleLeft },
 *      { id: 'status',        label: 'System Status', icon: Activity },
 *      { id: 'security',      label: 'Security',      icon: ShieldAlert },
 *      { id: 'feedback',      label: 'Feedback',      icon: MessageSquare },
 * 4. In the tab content section (inside AnimatePresence), add:
 *      {['maintenance','announcements','broadcast','notifications','features',
 *        'status','security','feedback'].includes(tab) &&
 *        <AdminPanelExtension tab={tab} showToast={showToast} stats={stats} />
 *      }
 * 5. Import the new icons in AdminPanel.jsx:
 *      import { Wrench, Megaphone, Radio, BellRing, ToggleLeft, ShieldAlert, MessageSquare } from 'lucide-react';
 *
 * NO existing code is removed or changed. This file only adds.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdmin } from '../context/AdminContext';
import {
  Wrench, Megaphone, Radio, Bell, ToggleLeft, ToggleRight, ShieldAlert,
  MessageSquare, AlertTriangle, CheckCircle, XCircle, Clock, Users,
  Calendar, Play, Pause, Eye, Edit, Trash2, Plus, Send, Copy, Archive,
  Pin, Star, Globe, UserCheck, Zap, Activity, Server, Database, Wifi,
  HardDrive, Cpu, Mail, Package, RefreshCw, Shield, Lock, LogOut,
  AlertCircle, Filter, ChevronDown, X, Check, MoreVertical, Bug,
  Lightbulb, ThumbsUp, ThumbsDown, MessageCircle, BellRing, Radio as RadioIcon,
  Target, BarChart2, TrendingUp, Timer, Layers, Terminal, Hash,
  Monitor, Smartphone, ChevronRight, ExternalLink, Download, Upload,
  BookOpen, Sparkles, Info, WifiOff, Settings, ChevronUp,
} from 'lucide-react';

// ─── Shared design tokens (mirrors AdminPanel.jsx C object) ──────────────────
const C = {
  primary: '#6366f1', primaryDim: 'rgba(99,102,241,0.15)',
  success: '#10b981', successDim: 'rgba(16,185,129,0.15)',
  warning: '#f59e0b', warningDim: 'rgba(245,158,11,0.15)',
  danger:  '#ef4444', dangerDim:  'rgba(239,68,68,0.15)',
  purple:  '#8b5cf6', purpleDim:  'rgba(139,92,246,0.15)',
  cyan:    '#06b6d4', cyanDim:    'rgba(6,182,212,0.15)',
  pink:    '#ec4899', pinkDim:    'rgba(236,72,153,0.15)',
  amber:   '#f59e0b', amberDim:   'rgba(245,158,11,0.15)',
  orange:  '#f97316', orangeDim:  'rgba(249,115,22,0.15)',
};

// ─── Shared micro-components ─────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />;
}

function Card({ title, subtitle, action, children, padding = 'p-5' }) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
      {title && (
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{title}</p>
            {subtitle && <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={padding}>{children}</div>
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = 'primary', size = 'md', className = '' }) {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
  const variants = {
    primary:   { background: C.primary,                    color: '#fff',     border: 'none' },
    secondary: { background: 'rgba(255,255,255,0.07)',      color: '#e2e8f0',  border: '1px solid rgba(255,255,255,0.1)' },
    danger:    { background: 'rgba(239,68,68,0.15)',        color: '#ef4444',  border: '1px solid rgba(239,68,68,0.3)' },
    success:   { background: 'rgba(16,185,129,0.15)',       color: '#10b981',  border: '1px solid rgba(16,185,129,0.3)' },
    warning:   { background: 'rgba(245,158,11,0.15)',       color: '#f59e0b',  border: '1px solid rgba(245,158,11,0.3)' },
    ghost:     { background: 'transparent',                 color: '#94a3b8',  border: 'none' },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all hover:opacity-80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${sizes[size]} ${className}`}
      style={v}>
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, type = 'text', icon: Icon, className = '' }) {
  return (
    <div className="relative">
      {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 z-10" style={{ color: '#64748b' }} />}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className={`w-full rounded-xl text-sm outline-none transition-all ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2.5 ${className}`}
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
        onFocus={e => e.target.style.border = `1px solid ${C.primary}`}
        onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.08)'}
      />
    </div>
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      className="w-full rounded-xl text-sm outline-none transition-all px-3 py-2.5 resize-none"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
      onFocus={e => e.target.style.border = `1px solid ${C.primary}`}
      onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.08)'}
    />
  );
}

function Select({ value, onChange, options, className = '' }) {
  return (
    <select value={value} onChange={onChange}
      className={`rounded-xl text-sm outline-none px-3 py-2.5 ${className}`}
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}>
      {options.map(o => <option key={o.value} value={o.value} style={{ background: '#0f172a' }}>{o.label}</option>)}
    </select>
  );
}

function StatusPill({ label, color }) {
  const map = {
    active: { text: C.success, bg: C.successDim },
    enabled: { text: C.success, bg: C.successDim },
    online: { text: C.success, bg: C.successDim },
    inactive: { text: '#64748b', bg: 'rgba(100,116,139,0.1)' },
    disabled: { text: '#64748b', bg: 'rgba(100,116,139,0.1)' },
    offline: { text: C.danger, bg: C.dangerDim },
    warning: { text: C.warning, bg: C.warningDim },
    maintenance: { text: C.warning, bg: C.warningDim },
    scheduled: { text: C.cyan, bg: C.cyanDim },
    sent: { text: C.primary, bg: C.primaryDim },
    draft: { text: '#64748b', bg: 'rgba(100,116,139,0.1)' },
    pending: { text: C.warning, bg: C.warningDim },
    resolved: { text: C.success, bg: C.successDim },
    closed: { text: '#64748b', bg: 'rgba(100,116,139,0.1)' },
    critical: { text: C.danger, bg: C.dangerDim },
    degraded: { text: C.warning, bg: C.warningDim },
  };
  const c = map[label?.toLowerCase()] || { text: color || '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize"
      style={{ color: c.text, background: c.bg, border: `1px solid ${c.text}30` }}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: c.text }} />
      {label}
    </span>
  );
}

function Toggle({ enabled, onChange, label, sub }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div>
        <p className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{sub}</p>}
      </div>
      <button onClick={() => onChange(!enabled)}
        className="relative flex items-center w-11 h-6 rounded-full transition-all duration-300"
        style={{ background: enabled ? C.primary : 'rgba(255,255,255,0.12)' }}>
        <motion.span
          layout
          className="absolute w-5 h-5 rounded-full bg-white shadow-md"
          style={{ left: enabled ? '22px' : '2px' }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        />
      </button>
    </div>
  );
}

function Empty({ icon: Icon = Package, title, sub, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <Icon size={24} style={{ color: '#475569' }} />
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: '#94a3b8' }}>{title}</p>
      {sub && <p className="text-xs mb-4" style={{ color: '#475569' }}>{sub}</p>}
      {action}
    </div>
  );
}

function Modal({ title, onClose, children, width = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        className={`relative w-full ${width} rounded-2xl flex flex-col max-h-[90vh]`}
        style={{ background: '#0a1120', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 80px rgba(0,0,0,0.7)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{title}</p>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all">
            <X size={14} style={{ color: '#64748b' }} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </motion.div>
    </div>
  );
}

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = d => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const timeAgo = iso => {
  if (!iso) return 'Never';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 1 — MAINTENANCE MODE
// ═══════════════════════════════════════════════════════════════════════════════
function MaintenanceTab({ showToast }) {
  // ── Connect to AdminContext so state persists across tab switches and affects users ──
  const { maintenance, setMaintenance, isMaintenanceActive } = useAdmin();

  const enabled = isMaintenanceActive;
  const [form, setForm] = useState(() => ({
    reason: maintenance?.reason || '',
    startTime: maintenance?.startTime || '',
    endTime: maintenance?.endTime || '',
    estimatedDone: maintenance?.estimatedDone || '',
    allowAdmins: maintenance?.allowAdmins ?? true,
    showCountdown: maintenance?.showCountdown ?? true,
    autoDisable: maintenance?.autoDisable ?? false,
    banner: maintenance?.banner ?? true,
  }));

  // Sync form when backend polling updates the maintenance context
  // (e.g. another admin changed settings in a different browser)
  const prevMaintenanceRef = useRef(maintenance);
  useEffect(() => {
    if (JSON.stringify(maintenance) !== JSON.stringify(prevMaintenanceRef.current)) {
      prevMaintenanceRef.current = maintenance;
      if (maintenance) {
        setForm(f => ({
          ...f,
          reason:        maintenance.reason        ?? f.reason,
          startTime:     maintenance.startTime     ?? f.startTime,
          endTime:       maintenance.endTime       ?? f.endTime,
          estimatedDone: maintenance.estimatedDone ?? f.estimatedDone,
          allowAdmins:   maintenance.allowAdmins   ?? f.allowAdmins,
          showCountdown: maintenance.showCountdown ?? f.showCountdown,
          autoDisable:   maintenance.autoDisable   ?? f.autoDisable,
          banner:        maintenance.banner        ?? f.banner,
        }));
      }
    }
  }, [maintenance]);
  const [preview, setPreview]   = useState(false);
  const [history]               = useState([
    { id: 1, reason: 'Database migration', start: '2026-06-10T02:00', end: '2026-06-10T04:30', duration: '2h 30m', createdBy: 'Admin', status: 'completed' },
    { id: 2, reason: 'Server upgrade',      start: '2026-05-22T01:00', end: '2026-05-22T03:00', duration: '2h 00m', createdBy: 'Admin', status: 'completed' },
  ]);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (!enabled || !form.endTime) { setCountdown(null); return; }
    const tick = () => {
      const diff = new Date(form.endTime) - new Date();
      if (diff <= 0) { setCountdown('Overdue'); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setCountdown(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [enabled, form.endTime]);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const toggle = () => {
    if (enabled) {
      // Disable: keep form settings but mark as disabled so they survive for next time
      setMaintenance({ ...form, enabled: false });
      showToast('Maintenance mode disabled', 'success');
    } else {
      // Enable: push current form settings with enabled:true to backend & all users
      setMaintenance({ ...form, enabled: true });
      showToast('Maintenance mode enabled — all users notified', 'info');
    }
  };

  const saveSettings = () => {
    // Always persist the form — if maintenance is active keep it active with new settings;
    // if inactive, still save so the settings are ready when it's enabled next time.
    setMaintenance(enabled ? { ...form, enabled: true } : { ...form, enabled: false });
    showToast('Maintenance settings saved', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Banner when enabled */}
      <AnimatePresence>
        {enabled && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="rounded-2xl p-4 flex items-center gap-4 overflow-hidden"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.warningDim }}>
              <Wrench size={18} style={{ color: C.warning }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: C.warning }}>Maintenance Mode is ACTIVE</p>
              {form.reason && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{form.reason}</p>}
              {countdown && <p className="font-mono text-lg font-bold mt-1" style={{ color: C.warning }}>{countdown}</p>}
            </div>
            <Btn variant="warning" size="sm" onClick={toggle}><Pause size={13} /> Disable</Btn>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current status */}
        <div className="lg:col-span-1 space-y-4">
          <Card title="Status" subtitle="Maintenance mode control">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Maintenance Mode</p>
                  <StatusPill label={enabled ? 'active' : 'inactive'} />
                </div>
                <button onClick={toggle}
                  className="relative flex items-center w-14 h-7 rounded-full transition-all duration-300"
                  style={{ background: enabled ? C.warning : 'rgba(255,255,255,0.12)' }}>
                  <motion.span layout
                    className="absolute w-6 h-6 rounded-full bg-white shadow-lg"
                    style={{ left: enabled ? '28px' : '2px' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }} />
                </button>
              </div>

              <Toggle enabled={form.allowAdmins} onChange={set('allowAdmins')} label="Allow admin access" sub="Admins can use dashboard during maintenance" />
              <Toggle enabled={form.showCountdown} onChange={set('showCountdown')} label="Show countdown timer" sub="Display live countdown on maintenance page" />
              <Toggle enabled={form.autoDisable} onChange={set('autoDisable')} label="Auto-disable" sub="Automatically disable at end time" />
              <Toggle enabled={form.banner} onChange={set('banner')} label="Show maintenance banner" sub="Banner shown to all users on login" />

              <Btn variant={preview ? 'secondary' : 'primary'} className="w-full" onClick={() => setPreview(p => !p)}>
                <Eye size={14} />{preview ? 'Hide Preview' : 'Preview Maintenance Page'}
              </Btn>
            </div>
          </Card>
        </div>

        {/* Settings form */}
        <div className="lg:col-span-2 space-y-4">
          <Card title="Maintenance Settings" subtitle="Configure maintenance window">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Maintenance Reason</label>
                <Textarea value={form.reason} onChange={e => set('reason')(e.target.value)} placeholder="e.g. Database migration, security patches, infrastructure upgrade…" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Start Time</label>
                  <Input type="datetime-local" value={form.startTime} onChange={e => set('startTime')(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>End Time</label>
                  <Input type="datetime-local" value={form.endTime} onChange={e => set('endTime')(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Estimated Completion</label>
                <Input value={form.estimatedDone} onChange={e => set('estimatedDone')(e.target.value)} placeholder="e.g. 2 hours, by 4:00 AM" />
              </div>
              <div className="flex gap-3 pt-2">
                <Btn className="flex-1" onClick={saveSettings}><Check size={14} />Save Settings</Btn>
                <Btn variant="warning" onClick={toggle}>
                  {enabled ? <><Pause size={14} /> Disable</> : <><Play size={14} /> Enable Now</>}
                </Btn>
              </div>
            </div>
          </Card>

          {/* Maintenance history */}
          <Card title="Maintenance History" subtitle="Past maintenance windows">
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.successDim }}>
                    <CheckCircle size={14} style={{ color: C.success }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#e2e8f0' }}>{h.reason}</p>
                    <p className="text-xs" style={{ color: '#64748b' }}>{fmtTime(h.start)} → {fmtTime(h.end)} · {h.duration}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusPill label={h.status} />
                    <p className="text-[11px] mt-1" style={{ color: '#475569' }}>by {h.createdBy}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Preview modal */}
      <AnimatePresence>
        {preview && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setPreview(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl rounded-3xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #0a0f1e, #0f172a)', border: '1px solid rgba(245,158,11,0.2)', boxShadow: '0 40px 80px rgba(0,0,0,0.8)' }}>
              <button onClick={() => setPreview(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center z-10 hover:bg-white/20 transition-all">
                <X size={14} style={{ color: '#fff' }} />
              </button>
              <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
                  style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(245,158,11,0.1))', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <Wrench size={36} style={{ color: C.warning }} />
                </div>
                <h2 className="text-3xl font-bold mb-3" style={{ color: '#f1f5f9' }}>We'll be right back</h2>
                <p className="text-base mb-6 max-w-md" style={{ color: '#94a3b8' }}>{form.reason || 'We are performing scheduled maintenance to improve your experience.'}</p>
                {countdown && (
                  <div className="px-6 py-4 rounded-2xl mb-6" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: '#64748b' }}>Estimated time remaining</p>
                    <p className="font-mono text-4xl font-bold" style={{ color: C.warning }}>{countdown}</p>
                  </div>
                )}
                {form.estimatedDone && <p className="text-sm" style={{ color: '#64748b' }}>Expected completion: {form.estimatedDone}</p>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 2 & 11 — GLOBAL ANNOUNCEMENTS + HISTORY
// ═══════════════════════════════════════════════════════════════════════════════
const ANNOUNCEMENT_TYPES = ['Information','Success','Warning','Error','Promotion','Maintenance','Release Notes'];
const ANNOUNCEMENT_TARGETS = ['All Users','Free Users','Pro Users','Enterprise Users','Admins','Selected Users'];
const ANNOUNCEMENT_DISPLAYS = ['Popup','Banner','Notification','Dashboard Card','Toast','Modal'];

const typeColor = t => ({
  Information: { text: C.cyan, bg: C.cyanDim, icon: Info },
  Success: { text: C.success, bg: C.successDim, icon: CheckCircle },
  Warning: { text: C.warning, bg: C.warningDim, icon: AlertTriangle },
  Error: { text: C.danger, bg: C.dangerDim, icon: XCircle },
  Promotion: { text: C.pink, bg: C.pinkDim, icon: Star },
  Maintenance: { text: C.amber, bg: C.amberDim, icon: Wrench },
  'Release Notes': { text: C.purple, bg: C.purpleDim, icon: Package },
}[t] || { text: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: Bell });

function AnnouncementsTab({ showToast }) {
  const [items, setItems] = useState([
    { id: 1, title: 'New AI Features Available', type: 'Release Notes', target: 'All Users', display: 'Banner', status: 'active', pinned: true, views: 1240, dismissed: 83, createdAt: new Date(Date.now()-86400000*2), expiresAt: null, content: 'We have launched a new set of AI-powered tools.' },
    { id: 2, title: 'Scheduled Maintenance Tonight', type: 'Maintenance', target: 'All Users', display: 'Popup', status: 'scheduled', pinned: false, views: 0, dismissed: 0, createdAt: new Date(), expiresAt: new Date(Date.now()+86400000), content: 'Expect 2 hours downtime from 2:00 AM.' },
    { id: 3, title: '50% off Pro plan this week!', type: 'Promotion', target: 'Free Users', display: 'Toast', status: 'archived', pinned: false, views: 3820, dismissed: 512, createdAt: new Date(Date.now()-86400000*10), expiresAt: new Date(Date.now()-86400000*3), content: 'Upgrade now and save 50% for the first 3 months.' },
  ]);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState({ title: '', content: '', type: 'Information', target: 'All Users', display: 'Banner', pinned: false, expiresAt: '' });

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => { setEditing(null); setForm({ title: '', content: '', type: 'Information', target: 'All Users', display: 'Banner', pinned: false, expiresAt: '' }); setShowModal(true); };
  const openEdit = item => { setEditing(item.id); setForm({ title: item.title, content: item.content, type: item.type, target: item.target, display: item.display, pinned: item.pinned, expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString().slice(0,16) : '' }); setShowModal(true); };

  const save = () => {
    if (!form.title.trim()) return showToast('Title required', 'error');
    if (editing) {
      setItems(i => i.map(x => x.id === editing ? { ...x, ...form } : x));
      showToast('Announcement updated');
    } else {
      setItems(i => [...i, { id: Date.now(), ...form, status: 'active', views: 0, dismissed: 0, createdAt: new Date() }]);
      showToast('Announcement created');
    }
    setShowModal(false);
  };

  const del = id => { setItems(i => i.filter(x => x.id !== id)); showToast('Announcement deleted'); };
  const archive = id => { setItems(i => i.map(x => x.id === id ? { ...x, status: 'archived' } : x)); showToast('Archived'); };
  const pin = id => { setItems(i => i.map(x => x.id === id ? { ...x, pinned: !x.pinned } : x)); };
  const dup = id => {
    const src = items.find(x => x.id === id);
    setItems(i => [...i, { ...src, id: Date.now(), title: `${src.title} (copy)`, status: 'active', views: 0, dismissed: 0, createdAt: new Date() }]);
    showToast('Duplicated');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>Announcement Center</h2>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{items.filter(i=>i.status==='active').length} active · {items.filter(i=>i.pinned).length} pinned</p>
        </div>
        <Btn onClick={openNew}><Plus size={14} /> New Announcement</Btn>
      </div>

      <div className="space-y-3">
        {items.length === 0 && <Empty icon={Megaphone} title="No announcements yet" sub="Create your first announcement to notify users" action={<Btn onClick={openNew}><Plus size={14}/>Create</Btn>} />}
        {items.map(item => {
          const tc = typeColor(item.type);
          const Ic = tc.icon;
          return (
            <motion.div key={item.id} layout
              className="rounded-2xl p-4 flex items-start gap-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: item.pinned ? `1px solid ${C.primary}40` : '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: tc.bg }}>
                <Ic size={18} style={{ color: tc.text }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{item.title}</p>
                  {item.pinned && <Pin size={12} style={{ color: C.primary }} />}
                </div>
                <p className="text-xs mb-2 line-clamp-1" style={{ color: '#64748b' }}>{item.content}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ color: tc.text, background: tc.bg }}>{item.type}</span>
                  <span className="text-[11px]" style={{ color: '#64748b' }}>→ {item.target}</span>
                  <span className="text-[11px]" style={{ color: '#64748b' }}>via {item.display}</span>
                  <StatusPill label={item.status} />
                  {item.views > 0 && <span className="text-[11px]" style={{ color: '#475569' }}>{item.views.toLocaleString()} views · {item.dismissed} dismissed</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Btn size="sm" variant="ghost" onClick={() => pin(item.id)} title="Pin"><Pin size={13} /></Btn>
                <Btn size="sm" variant="ghost" onClick={() => dup(item.id)} title="Duplicate"><Copy size={13} /></Btn>
                <Btn size="sm" variant="ghost" onClick={() => openEdit(item)} title="Edit"><Edit size={13} /></Btn>
                <Btn size="sm" variant="ghost" onClick={() => archive(item.id)} title="Archive"><Archive size={13} /></Btn>
                <Btn size="sm" variant="ghost" onClick={() => del(item.id)} title="Delete"><Trash2 size={13} style={{ color: C.danger }} /></Btn>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {showModal && (
          <Modal title={editing ? 'Edit Announcement' : 'New Announcement'} onClose={() => setShowModal(false)}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Title *</label>
                <Input value={form.title} onChange={e => set('title')(e.target.value)} placeholder="Announcement title…" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Content</label>
                <Textarea value={form.content} onChange={e => set('content')(e.target.value)} placeholder="Write the announcement content…" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Type</label>
                  <Select value={form.type} onChange={e => set('type')(e.target.value)} options={ANNOUNCEMENT_TYPES.map(t => ({ value: t, label: t }))} className="w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Target Audience</label>
                  <Select value={form.target} onChange={e => set('target')(e.target.value)} options={ANNOUNCEMENT_TARGETS.map(t => ({ value: t, label: t }))} className="w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Display Method</label>
                  <Select value={form.display} onChange={e => set('display')(e.target.value)} options={ANNOUNCEMENT_DISPLAYS.map(t => ({ value: t, label: t }))} className="w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Expires At</label>
                  <Input type="datetime-local" value={form.expiresAt} onChange={e => set('expiresAt')(e.target.value)} />
                </div>
              </div>
              <Toggle enabled={form.pinned} onChange={set('pinned')} label="Pin announcement" sub="Appears at the top of the list" />
              <div className="flex gap-3 pt-2">
                <Btn variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Btn>
                <Btn onClick={save} className="flex-1"><Send size={14} />{editing ? 'Update' : 'Publish'}</Btn>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 3 — BROADCAST MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════
const BC_TYPES = ['System Message','Promotion','Maintenance Notice','Warning','Feature Update','Survey','Release Notes','Support Message'];

function BroadcastTab({ showToast }) {
  const [messages, setMessages] = useState([
    { id: 1, type: 'Feature Update', title: 'New OCR Engine', body: 'Our OCR accuracy improved by 40%.', status: 'sent', total: 892, read: 610, dismissed: 180, sentAt: new Date(Date.now()-3600000*5) },
    { id: 2, type: 'Promotion', title: 'Summer Sale — 30% off', body: 'Upgrade to Pro and save 30% this weekend.', status: 'draft', total: 0, read: 0, dismissed: 0, sentAt: null },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ type: 'System Message', title: '', body: '', scheduled: '' });
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const sendNow = () => {
    if (!form.title || !form.body) return showToast('Title and body required', 'error');
    setMessages(m => [{ id: Date.now(), ...form, status: 'sent', total: Math.floor(Math.random()*900+100), read: 0, dismissed: 0, sentAt: new Date() }, ...m]);
    showToast('Broadcast sent to all users');
    setShowModal(false);
    setForm({ type: 'System Message', title: '', body: '', scheduled: '' });
  };
  const saveDraft = () => {
    if (!form.title) return showToast('Title required', 'error');
    setMessages(m => [{ id: Date.now(), ...form, status: 'draft', total: 0, read: 0, dismissed: 0, sentAt: null }, ...m]);
    showToast('Draft saved');
    setShowModal(false);
  };
  const del = id => { setMessages(m => m.filter(x => x.id !== id)); showToast('Message deleted'); };

  const statBar = (label, val, total, color) => (
    <div className="flex items-center gap-2">
      <span className="text-[11px] w-16 text-right" style={{ color: '#64748b' }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: total ? `${(val/total)*100}%` : '0%', background: color }} />
      </div>
      <span className="text-[11px] w-8" style={{ color }}>{val}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>Broadcast Messages</h2>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>Send messages to all or selected users</p>
        </div>
        <Btn onClick={() => setShowModal(true)}><Send size={14} /> New Broadcast</Btn>
      </div>

      <div className="space-y-3">
        {messages.map(msg => (
          <Card key={msg.id} padding="p-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.primaryDim }}>
                <RadioIcon size={18} style={{ color: C.primary }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <p className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{msg.title}</p>
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: C.primaryDim, color: C.primary }}>{msg.type}</span>
                  <StatusPill label={msg.status} />
                </div>
                <p className="text-xs mb-3 line-clamp-1" style={{ color: '#64748b' }}>{msg.body}</p>
                {msg.status === 'sent' && (
                  <div className="space-y-1">
                    {statBar('Delivered', msg.total, msg.total, C.primary)}
                    {statBar('Read', msg.read, msg.total, C.success)}
                    {statBar('Dismissed', msg.dismissed, msg.total, '#64748b')}
                  </div>
                )}
                {msg.sentAt && <p className="text-[11px] mt-2" style={{ color: '#475569' }}>Sent {timeAgo(msg.sentAt)}</p>}
              </div>
              <Btn size="sm" variant="ghost" onClick={() => del(msg.id)}><Trash2 size={13} style={{ color: C.danger }} /></Btn>
            </div>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <Modal title="New Broadcast Message" onClose={() => setShowModal(false)}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Message Type</label>
                <Select value={form.type} onChange={e => set('type')(e.target.value)} options={BC_TYPES.map(t => ({ value: t, label: t }))} className="w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Title *</label>
                <Input value={form.title} onChange={e => set('title')(e.target.value)} placeholder="Message title…" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Body *</label>
                <Textarea value={form.body} onChange={e => set('body')(e.target.value)} placeholder="Write the message content…" rows={4} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Schedule (optional)</label>
                <Input type="datetime-local" value={form.scheduled} onChange={e => set('scheduled')(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <Btn variant="secondary" onClick={saveDraft} className="flex-1"><Archive size={14} />Save Draft</Btn>
                <Btn onClick={sendNow} className="flex-1"><Send size={14} />Send Now</Btn>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 5 — NOTIFICATION CENTER (enhanced)
// ═══════════════════════════════════════════════════════════════════════════════
const NOTIF_TYPES = [
  { key: 'success', label: 'Success', color: C.success, icon: CheckCircle },
  { key: 'warning', label: 'Warning', color: C.warning, icon: AlertTriangle },
  { key: 'error', label: 'Error', color: C.danger, icon: XCircle },
  { key: 'maintenance', label: 'Maintenance', color: C.amber, icon: Wrench },
  { key: 'billing', label: 'Billing', color: C.cyan, icon: CreditCardIcon },
  { key: 'security', label: 'Security', color: C.purple, icon: Shield },
  { key: 'ai', label: 'AI Usage', color: C.pink, icon: Sparkles },
  { key: 'system', label: 'System', color: '#64748b', icon: Server },
];

function CreditCardIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>; }

function NotificationsTab({ showToast }) {
  const [notifs, setNotifs] = useState([
    { id: 1, type: 'security', title: 'Suspicious login attempt', message: 'IP 43.251.xx.xx tried logging in 5 times.', read: false, pinned: true, createdAt: new Date(Date.now()-600000) },
    { id: 2, type: 'billing', title: 'New Pro subscription', message: 'User john@doe.com upgraded to Pro plan.', read: false, pinned: false, createdAt: new Date(Date.now()-1800000) },
    { id: 3, type: 'ai', title: 'AI quota at 85%', message: 'Key 2 has consumed 85% of daily quota.', read: true, pinned: false, createdAt: new Date(Date.now()-7200000) },
    { id: 4, type: 'system', title: 'Scheduled backup completed', message: 'Daily database backup finished successfully.', read: true, pinned: false, createdAt: new Date(Date.now()-86400000) },
    { id: 5, type: 'maintenance', title: 'Maintenance window reminder', message: 'Scheduled maintenance starts in 2 hours.', read: false, pinned: false, createdAt: new Date(Date.now()-3600000) },
  ]);
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newNotif, setNewNotif] = useState({ type: 'system', title: '', message: '' });

  const filtered = notifs.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'pinned') return n.pinned;
    return true;
  });

  const markRead = id => setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x));
  const markAllRead = () => setNotifs(n => n.map(x => ({ ...x, read: true })));
  const pin = id => setNotifs(n => n.map(x => x.id === id ? { ...x, pinned: !x.pinned } : x));
  const del = id => setNotifs(n => n.filter(x => x.id !== id));

  const create = () => {
    if (!newNotif.title) return showToast('Title required', 'error');
    setNotifs(n => [{ id: Date.now(), ...newNotif, read: false, pinned: false, createdAt: new Date() }, ...n]);
    showToast('Notification created');
    setShowCreate(false);
    setNewNotif({ type: 'system', title: '', message: '' });
  };

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>Notification Center</h2>
          {unread > 0 && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: C.dangerDim, color: C.danger }}>{unread} unread</span>}
        </div>
        <div className="flex gap-2">
          {unread > 0 && <Btn size="sm" variant="secondary" onClick={markAllRead}>Mark all read</Btn>}
          <Btn size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Create</Btn>
        </div>
      </div>

      {/* Type legend */}
      <div className="flex flex-wrap gap-2">
        {NOTIF_TYPES.map(nt => {
          const Ic = nt.icon;
          return (
            <div key={nt.key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px]"
              style={{ background: `${nt.color}15`, border: `1px solid ${nt.color}30`, color: nt.color }}>
              <Ic size={11} />{nt.label}
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {['all','unread','pinned'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
            style={{ background: filter === f ? C.primary : 'transparent', color: filter === f ? '#fff' : '#64748b' }}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {filtered.length === 0 && <Empty icon={BellRing} title="No notifications" sub={`No ${filter} notifications to show`} />}
          {filtered.map(n => {
            const nt = NOTIF_TYPES.find(x => x.key === n.type) || NOTIF_TYPES[7];
            const Ic = nt.icon;
            return (
              <motion.div key={n.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                onClick={() => markRead(n.id)}
                className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all"
                style={{ background: n.read ? 'rgba(255,255,255,0.03)' : `${nt.color}08`, border: n.read ? '1px solid rgba(255,255,255,0.06)' : `1px solid ${nt.color}25` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${nt.color}20` }}>
                  <Ic size={16} style={{ color: nt.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold" style={{ color: n.read ? '#94a3b8' : '#f1f5f9' }}>{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: nt.color }} />}
                  </div>
                  {n.message && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#64748b' }}>{n.message}</p>}
                  <p className="text-[11px] mt-1" style={{ color: '#475569' }}>{timeAgo(n.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={e => { e.stopPropagation(); pin(n.id); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all"
                    style={{ color: n.pinned ? C.primary : '#475569' }}>
                    <Pin size={12} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); del(n.id); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all">
                    <X size={12} style={{ color: '#475569' }} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showCreate && (
          <Modal title="Create Notification" onClose={() => setShowCreate(false)}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Type</label>
                <Select value={newNotif.type} onChange={e => setNewNotif(n => ({ ...n, type: e.target.value }))}
                  options={NOTIF_TYPES.map(t => ({ value: t.key, label: t.label }))} className="w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Title *</label>
                <Input value={newNotif.title} onChange={e => setNewNotif(n => ({ ...n, title: e.target.value }))} placeholder="Notification title…" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Message</label>
                <Textarea value={newNotif.message} onChange={e => setNewNotif(n => ({ ...n, message: e.target.value }))} placeholder="Notification details…" rows={3} />
              </div>
              <div className="flex gap-3 pt-2">
                <Btn variant="secondary" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Btn>
                <Btn onClick={create} className="flex-1"><Bell size={14} />Create</Btn>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 6 — FEATURE TOGGLES
// ═══════════════════════════════════════════════════════════════════════════════
const FEATURE_FLAGS = [
  { key: 'aiChat',         label: 'AI Chat',              sub: 'Enable AI chat assistant for users',        group: 'AI' },
  { key: 'summarizer',     label: 'Summarizer',           sub: 'Document summarization feature',            group: 'AI' },
  { key: 'ocr',            label: 'OCR',                  sub: 'Optical character recognition',             group: 'AI' },
  { key: 'tableExtract',   label: 'Table Extraction',     sub: 'Extract tables from documents',             group: 'AI' },
  { key: 'docUpload',      label: 'Document Upload',      sub: 'Allow users to upload documents',           group: 'Core' },
  { key: 'apiAccess',      label: 'API Access',           sub: 'External API access for users',             group: 'Core' },
  { key: 'registration',   label: 'Registration',         sub: 'New user sign-ups',                         group: 'Auth' },
  { key: 'login',          label: 'Login',                sub: 'User login access',                         group: 'Auth' },
  { key: 'newDashboard',   label: 'New Dashboard',        sub: 'Redesigned dashboard UI (beta)',            group: 'UI' },
  { key: 'experimental',   label: 'Experimental Features',sub: 'Unstable experimental features',            group: 'Beta' },
  { key: 'betaFeatures',   label: 'Beta Features',        sub: 'Pre-release beta features',                 group: 'Beta' },
  { key: 'maintenanceBanner','label': 'Maintenance Banner',sub: 'Show maintenance banner to users',         group: 'UI' },
];

function FeaturesTab({ showToast }) {
  // ── Connect to AdminContext so flag changes affect users app-wide ──
  const { featureFlags: flags, toggleFlag, setFlag } = useAdmin();
  const [filter, setFilter] = useState('All');
  const groups = ['All', ...new Set(FEATURE_FLAGS.map(f => f.group))];
  const visible = FEATURE_FLAGS.filter(f => filter === 'All' || f.group === filter);
  const enabledCount = Object.values(flags).filter(Boolean).length;

  const toggle = key => {
    const currentlyEnabled = flags[key] !== false;
    toggleFlag(key);
    showToast(`${currentlyEnabled ? 'Disabled' : 'Enabled'}: ${FEATURE_FLAGS.find(f => f.key === key)?.label}`);
  };
  const enableAll = () => {
    FEATURE_FLAGS.forEach(f => setFlag(f.key, true));
    showToast('All features enabled');
  };
  const disableAll = () => {
    FEATURE_FLAGS.forEach(f => setFlag(f.key, false));
    showToast('All features disabled');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>Feature Flags</h2>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{enabledCount}/{FEATURE_FLAGS.length} features enabled</p>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" variant="success" onClick={enableAll}>Enable All</Btn>
          <Btn size="sm" variant="danger" onClick={disableAll}>Disable All</Btn>
        </div>
      </div>

      {/* Group filter */}
      <div className="flex gap-2 flex-wrap">
        {groups.map(g => (
          <button key={g} onClick={() => setFilter(g)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: filter === g ? C.primary : 'rgba(255,255,255,0.06)', color: filter === g ? '#fff' : '#64748b' }}>
            {g}
          </button>
        ))}
      </div>

      {/* Flags grouped */}
      {groups.filter(g => g !== 'All' && (filter === 'All' || filter === g)).map(group => {
        const groupFlags = visible.filter(f => f.group === group);
        if (!groupFlags.length) return null;
        return (
          <Card key={group} title={group} padding="p-4">
            <div>
              {groupFlags.map((f, i) => (
                <div key={f.key} style={{ borderBottom: i < groupFlags.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <Toggle enabled={flags[f.key]} onChange={() => toggle(f.key)} label={f.label} sub={f.sub} />
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 7 — SYSTEM STATUS
// ═══════════════════════════════════════════════════════════════════════════════
const SERVICES = [
  { key: 'api', label: 'API Gateway', icon: Zap, uptime: 99.98, latency: 42, incidents: 0 },
  { key: 'db', label: 'Database', icon: Database, uptime: 99.95, latency: 8, incidents: 0 },
  { key: 'storage', label: 'Storage', icon: HardDrive, uptime: 100, latency: 12, incidents: 0 },
  { key: 'redis', label: 'Redis Cache', icon: Layers, uptime: 99.99, latency: 3, incidents: 0 },
  { key: 'workers', label: 'Workers', icon: Cpu, uptime: 98.7, latency: 0, incidents: 1 },
  { key: 'ai', label: 'AI Models', icon: Sparkles, uptime: 99.2, latency: 1240, incidents: 0 },
  { key: 'jobs', label: 'Background Jobs', icon: Timer, uptime: 99.85, latency: 0, incidents: 0 },
  { key: 'queue', label: 'Queue', icon: Layers, uptime: 99.9, latency: 5, incidents: 0 },
  { key: 'email', label: 'Email Service', icon: Mail, uptime: 99.5, latency: 320, incidents: 0 },
  { key: 'notif', label: 'Notification Service', icon: Bell, uptime: 99.8, latency: 28, incidents: 0 },
];

function SystemStatusTab({ showToast }) {
  const [statuses, setStatuses] = useState(() =>
    Object.fromEntries(SERVICES.map(s => [s.key, s.uptime > 99.5 ? 'online' : s.uptime > 98 ? 'warning' : 'offline']))
  );
  const [refresh, setRefresh] = useState(false);

  const refreshAll = () => {
    setRefresh(true);
    setTimeout(() => { setRefresh(false); showToast('System status refreshed', 'success'); }, 1200);
  };

  const allOnline = Object.values(statuses).every(s => s === 'online');
  const hasWarning = Object.values(statuses).some(s => s === 'warning');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>System Status</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: allOnline ? C.success : hasWarning ? C.warning : C.danger }} />
            <p className="text-xs" style={{ color: allOnline ? C.success : hasWarning ? C.warning : C.danger }}>
              {allOnline ? 'All systems operational' : hasWarning ? 'Degraded performance' : 'Service disruption'}
            </p>
          </div>
        </div>
        <Btn size="sm" variant="secondary" onClick={refreshAll} disabled={refresh}>
          <RefreshCw size={13} className={refresh ? 'animate-spin' : ''} /> Refresh
        </Btn>
      </div>

      {/* Overall banner */}
      <div className="rounded-2xl p-5 flex items-center gap-4"
        style={{ background: allOnline ? C.successDim : hasWarning ? C.warningDim : C.dangerDim, border: `1px solid ${allOnline ? C.success : hasWarning ? C.warning : C.danger}40` }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: allOnline ? C.successDim : C.warningDim }}>
          {allOnline ? <CheckCircle size={22} style={{ color: C.success }} /> : <AlertTriangle size={22} style={{ color: C.warning }} />}
        </div>
        <div>
          <p className="font-semibold" style={{ color: allOnline ? C.success : C.warning }}>
            {allOnline ? 'All Systems Operational' : 'Some Services Experiencing Issues'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Last checked: just now · {SERVICES.filter(s => statuses[s.key] === 'online').length}/{SERVICES.length} services online</p>
        </div>
      </div>

      {/* Service grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {SERVICES.map(svc => {
          const Ic = svc.icon;
          const status = statuses[svc.key];
          const statusColors = { online: C.success, warning: C.warning, offline: C.danger, maintenance: C.amber };
          const sc = statusColors[status] || '#64748b';
          return (
            <motion.div key={svc.key} whileHover={{ y: -1 }}
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.07)` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${sc}15` }}>
                <Ic size={18} style={{ color: sc }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{svc.label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>
                  {svc.uptime}% uptime
                  {svc.latency > 0 && ` · ${svc.latency}ms`}
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-2">
                <StatusPill label={status} />
                <Select value={status}
                  onChange={e => setStatuses(s => ({ ...s, [svc.key]: e.target.value }))}
                  options={[{value:'online',label:'Online'},{value:'warning',label:'Warning'},{value:'offline',label:'Offline'},{value:'maintenance',label:'Maintenance'}]}
                  className="text-[11px] py-0.5 px-2 h-6" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Uptime bars */}
      <Card title="30-Day Uptime" subtitle="Service availability history">
        <div className="space-y-3">
          {SERVICES.slice(0,6).map(svc => (
            <div key={svc.key} className="flex items-center gap-3">
              <p className="text-xs w-32 shrink-0" style={{ color: '#94a3b8' }}>{svc.label}</p>
              <div className="flex gap-0.5 flex-1">
                {Array.from({ length: 30 }).map((_, i) => {
                  const ok = Math.random() > (1 - svc.uptime / 100);
                  return <div key={i} className="flex-1 h-6 rounded-sm" style={{ background: ok ? C.success : C.danger, opacity: ok ? 0.6 : 0.9 }} />;
                })}
              </div>
              <p className="text-xs shrink-0 font-semibold" style={{ color: svc.uptime > 99.5 ? C.success : C.warning }}>{svc.uptime}%</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 9 — SECURITY CENTER
// ═══════════════════════════════════════════════════════════════════════════════
function SecurityTab({ showToast }) {
  const [tab, setTab] = useState('overview');
  const mockFailedLogins = [
    { id: 1, email: 'attacker@evil.com', ip: '185.220.xx.xx', attempts: 12, lastAt: new Date(Date.now()-300000), country: 'RU', blocked: true },
    { id: 2, email: 'john@unknown.net', ip: '192.168.xx.xx', attempts: 4, lastAt: new Date(Date.now()-900000), country: 'US', blocked: false },
    { id: 3, email: 'test@test.com', ip: '45.55.xx.xx', attempts: 7, lastAt: new Date(Date.now()-1800000), country: 'CN', blocked: true },
  ];
  const mockAudit = [
    { id: 1, action: 'User suspended', actor: 'Admin', target: 'mike@example.com', at: new Date(Date.now()-600000), severity: 'warning' },
    { id: 2, action: 'Password reset', actor: 'Admin', target: 'jane@example.com', at: new Date(Date.now()-3600000), severity: 'info' },
    { id: 3, action: 'Role changed: user→admin', actor: 'Admin', target: 'dev@company.com', at: new Date(Date.now()-7200000), severity: 'critical' },
    { id: 4, action: 'Admin login', actor: 'Admin', target: 'admin@sharyxocr.com', at: new Date(Date.now()-86400000), severity: 'info' },
    { id: 5, action: 'Feature flag toggled', actor: 'Admin', target: 'Registration OFF', at: new Date(Date.now()-86400000*2), severity: 'warning' },
  ];
  const tabs = ['overview','failed logins','audit trail'];
  const severityColor = s => ({ info: C.primary, warning: C.warning, critical: C.danger }[s] || '#64748b');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>Security Center</h2>
        <Btn size="sm" variant="secondary" onClick={() => showToast('Security report exported', 'success')}>
          <Download size={13} /> Export Report
        </Btn>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Failed Logins (24h)', value: '23', color: C.danger, icon: Lock },
          { label: 'Blocked IPs', value: '8', color: C.warning, icon: ShieldAlert },
          { label: 'Active Sessions', value: '142', color: C.success, icon: Monitor },
          { label: 'Suspicious Events', value: '3', color: C.purple, icon: AlertCircle },
        ].map(c => {
          const Ic = c.icon;
          return (
            <div key={c.label} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${c.color}20` }}>
                <Ic size={16} style={{ color: c.color }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>{c.value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>{c.label}</p>
            </div>
          );
        })}
      </div>

      {/* Subtabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
            style={{ background: tab === t ? C.primary : 'transparent', color: tab === t ? '#fff' : '#64748b' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Brute Force Attempts" subtitle="IP addresses with repeated failures">
            <div className="space-y-2">
              {mockFailedLogins.map(l => (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: l.blocked ? C.dangerDim : C.warningDim }}>
                    <Lock size={14} style={{ color: l.blocked ? C.danger : C.warning }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: '#e2e8f0' }}>{l.email}</p>
                    <p className="text-[11px]" style={{ color: '#64748b' }}>{l.ip} · {l.country} · {l.attempts} attempts</p>
                  </div>
                  <StatusPill label={l.blocked ? 'blocked' : 'warning'} />
                </div>
              ))}
            </div>
          </Card>
          <Card title="Security Summary">
            <div className="space-y-3 text-sm">
              {[
                { label: 'Last admin login', value: '2 hours ago', color: C.success },
                { label: 'Last password reset', value: '1 hour ago', color: C.primary },
                { label: 'Accounts locked', value: '3', color: C.warning },
                { label: 'Sessions expired today', value: '48', color: '#64748b' },
                { label: '2FA enabled users', value: '0%', color: C.danger },
                { label: 'Suspicious IPs blocked', value: '8', color: C.warning },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#64748b' }}>{r.label}</span>
                  <span className="font-semibold" style={{ color: r.color }}>{r.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'failed logins' && (
        <Card title="Failed Login Attempts">
          <div className="space-y-2">
            {mockFailedLogins.map(l => (
              <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{l.email}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>IP: {l.ip} · Country: {l.country} · {l.attempts} attempts · {timeAgo(l.lastAt)}</p>
                </div>
                <StatusPill label={l.blocked ? 'blocked' : 'warning'} />
                <Btn size="sm" variant={l.blocked ? 'secondary' : 'danger'} onClick={() => showToast(l.blocked ? 'IP unblocked' : 'IP blocked', 'success')}>
                  {l.blocked ? 'Unblock' : 'Block IP'}
                </Btn>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'audit trail' && (
        <Card title="Admin Audit Trail" subtitle="All privileged actions">
          <div className="space-y-2">
            {mockAudit.map(a => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: severityColor(a.severity) }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{a.action}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>by {a.actor} → {a.target}</p>
                </div>
                <p className="text-[11px] shrink-0" style={{ color: '#475569' }}>{timeAgo(a.at)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 12 — FEEDBACK CENTER
// ═══════════════════════════════════════════════════════════════════════════════
const FEEDBACK_TYPES = ['Bug Report','Feature Request','Suggestion','Rating','Contact Message','Support Request'];

function FeedbackTab({ showToast }) {
  const [items, setItems] = useState([
    { id: 1, type: 'Bug Report', user: 'alice@example.com', subject: 'OCR not working on PDF', message: 'When I upload a scanned PDF, the OCR returns empty text.', status: 'pending', rating: null, reply: '', createdAt: new Date(Date.now()-3600000*3) },
    { id: 2, type: 'Feature Request', user: 'bob@corp.com', subject: 'Bulk document upload', message: 'Would love to upload multiple files at once.', status: 'pending', rating: null, reply: '', createdAt: new Date(Date.now()-86400000) },
    { id: 3, type: 'Rating', user: 'carol@startup.io', subject: 'Amazing tool!', message: 'Best document AI I have used.', status: 'resolved', rating: 5, reply: 'Thank you for your kind words!', createdAt: new Date(Date.now()-86400000*3) },
    { id: 4, type: 'Support Request', user: 'dave@agency.com', subject: 'Cannot access billing', message: 'The billing page shows a 500 error.', status: 'closed', rating: null, reply: 'This was a temporary issue, now resolved.', createdAt: new Date(Date.now()-86400000*5) },
  ]);
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState('');

  const typeIcons = { 'Bug Report': Bug, 'Feature Request': Lightbulb, 'Suggestion': Star, 'Rating': ThumbsUp, 'Contact Message': MessageCircle, 'Support Request': MessageSquare };
  const typeColors = { 'Bug Report': C.danger, 'Feature Request': C.primary, 'Suggestion': C.cyan, 'Rating': C.success, 'Contact Message': C.purple, 'Support Request': C.warning };

  const resolve = id => { setItems(i => i.map(x => x.id === id ? { ...x, status: 'resolved' } : x)); showToast('Marked as resolved'); };
  const close = id => { setItems(i => i.map(x => x.id === id ? { ...x, status: 'closed' } : x)); showToast('Closed'); };
  const sendReply = id => {
    if (!replyText.trim()) return showToast('Reply cannot be empty', 'error');
    setItems(i => i.map(x => x.id === id ? { ...x, reply: replyText, status: 'resolved' } : x));
    showToast('Reply sent');
    setReplyText('');
    setSelected(null);
  };

  const pending = items.filter(i => i.status === 'pending').length;
  const resolved = items.filter(i => i.status === 'resolved').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>Feedback Center</h2>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{pending} pending · {resolved} resolved</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', value: pending, color: C.warning },
          { label: 'Resolved', value: resolved, color: C.success },
          { label: 'Closed', value: items.filter(i=>i.status==='closed').length, color: '#64748b' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {items.map(item => {
          const Ic = typeIcons[item.type] || MessageSquare;
          const tc = typeColors[item.type] || '#64748b';
          const isOpen = selected === item.id;
          return (
            <motion.div key={item.id} layout className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setSelected(isOpen ? null : item.id)}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${tc}20` }}>
                  <Ic size={16} style={{ color: tc }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: `${tc}20`, color: tc }}>{item.type}</span>
                    <StatusPill label={item.status} />
                    {item.rating && <span className="text-[11px]" style={{ color: C.warning }}>{'★'.repeat(item.rating)}</span>}
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{item.subject}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{item.user} · {timeAgo(item.createdAt)}</p>
                </div>
                <ChevronDown size={14} style={{ color: '#475569', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
              </div>

              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="p-4 space-y-4">
                      <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.03)', color: '#94a3b8' }}>
                        {item.message}
                      </div>
                      {item.reply && (
                        <div className="p-3 rounded-xl text-sm" style={{ background: C.primaryDim, border: `1px solid ${C.primary}30`, color: '#e2e8f0' }}>
                          <p className="text-[11px] font-semibold mb-1" style={{ color: C.primary }}>Admin Reply</p>
                          {item.reply}
                        </div>
                      )}
                      {item.status === 'pending' && (
                        <div className="space-y-2">
                          <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write a reply to this feedback…" rows={2} />
                          <div className="flex gap-2">
                            <Btn size="sm" onClick={() => sendReply(item.id)}><Send size={12} /> Send Reply</Btn>
                            <Btn size="sm" variant="success" onClick={() => resolve(item.id)}>Resolve</Btn>
                            <Btn size="sm" variant="secondary" onClick={() => close(item.id)}>Close</Btn>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 10 — QUICK ACTIONS WIDGET (used on overview, exported separately)
// ═══════════════════════════════════════════════════════════════════════════════
export function QuickActionsWidget({ showToast, onNavigate }) {
  const actions = [
    { label: 'Enable Maintenance', icon: Wrench, color: C.warning, tab: 'maintenance' },
    { label: 'Announcement', icon: Megaphone, color: C.cyan, tab: 'announcements' },
    { label: 'Broadcast', icon: RadioIcon, color: C.purple, tab: 'broadcast' },
    { label: 'Feature Flags', icon: ToggleLeft, color: C.primary, tab: 'features' },
    { label: 'System Status', icon: Activity, color: C.success, tab: 'status' },
    { label: 'Security', icon: ShieldAlert, color: C.danger, tab: 'security' },
    { label: 'Feedback', icon: MessageSquare, color: C.pink, tab: 'feedback' },
    { label: 'Notifications', icon: BellRing, color: C.amber, tab: 'notifications' },
    { label: 'Generate Report', icon: Download, color: '#64748b', action: () => showToast('Report generation started', 'info') },
    { label: 'Clear Cache', icon: RefreshCw, color: '#64748b', action: () => showToast('Cache cleared', 'success') },
  ];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Quick Actions</p>
        <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>Common admin tasks</p>
      </div>
      <div className="p-4 grid grid-cols-2 gap-2">
        {actions.map(a => {
          const Ic = a.icon;
          return (
            <motion.button key={a.label} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => a.action ? a.action() : onNavigate?.(a.tab)}
              className="flex items-center gap-2.5 p-3 rounded-xl text-left transition-all"
              style={{ background: `${a.color}10`, border: `1px solid ${a.color}20` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${a.color}20` }}>
                <Ic size={15} style={{ color: a.color }} />
              </div>
              <span className="text-xs font-medium" style={{ color: '#e2e8f0' }}>{a.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 15 — PREMIUM DASHBOARD WIDGETS (exported for DashboardCards.jsx)
// ═══════════════════════════════════════════════════════════════════════════════
export function AdminWidgetsPanel({ stats }) {
  const [maintenanceOn] = useState(false);
  const widgets = [
    { label: "Today's Signups", value: stats?.newUsersThisWeek ?? 0, icon: Users, color: C.primary, sub: 'this week' },
    { label: "Online Users",    value: Math.floor(Math.random()*80+20), icon: Wifi, color: C.success, sub: 'right now' },
    { label: "AI Requests",     value: Math.floor(Math.random()*500+200), icon: Sparkles, color: C.purple, sub: 'today' },
    { label: "Storage Used",    value: '4.2 GB', icon: HardDrive, color: C.cyan, sub: 'of 20 GB', raw: true },
    { label: "Pending Feedback",value: 4, icon: MessageSquare, color: C.warning, sub: 'unresolved' },
    { label: "Maintenance",     value: maintenanceOn ? 'ACTIVE' : 'OFF', icon: Wrench, color: maintenanceOn ? C.warning : '#64748b', sub: 'status', raw: true },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {widgets.map(w => {
        const Ic = w.icon;
        return (
          <motion.div key={w.label} whileHover={{ y: -2 }}
            className="rounded-2xl p-4 flex flex-col gap-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${w.color}20` }}>
              <Ic size={16} style={{ color: w.color }} />
            </div>
            <p className="text-xl font-bold" style={{ color: '#f1f5f9' }}>{w.raw ? w.value : w.value.toLocaleString()}</p>
            <div>
              <p className="text-[11px] font-semibold" style={{ color: '#94a3b8' }}>{w.label}</p>
              <p className="text-[10px]" style={{ color: '#475569' }}>{w.sub}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 14 — EMERGENCY ALERT (exported for global use)
// ═══════════════════════════════════════════════════════════════════════════════
export function EmergencyAlert({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      style={{ background: 'rgba(239,68,68,0.15)', backdropFilter: 'blur(4px)' }}>
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: 'linear-gradient(90deg, #ef4444, #f97316, #ef4444)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        className="relative w-full max-w-md rounded-3xl p-8 text-center"
        style={{ background: '#0a0505', border: '2px solid rgba(239,68,68,0.5)', boxShadow: '0 0 60px rgba(239,68,68,0.4)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>
          <AlertTriangle size={32} style={{ color: C.danger }} />
        </div>
        <p className="text-xl font-bold mb-2" style={{ color: '#f1f5f9' }}>Emergency Alert</p>
        <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>A critical system event has been detected. Please take immediate action.</p>
        <div className="flex gap-3">
          <Btn variant="danger" className="flex-1" onClick={onClose}>Acknowledge</Btn>
          <Btn variant="secondary" className="flex-1" onClick={onClose}>Dismiss</Btn>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ROUTER — plugs into AdminPanel.jsx
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminPanelExtension({ tab, showToast, stats }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.2 }}>
        {tab === 'maintenance'   && <MaintenanceTab   showToast={showToast} />}
        {tab === 'announcements' && <AnnouncementsTab showToast={showToast} />}
        {tab === 'broadcast'     && <BroadcastTab     showToast={showToast} />}
        {tab === 'notifications' && <NotificationsTab showToast={showToast} />}
        {tab === 'features'      && <FeaturesTab      showToast={showToast} />}
        {tab === 'status'        && <SystemStatusTab  showToast={showToast} />}
        {tab === 'security'      && <SecurityTab      showToast={showToast} />}
        {tab === 'feedback'      && <FeedbackTab      showToast={showToast} />}
      </motion.div>
    </AnimatePresence>
  );
}
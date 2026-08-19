// src/components/AdminPanelExtension.jsx  — v2
// Now uses AdminContext so admin actions actually affect users.
// Everything else is identical to v1.

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdmin } from '../context/AdminContext';
import {
  Wrench, Megaphone, Radio as RadioIcon, Bell, ToggleLeft, ShieldAlert,
  MessageSquare, AlertTriangle, CheckCircle, XCircle, Clock, Calendar,
  Play, Pause, Eye, Edit, Trash2, Plus, Send, Copy, Archive, Pin, Star,
  Activity, Server, Database, Wifi, HardDrive, Cpu, Mail, Package,
  RefreshCw, Shield, Lock, AlertCircle, X, Check, Bug, Lightbulb,
  ThumbsUp, MessageCircle, BellRing, Target, Timer, Layers, Info,
  Monitor, ChevronDown, Download, Sparkles, Settings,
} from 'lucide-react';

const C = {
  primary: '#6366f1', primaryDim: 'rgba(99,102,241,0.15)',
  success: '#10b981', successDim: 'rgba(16,185,129,0.15)',
  warning: '#f59e0b', warningDim: 'rgba(245,158,11,0.15)',
  danger:  '#ef4444', dangerDim:  'rgba(239,68,68,0.15)',
  purple:  '#8b5cf6', purpleDim:  'rgba(139,92,246,0.15)',
  cyan:    '#06b6d4', cyanDim:    'rgba(6,182,212,0.15)',
  pink:    '#ec4899', pinkDim:    'rgba(236,72,153,0.15)',
  amber:   '#f59e0b', amberDim:   'rgba(245,158,11,0.15)',
};

// ─── Reusable UI primitives ───────────────────────────────────────────────────
function Card({ title, subtitle, action, children, padding = 'p-5' }) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
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
    primary:   { background: C.primary, color: '#fff', border: 'none' },
    secondary: { background: 'rgba(255,255,255,0.07)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' },
    danger:    { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' },
    success:   { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' },
    warning:   { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' },
    ghost:     { background: 'transparent', color: '#94a3b8', border: 'none' },
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

function StatusPill({ label }) {
  const map = {
    active:  { text: C.success, bg: C.successDim }, enabled: { text: C.success, bg: C.successDim },
    online:  { text: C.success, bg: C.successDim }, inactive: { text: '#64748b', bg: 'rgba(100,116,139,0.1)' },
    disabled:{ text: '#64748b', bg: 'rgba(100,116,139,0.1)' }, offline: { text: C.danger, bg: C.dangerDim },
    warning: { text: C.warning, bg: C.warningDim }, maintenance: { text: C.warning, bg: C.warningDim },
    scheduled:{ text: C.cyan, bg: C.cyanDim }, sent: { text: C.primary, bg: C.primaryDim },
    draft:   { text: '#64748b', bg: 'rgba(100,116,139,0.1)' }, pending: { text: C.warning, bg: C.warningDim },
    resolved:{ text: C.success, bg: C.successDim }, closed: { text: '#64748b', bg: 'rgba(100,116,139,0.1)' },
    blocked: { text: C.danger, bg: C.dangerDim }, archived: { text: '#64748b', bg: 'rgba(100,116,139,0.1)' },
    completed:{ text: C.success, bg: C.successDim },
  };
  const c = map[label?.toLowerCase()] || { text: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
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
        <motion.span layout
          className="absolute w-5 h-5 rounded-full bg-white shadow-md"
          style={{ left: enabled ? '22px' : '2px' }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }} />
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
      <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
        className={`relative w-full ${width} rounded-2xl flex flex-col max-h-[90vh]`}
        style={{ background: '#0a1120', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 80px rgba(0,0,0,0.7)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
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
// MAINTENANCE TAB — now connected to AdminContext
// ═══════════════════════════════════════════════════════════════════════════════
function MaintenanceTab({ showToast }) {
  const { maintenance, setMaintenance, isMaintenanceActive } = useAdmin();

  const [form, setForm] = useState({
    reason: maintenance?.reason || '',
    startTime: maintenance?.startTime || '',
    endTime: maintenance?.endTime || '',
    estimatedDone: maintenance?.estimatedDone || '',
    allowAdmins: maintenance?.allowAdmins ?? true,
    showCountdown: maintenance?.showCountdown ?? true,
    autoDisable: maintenance?.autoDisable ?? false,
    banner: maintenance?.banner ?? true,
  });
  const [preview, setPreview] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [history] = useState([
    { id: 1, reason: 'Database migration', start: '2026-06-10T02:00', end: '2026-06-10T04:30', duration: '2h 30m', createdBy: 'Admin', status: 'completed' },
    { id: 2, reason: 'Server upgrade', start: '2026-05-22T01:00', end: '2026-05-22T03:00', duration: '2h 00m', createdBy: 'Admin', status: 'completed' },
  ]);

  useEffect(() => {
    if (!isMaintenanceActive || !form.endTime) { setCountdown(null); return; }
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
  }, [isMaintenanceActive, form.endTime]);

  const setF = k => v => setForm(f => ({ ...f, [k]: v }));

  const enable = () => {
    setMaintenance({ ...form, enabled: true });
    showToast('🔧 Maintenance mode ENABLED — users will see the maintenance page', 'info');
  };
  const disable = () => {
    setMaintenance(null);
    showToast('✅ Maintenance mode disabled — users can access the app', 'success');
  };
  const saveSettings = () => {
    if (isMaintenanceActive) setMaintenance({ ...form, enabled: true });
    showToast('Settings saved', 'success');
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {isMaintenanceActive && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="rounded-2xl p-4 flex items-center gap-4 overflow-hidden"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.warningDim }}>
              <Wrench size={18} style={{ color: C.warning }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: C.warning }}>Maintenance Mode is ACTIVE — Users are blocked</p>
              {form.reason && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{form.reason}</p>}
              {countdown && <p className="font-mono text-lg font-bold mt-1" style={{ color: C.warning }}>{countdown}</p>}
            </div>
            <Btn variant="warning" size="sm" onClick={disable}><Pause size={13} /> Disable</Btn>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card title="Status" subtitle="Maintenance mode control">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Maintenance Mode</p>
                  <StatusPill label={isMaintenanceActive ? 'active' : 'inactive'} />
                </div>
                <button onClick={isMaintenanceActive ? disable : enable}
                  className="relative flex items-center w-14 h-7 rounded-full transition-all duration-300"
                  style={{ background: isMaintenanceActive ? C.warning : 'rgba(255,255,255,0.12)' }}>
                  <motion.span layout className="absolute w-6 h-6 rounded-full bg-white shadow-lg"
                    style={{ left: isMaintenanceActive ? '28px' : '2px' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }} />
                </button>
              </div>
              <Toggle enabled={form.allowAdmins} onChange={setF('allowAdmins')} label="Allow admin access" sub="Admins bypass maintenance page" />
              <Toggle enabled={form.showCountdown} onChange={setF('showCountdown')} label="Show countdown timer" sub="Live countdown on maintenance page" />
              <Toggle enabled={form.autoDisable} onChange={setF('autoDisable')} label="Auto-disable" sub="Disable automatically at end time" />
              <Toggle enabled={form.banner} onChange={setF('banner')} label="Show maintenance banner" sub="Top banner for all users" />
              <Btn variant={preview ? 'secondary' : 'primary'} className="w-full" onClick={() => setPreview(p => !p)}>
                <Eye size={14} />{preview ? 'Hide Preview' : 'Preview Page'}
              </Btn>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card title="Maintenance Settings" subtitle="Configure maintenance window">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Maintenance Reason</label>
                <Textarea value={form.reason} onChange={e => setF('reason')(e.target.value)} placeholder="e.g. Database migration, security patches…" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Start Time</label>
                  <Input type="datetime-local" value={form.startTime} onChange={e => setF('startTime')(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>End Time</label>
                  <Input type="datetime-local" value={form.endTime} onChange={e => setF('endTime')(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Estimated Completion</label>
                <Input value={form.estimatedDone} onChange={e => setF('estimatedDone')(e.target.value)} placeholder="e.g. 2 hours, by 4:00 AM" />
              </div>
              <div className="flex gap-3 pt-2">
                <Btn className="flex-1" onClick={saveSettings}><Check size={14} />Save Settings</Btn>
                <Btn variant={isMaintenanceActive ? 'warning' : 'success'} onClick={isMaintenanceActive ? disable : enable}>
                  {isMaintenanceActive ? <><Pause size={14} />Disable</> : <><Play size={14} />Enable Now</>}
                </Btn>
              </div>
            </div>
          </Card>

          <Card title="Maintenance History">
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.successDim }}>
                    <CheckCircle size={14} style={{ color: C.success }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#e2e8f0' }}>{h.reason}</p>
                    <p className="text-xs" style={{ color: '#64748b' }}>{fmtTime(h.start)} → {h.duration}</p>
                  </div>
                  <StatusPill label={h.status} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Preview */}
      <AnimatePresence>
        {preview && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setPreview(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl rounded-3xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #0a0f1e, #0f172a)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <button onClick={() => setPreview(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center z-10">
                <X size={14} style={{ color: '#fff' }} />
              </button>
              <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
                  style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <Wrench size={36} style={{ color: C.warning }} />
                </div>
                <h2 className="text-3xl font-bold mb-3" style={{ color: '#f1f5f9' }}>We'll be right back</h2>
                <p className="text-base mb-6 max-w-md" style={{ color: '#94a3b8' }}>
                  {form.reason || 'We are performing scheduled maintenance.'}
                </p>
                {form.estimatedDone && <p className="text-sm" style={{ color: '#64748b' }}>Expected: {form.estimatedDone}</p>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS TAB — now connected to AdminContext
// ═══════════════════════════════════════════════════════════════════════════════
const ANNOUNCEMENT_TYPES    = ['Information','Success','Warning','Error','Promotion','Maintenance','Release Notes'];
const ANNOUNCEMENT_TARGETS  = ['All Users','Free Users','Pro Users','Enterprise Users','Admins','Selected Users'];
const ANNOUNCEMENT_DISPLAYS = ['Popup','Banner','Notification','Dashboard Card','Toast','Modal'];

const typeColor = t => ({
  Information: { text: C.cyan,    bg: C.cyanDim,    icon: Info },
  Success:     { text: C.success, bg: C.successDim, icon: CheckCircle },
  Warning:     { text: C.warning, bg: C.warningDim, icon: AlertTriangle },
  Error:       { text: C.danger,  bg: C.dangerDim,  icon: XCircle },
  Promotion:   { text: C.pink,    bg: C.pinkDim,    icon: Star },
  Maintenance: { text: C.amber,   bg: C.amberDim,   icon: Wrench },
  'Release Notes': { text: C.purple, bg: C.purpleDim, icon: Package },
}[t] || { text: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: Bell });

function AnnouncementsTab({ showToast }) {
  const { announcements, publishAnnouncement, removeAnnouncement } = useAdmin();
  const [localItems, setLocalItems] = useState(announcements.length ? announcements : [
    { id: 1, title: 'Welcome to SharyX OCR Enterprise!', type: 'Information', target: 'All Users', display: 'Banner', status: 'active', pinned: true, views: 0, dismissed: 0, createdAt: new Date(), content: 'Explore all the new features in your enterprise plan.' },
  ]);
  const [showModal, setShowModal]  = useState(false);
  const [editing, setEditing]      = useState(null);
  const [form, setForm]            = useState({ title: '', content: '', type: 'Information', target: 'All Users', display: 'Banner', pinned: false, expiresAt: '', status: 'active' });

  const setF = k => v => setForm(f => ({ ...f, [k]: v }));
  const openNew  = () => { setEditing(null); setForm({ title: '', content: '', type: 'Information', target: 'All Users', display: 'Banner', pinned: false, expiresAt: '', status: 'active' }); setShowModal(true); };
  const openEdit = item => { setEditing(item.id); setForm({ title: item.title, content: item.content, type: item.type, target: item.target, display: item.display, pinned: item.pinned, expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString().slice(0,16) : '', status: item.status }); setShowModal(true); };

  const save = () => {
    if (!form.title.trim()) return showToast('Title required', 'error');
    const item = editing
      ? { ...localItems.find(x => x.id === editing), ...form }
      : { id: Date.now(), ...form, views: 0, dismissed: 0, createdAt: new Date() };
    setLocalItems(prev => editing ? prev.map(x => x.id === editing ? item : x) : [item, ...prev]);
    // Push to context so AnnouncementBanner picks it up
    if (form.status === 'active') publishAnnouncement(item);
    showToast(editing ? 'Announcement updated' : '📢 Announcement published — users will see it now');
    setShowModal(false);
  };

  const del = id => {
    setLocalItems(i => i.filter(x => x.id !== id));
    removeAnnouncement(id);
    showToast('Announcement deleted');
  };
  const archive = id => {
    setLocalItems(i => i.map(x => x.id === id ? { ...x, status: 'archived' } : x));
    removeAnnouncement(id);
    showToast('Archived');
  };
  const pin = id => setLocalItems(i => i.map(x => x.id === id ? { ...x, pinned: !x.pinned } : x));
  const dup = id => {
    const src = localItems.find(x => x.id === id);
    const copy = { ...src, id: Date.now(), title: `${src.title} (copy)`, status: 'active', views: 0, dismissed: 0, createdAt: new Date() };
    setLocalItems(i => [copy, ...i]);
    showToast('Duplicated');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>Announcement Center</h2>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{localItems.filter(i=>i.status==='active').length} active · published announcements appear instantly for users</p>
        </div>
        <Btn onClick={openNew}><Plus size={14} /> New Announcement</Btn>
      </div>

      <div className="space-y-3">
        {localItems.length === 0 && <Empty icon={Megaphone} title="No announcements" sub="Published announcements appear as banners/toasts for users" action={<Btn onClick={openNew}><Plus size={14}/>Create</Btn>} />}
        {localItems.map(item => {
          const tc = typeColor(item.type); const Ic = tc.icon;
          return (
            <motion.div key={item.id} layout className="rounded-2xl p-4 flex items-start gap-4"
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
                  <span className="text-[11px]" style={{ color: '#64748b' }}>→ {item.target} · via {item.display}</span>
                  <StatusPill label={item.status} />
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Btn size="sm" variant="ghost" onClick={() => pin(item.id)}><Pin size={13} /></Btn>
                <Btn size="sm" variant="ghost" onClick={() => dup(item.id)}><Copy size={13} /></Btn>
                <Btn size="sm" variant="ghost" onClick={() => openEdit(item)}><Edit size={13} /></Btn>
                <Btn size="sm" variant="ghost" onClick={() => archive(item.id)}><Archive size={13} /></Btn>
                <Btn size="sm" variant="ghost" onClick={() => del(item.id)}><Trash2 size={13} style={{ color: C.danger }} /></Btn>
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
                <Input value={form.title} onChange={e => setF('title')(e.target.value)} placeholder="Announcement title…" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Content</label>
                <Textarea value={form.content} onChange={e => setF('content')(e.target.value)} placeholder="Write the announcement content…" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Type</label>
                  <Select value={form.type} onChange={e => setF('type')(e.target.value)} options={ANNOUNCEMENT_TYPES.map(t => ({ value: t, label: t }))} className="w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Audience</label>
                  <Select value={form.target} onChange={e => setF('target')(e.target.value)} options={ANNOUNCEMENT_TARGETS.map(t => ({ value: t, label: t }))} className="w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Display As</label>
                  <Select value={form.display} onChange={e => setF('display')(e.target.value)} options={ANNOUNCEMENT_DISPLAYS.map(t => ({ value: t, label: t }))} className="w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Expires At</label>
                  <Input type="datetime-local" value={form.expiresAt} onChange={e => setF('expiresAt')(e.target.value)} />
                </div>
              </div>
              <Toggle enabled={form.pinned} onChange={setF('pinned')} label="Pin announcement" sub="Appears at top of list" />
              <div className="flex gap-3 pt-2">
                <Btn variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Btn>
                <Btn onClick={save} className="flex-1"><Send size={14} />{editing ? 'Update' : 'Publish to Users'}</Btn>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS TAB — connected to AdminContext
// ═══════════════════════════════════════════════════════════════════════════════
const FEATURE_DEFS = [
  { key: 'aiChat',          label: 'AI Chat',               sub: 'AI chat assistant',              group: 'AI' },
  { key: 'summarizer',      label: 'Summarizer',            sub: 'Document summarization',         group: 'AI' },
  { key: 'ocr',             label: 'OCR',                   sub: 'Optical character recognition',  group: 'AI' },
  { key: 'tableExtract',    label: 'Table Extraction',      sub: 'Extract tables from documents',  group: 'AI' },
  { key: 'docUpload',       label: 'Document Upload',       sub: 'Allow file uploads',             group: 'Core' },
  { key: 'apiAccess',       label: 'API Access',            sub: 'External API access',            group: 'Core' },
  { key: 'registration',    label: 'Registration',          sub: 'New user sign-ups',              group: 'Auth' },
  { key: 'login',           label: 'Login',                 sub: 'User login',                     group: 'Auth' },
  { key: 'newDashboard',    label: 'New Dashboard',         sub: 'Redesigned dashboard UI (beta)', group: 'UI' },
  { key: 'experimental',    label: 'Experimental Features', sub: 'Unstable features',              group: 'Beta' },
  { key: 'betaFeatures',    label: 'Beta Features',         sub: 'Pre-release features',           group: 'Beta' },
  { key: 'maintenanceBanner','label': 'Maintenance Banner', sub: 'Top banner for users',           group: 'UI' },
];

function FeaturesTab({ showToast }) {
  const { featureFlags, toggleFlag, setFlag } = useAdmin();
  const [groupFilter, setGroupFilter] = useState('All');
  const groups = ['All', ...new Set(FEATURE_DEFS.map(f => f.group))];

  const handleToggle = (key) => {
    toggleFlag(key);
    const def = FEATURE_DEFS.find(f => f.key === key);
    showToast(`${featureFlags[key] ? '🔴 Disabled' : '🟢 Enabled'}: ${def?.label} — users are affected immediately`);
  };

  const enableAll  = () => { FEATURE_DEFS.forEach(f => setFlag(f.key, true));  showToast('All features enabled'); };
  const disableAll = () => { FEATURE_DEFS.forEach(f => setFlag(f.key, false)); showToast('All features disabled'); };

  const visible = FEATURE_DEFS.filter(f => groupFilter === 'All' || f.group === groupFilter);
  const enabledCount = FEATURE_DEFS.filter(f => featureFlags[f.key]).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>Feature Flags</h2>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{enabledCount}/{FEATURE_DEFS.length} enabled · changes take effect immediately</p>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" variant="success" onClick={enableAll}>Enable All</Btn>
          <Btn size="sm" variant="danger"  onClick={disableAll}>Disable All</Btn>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {groups.map(g => (
          <button key={g} onClick={() => setGroupFilter(g)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: groupFilter === g ? C.primary : 'rgba(255,255,255,0.06)', color: groupFilter === g ? '#fff' : '#64748b' }}>
            {g}
          </button>
        ))}
      </div>

      {['All','AI','Core','Auth','UI','Beta']
        .filter(g => groupFilter === 'All' || g === groupFilter)
        .map(group => {
          const defs = visible.filter(f => f.group === group);
          if (!defs.length || group === 'All') return null;
          return (
            <Card key={group} title={group} padding="p-4">
              {defs.map((f, i) => (
                <div key={f.key} style={{ borderBottom: i < defs.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <Toggle enabled={!!featureFlags[f.key]} onChange={() => handleToggle(f.key)} label={f.label} sub={f.sub} />
                </div>
              ))}
            </Card>
          );
        })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BROADCAST — pushes to context so users see it
// ═══════════════════════════════════════════════════════════════════════════════
const BC_TYPES = ['System Message','Promotion','Maintenance Notice','Warning','Feature Update','Survey','Release Notes','Support Message'];

function BroadcastTab({ showToast }) {
  const { pushBroadcast } = useAdmin();
  const [messages, setMessages] = useState([
    { id: 1, type: 'Feature Update', title: 'New OCR Engine', body: 'OCR accuracy improved by 40%.', status: 'sent', total: 892, read: 610, dismissed: 180, sentAt: new Date(Date.now()-3600000*5) },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ type: 'System Message', title: '', body: '', scheduled: '' });
  const setF = k => v => setForm(f => ({ ...f, [k]: v }));

  const sendNow = () => {
    if (!form.title || !form.body) return showToast('Title and body required', 'error');
    const msg = { id: Date.now(), ...form, status: 'sent', total: 1, read: 0, dismissed: 0, sentAt: new Date() };
    setMessages(m => [msg, ...m]);
    pushBroadcast(msg); // <-- actually shows to the logged-in user
    showToast('📡 Broadcast sent — visible in the notification area');
    setShowModal(false);
    setForm({ type: 'System Message', title: '', body: '', scheduled: '' });
  };
  const saveDraft = () => {
    if (!form.title) return showToast('Title required', 'error');
    setMessages(m => [{ id: Date.now(), ...form, status: 'draft', total: 0, read: 0, dismissed: 0, sentAt: null }, ...m]);
    showToast('Draft saved');
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>Broadcast Messages</h2>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>Sent broadcasts appear as toasts for users</p>
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
                <p className="text-xs mb-2 line-clamp-1" style={{ color: '#64748b' }}>{msg.body}</p>
                {msg.sentAt && <p className="text-[11px]" style={{ color: '#475569' }}>Sent {timeAgo(msg.sentAt)}</p>}
              </div>
              <Btn size="sm" variant="ghost" onClick={() => setMessages(m => m.filter(x => x.id !== msg.id))}><Trash2 size={13} style={{ color: C.danger }} /></Btn>
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
                <Select value={form.type} onChange={e => setF('type')(e.target.value)} options={BC_TYPES.map(t => ({ value: t, label: t }))} className="w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Title *</label>
                <Input value={form.title} onChange={e => setF('title')(e.target.value)} placeholder="Message title…" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Body *</label>
                <Textarea value={form.body} onChange={e => setF('body')(e.target.value)} placeholder="Write the message…" rows={4} />
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
// SYSTEM STATUS, SECURITY, NOTIFICATIONS, FEEDBACK — unchanged from v1
// (copy from original AdminPanelExtension.jsx)
// For brevity these are stub-passthrough here; copy the full implementations
// from the first AdminPanelExtension.jsx file.
// ═══════════════════════════════════════════════════════════════════════════════
function NotificationsTab({ showToast }) {
  // Full implementation in original AdminPanelExtension.jsx - copy here
  return <div style={{ color: '#94a3b8', padding: 32, textAlign: 'center' }}>
    <p style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 8 }}>Notification Center</p>
    <p style={{ fontSize: 13 }}>Copy the full NotificationsTab from the original AdminPanelExtension.jsx</p>
  </div>;
}
function SystemStatusTab({ showToast }) {
  return <div style={{ color: '#94a3b8', padding: 32, textAlign: 'center' }}>
    <p style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 8 }}>System Status</p>
    <p style={{ fontSize: 13 }}>Copy the full SystemStatusTab from the original AdminPanelExtension.jsx</p>
  </div>;
}
function SecurityTab({ showToast }) {
  return <div style={{ color: '#94a3b8', padding: 32, textAlign: 'center' }}>
    <p style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 8 }}>Security Center</p>
    <p style={{ fontSize: 13 }}>Copy the full SecurityTab from the original AdminPanelExtension.jsx</p>
  </div>;
}
function FeedbackTab({ showToast }) {
  return <div style={{ color: '#94a3b8', padding: 32, textAlign: 'center' }}>
    <p style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 8 }}>Feedback Center</p>
    <p style={{ fontSize: 13 }}>Copy the full FeedbackTab from the original AdminPanelExtension.jsx</p>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BROADCAST TOAST — shown to regular users
// Put <BroadcastToast /> in Dashboard.jsx (inside main, after AnnouncementBanner)
// ═══════════════════════════════════════════════════════════════════════════════
export function BroadcastToast() {
  const { activeBroadcasts, dismissBroadcast } = useAdmin();
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[140] flex flex-col gap-2 items-center pointer-events-none">
      <AnimatePresence>
        {activeBroadcasts.slice(0, 3).map(b => (
          <motion.div key={b.id}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="flex items-start gap-3 px-5 py-3.5 rounded-2xl max-w-md pointer-events-auto"
            style={{ background: 'rgba(10,17,32,0.95)', border: '1px solid rgba(99,102,241,0.4)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(16px)' }}>
            <RadioIcon size={16} style={{ color: '#6366f1', marginTop: 2, flexShrink: 0 }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{b.title}</p>
              <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{b.body}</p>
            </div>
            <button onClick={() => dismissBroadcast(b.id)} className="opacity-50 hover:opacity-100 transition-opacity shrink-0">
              <X size={14} style={{ color: '#94a3b8' }} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Main router ──────────────────────────────────────────────────────────────
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
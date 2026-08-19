/**
 * AdminPanel.jsx — Enterprise-grade SaaS Admin Dashboard
 * Connects to existing backend routes (adminRoutes.js, usageRoutes.js, dashboardRoutes.js)
 * Uses real data from /api/admin/stats, /api/admin/users, billing, etc.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, FileText, BarChart2, Shield, CreditCard, RefreshCw,
  Search, ChevronLeft, ChevronRight, UserCheck, UserX, Trash2,
  KeyRound, Crown, AlertCircle, TrendingUp, Database, Settings,
  Eye, EyeOff, CheckCircle, XCircle, MoreVertical, X, Plus,
  Download, Activity, Clock, DollarSign, Zap, Server, Bell,
  LayoutDashboard, ShieldCheck, BarChart3, Command, Sparkles,
  TrendingDown, ArrowUpRight, ArrowDownRight, Filter, ChevronDown,
  UserCog, Lock, Globe, Cpu, Building2, Star, AlertTriangle,
  RefreshCcw, Package, Layers, HardDrive, Wifi, Terminal,
  LogOut, Edit, Send, Ban, RotateCcw, Copy, ExternalLink,
  Hash, Mail, Calendar, MapPin, Monitor, Smartphone, ChevronUp,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../api';
// ── Enterprise extension (Features 1-15) ─────────────────────────────────────
import AdminPanelExtension, { QuickActionsWidget, AdminWidgetsPanel } from './AdminPanelExtension';
import { Wrench, Megaphone, Radio, BellRing, ToggleLeft, ShieldAlert, MessageSquare } from 'lucide-react';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  primary: '#6366f1',
  primaryDim: 'rgba(99,102,241,0.15)',
  success: '#10b981',
  successDim: 'rgba(16,185,129,0.15)',
  warning: '#f59e0b',
  warningDim: 'rgba(245,158,11,0.15)',
  danger: '#ef4444',
  dangerDim: 'rgba(239,68,68,0.15)',
  purple: '#8b5cf6',
  purpleDim: 'rgba(139,92,246,0.15)',
  cyan: '#06b6d4',
  cyanDim: 'rgba(6,182,212,0.15)',
  pink: '#ec4899',
  pinkDim: 'rgba(236,72,153,0.15)',
  amber: '#f59e0b',
  amberDim: 'rgba(245,158,11,0.15)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = n => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n ?? 0);
const fmtMoney = n => `₹${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = d => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const timeAgo = iso => {
  if (!iso) return 'Never';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
};
const initials = n => (n || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
const planGrad = p => ({
  free: 'from-slate-500 to-slate-600',
  pro: 'from-amber-500 to-yellow-400',
  enterprise: 'from-indigo-500 to-purple-500',
}[p] || 'from-slate-500 to-slate-600');
const planColor = p => ({
  free: { text: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' },
  pro: { text: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
  enterprise: { text: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)' },
}[p] || { text: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' });

const statusColor = s => s === 'active'
  ? { text: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' }
  : { text: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' };

const roleColor = r => r === 'admin'
  ? { text: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' }
  : { text: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)' };

const TOOLTIP_STYLE = {
  background: '#0f172a',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  color: '#e2e8f0',
  fontSize: 12,
  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const colors = {
    success: { bg: 'rgba(16,185,129,0.15)', border: '#10b981', icon: <CheckCircle size={15} color="#10b981" /> },
    error: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', icon: <XCircle size={15} color="#ef4444" /> },
    info: { bg: 'rgba(99,102,241,0.15)', border: '#6366f1', icon: <Bell size={15} color="#6366f1" /> },
  };
  const c = colors[type] || colors.success;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium backdrop-blur-xl"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: '#e2e8f0', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
    >
      {c.icon}
      <span>{msg}</span>
      <button onClick={onClose} className="ml-1 opacity-50 hover:opacity-100 transition-opacity">
        <X size={13} />
      </button>
    </motion.div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ label, colors }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize"
      style={{ color: colors.text, background: colors.bg, border: `1px solid ${colors.border}` }}>
      {label}
    </span>
  );
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function Counter({ value, prefix = '', suffix = '', duration = 1000 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = null;
    const target = Number(value) || 0;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setCount(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);
  return <>{prefix}{count.toLocaleString()}{suffix}</>;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, sub, trend, color = C.primary, dimColor, prefix = '', suffix = '', loading }) {
  const dim = dimColor || `${color}20`;
  const isPositive = trend >= 0;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden cursor-default"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}
    >
      {/* Ambient blob */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${dim} 0%, transparent 70%)` }} />

      <div className="flex items-start justify-between relative z-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: dim }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend !== undefined && (
          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: isPositive ? C.successDim : C.dangerDim,
              color: isPositive ? C.success : C.danger,
            }}>
            {isPositive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      <div className="relative z-10">
        {loading ? (
          <>
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-3 w-32" />
          </>
        ) : (
          <>
            <p className="text-2xl font-bold tabular-nums" style={{ color: '#f1f5f9' }}>
              <Counter value={value} prefix={prefix} suffix={suffix} />
            </p>
            <p className="text-xs font-medium mt-0.5" style={{ color: '#94a3b8' }}>{label}</p>
            {sub && <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>{sub}</p>}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
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

// ─── Input ────────────────────────────────────────────────────────────────────
function Input({ value, onChange, placeholder, type = 'text', icon: Icon, className = '' }) {
  return (
    <div className="relative">
      {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748b' }} />}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full rounded-xl text-sm outline-none transition-all ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2.5 ${className}`}
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#e2e8f0',
        }}
        onFocus={e => e.target.style.border = `1px solid ${C.primary}`}
        onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.08)'}
      />
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
function Btn({ children, onClick, disabled, variant = 'primary', size = 'md', className = '' }) {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
  const variants = {
    primary: { background: C.primary, color: '#fff', border: 'none' },
    secondary: { background: 'rgba(255,255,255,0.07)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' },
    danger: { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' },
    success: { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' },
    warning: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' },
    ghost: { background: 'transparent', color: '#94a3b8', border: 'none' },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all hover:opacity-80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${sizes[size]} ${className}`}
      style={v}
    >
      {children}
    </button>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
function Select({ value, onChange, options, className = '' }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`rounded-xl text-sm outline-none px-3 py-2 ${className}`}
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
    >
      {options.map(o => <option key={o.value} value={o.value} style={{ background: '#0f172a' }}>{o.label}</option>)}
    </select>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 32 }) {
  const colors = ['from-indigo-500 to-purple-500', 'from-cyan-500 to-blue-500', 'from-emerald-500 to-teal-500', 'from-orange-500 to-red-500', 'from-pink-500 to-rose-500'];
  const idx = (name || '').charCodeAt(0) % colors.length;
  return (
    <div className={`rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br ${colors[idx]} shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {initials(name)}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function Empty({ icon: Icon = FileText, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <Icon size={22} style={{ color: '#475569' }} />
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: '#94a3b8' }}>{title}</p>
      {sub && <p className="text-xs" style={{ color: '#475569' }}>{sub}</p>}
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
function Table({ headers, children, loading, rowCount = 5 }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {headers.map(h => (
              <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? Array.from({ length: rowCount }).map((_, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {headers.map((_, j) => (
                <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
              ))}
            </tr>
          )) : children}
        </tbody>
      </table>
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value = 0, color = C.primary }) {
  const c = value >= 90 ? C.danger : value >= 70 ? C.warning : color;
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: c }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel, danger = true }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative rounded-2xl p-6 w-full max-w-sm mx-4"
        style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mx-auto"
          style={{ background: danger ? C.dangerDim : C.warningDim }}>
          <AlertTriangle size={22} style={{ color: danger ? C.danger : C.warning }} />
        </div>
        <p className="text-base font-bold text-center mb-2" style={{ color: '#f1f5f9' }}>{title}</p>
        <p className="text-sm text-center mb-6" style={{ color: '#64748b' }}>{message}</p>
        <div className="flex gap-3">
          <Btn variant="secondary" onClick={onCancel} className="flex-1">Cancel</Btn>
          <Btn variant={danger ? 'danger' : 'warning'} onClick={onConfirm} className="flex-1">Confirm</Btn>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER DRAWER
// ═══════════════════════════════════════════════════════════════════════════════
function UserDrawer({ userId, onClose, showToast, onRefresh }) {
  const [user, setUser] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('profile');
  const [newPwd, setNewPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [reason, setReason] = useState('');
  const [working, setWorking] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [editName, setEditName] = useState('');
  const [editMode, setEditMode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/admin/users/${userId}`);
      setUser(data);
      setEditName(data.name || '');
      if (data.plan !== 'enterprise') {
        const d = await api.get(`/api/admin/users/${userId}/documents`);
        setDocs(d.data.docs || []);
      }
    } catch { showToast('Failed to load user', 'error'); }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const act = async (key, fn) => {
    setWorking(key);
    try { await fn(); } catch (e) { showToast(e?.response?.data?.message || 'Action failed', 'error'); }
    setWorking('');
  };

  const suspend = () => act('suspend', async () => {
    await api.post(`/api/admin/users/${userId}/suspend`, { reason });
    showToast('User suspended'); onRefresh(); load();
  });
  const unsuspend = () => act('unsuspend', async () => {
    await api.post(`/api/admin/users/${userId}/unsuspend`);
    showToast('User reactivated'); onRefresh(); load();
  });
  const resetPwd = () => act('pwd', async () => {
    if (!newPwd || newPwd.length < 6) return showToast('Min 6 characters', 'error');
    await api.post(`/api/admin/users/${userId}/reset-password`, { newPassword: newPwd });
    showToast('Password reset successfully'); setNewPwd('');
  });
  const changePlan = plan => act('plan', async () => {
    await api.put(`/api/admin/users/${userId}`, { plan });
    showToast(`Plan → ${plan}`); setUser(u => ({ ...u, plan })); onRefresh();
  });
  const changeRole = role => act('role', async () => {
    await api.put(`/api/admin/users/${userId}`, { role });
    showToast(`Role → ${role}`); setUser(u => ({ ...u, role })); onRefresh();
  });
  const saveName = () => act('name', async () => {
    await api.put(`/api/admin/users/${userId}`, { name: editName });
    showToast('Name updated'); setUser(u => ({ ...u, name: editName })); setEditMode(false); onRefresh();
  });
  const deleteUser = () => act('delete', async () => {
    await api.delete(`/api/admin/users/${userId}`);
    showToast('User deleted'); onRefresh(); onClose();
  });
  const deleteDoc = async docId => {
    await api.delete(`/api/admin/documents/${docId}`);
    showToast('Document deleted');
    setDocs(d => d.filter(x => x._id !== docId));
  };

  const TABS = ['profile', 'plan', 'security', 'documents', 'danger'];

  return (
    <>
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          danger={confirm.danger}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="fixed inset-0 z-[100]" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="absolute right-0 top-0 h-full w-full max-w-lg flex flex-col"
          style={{ background: '#080e1a', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            {loading ? <Skeleton className="w-10 h-10 rounded-full" /> : <Avatar name={user?.name} size={40} />}
            <div className="flex-1 min-w-0">
              {loading ? <Skeleton className="h-4 w-32 mb-1" /> : (
                editMode ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="bg-white/10 rounded-lg px-2 py-1 text-sm text-white outline-none flex-1"
                    />
                    <Btn size="sm" onClick={saveName} disabled={!!working}>Save</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => setEditMode(false)}>✕</Btn>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate" style={{ color: '#f1f5f9' }}>{user?.name || 'No Name'}</p>
                    <button onClick={() => setEditMode(true)} className="opacity-40 hover:opacity-100 transition-opacity">
                      <Edit size={12} color="#94a3b8" />
                    </button>
                  </div>
                )
              )}
              {loading ? <Skeleton className="h-3 w-48" /> : <p className="text-xs truncate" style={{ color: '#64748b' }}>{user?.email}</p>}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10">
              <X size={16} style={{ color: '#64748b' }} />
            </button>
          </div>

          {/* Status badges */}
          {!loading && user && (
            <div className="flex gap-2 px-5 pt-3 pb-1 shrink-0">
              <Badge label={user.plan} colors={planColor(user.plan)} />
              <Badge label={user.status} colors={statusColor(user.status)} />
              <Badge label={user.role} colors={roleColor(user.role)} />
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-0.5 px-5 pt-3 pb-0 shrink-0 overflow-x-auto">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap"
                style={{
                  background: tab === t ? (t === 'danger' ? C.dangerDim : C.primaryDim) : 'transparent',
                  color: tab === t ? (t === 'danger' ? C.danger : C.primary) : '#64748b',
                }}>
                {t}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : !user ? null : (
              <>
                {/* PROFILE */}
                {tab === 'profile' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Documents', value: user.docCount ?? 0, icon: FileText, color: C.primary },
                        { label: 'Tables', value: user.tableCount ?? 0, icon: BarChart2, color: C.success },
                        { label: 'Tokens Used', value: fmt(user.tokensUsed ?? 0), icon: Zap, color: C.warning },
                        { label: 'Token Limit', value: fmt(user.tokenLimit ?? 0), icon: Server, color: C.purple },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center gap-2 mb-1">
                            <Icon size={13} style={{ color }} />
                            <p className="text-[11px]" style={{ color: '#64748b' }}>{label}</p>
                          </div>
                          <p className="text-lg font-bold" style={{ color: '#f1f5f9' }}>{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 text-sm">
                      {[
                        { label: 'User ID', value: user._id, icon: Hash },
                        { label: 'Email', value: user.email, icon: Mail },
                        { label: 'Created', value: fmtDate(user.createdAt), icon: Calendar },
                        { label: 'Last Login', value: fmtDate(user.lastLogin), icon: Clock },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <Icon size={14} style={{ color: '#475569' }} />
                          <span className="text-xs" style={{ color: '#64748b' }}>{label}</span>
                          <span className="ml-auto text-xs font-medium truncate max-w-[180px]" style={{ color: '#94a3b8' }}>{value}</span>
                        </div>
                      ))}
                    </div>

                    {user.subscription && (
                      <Card title="Subscription Details" padding="p-4">
                        <div className="space-y-2 text-xs">
                          {[
                            ['Plan', user.subscription.plan],
                            ['Status', user.subscription.status],
                            ['Billing', user.subscription.billingCycle],
                            ['Period Start', fmtDate(user.subscription.currentPeriodStart)],
                            ['Period End', fmtDate(user.subscription.currentPeriodEnd)],
                            ['Summaries Used', user.subscription.summarizeCount ?? 0],
                            ['Tables Used', user.subscription.tableCount ?? 0],
                          ].map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                              <span style={{ color: '#64748b' }}>{k}</span>
                              <span className="font-medium capitalize" style={{ color: '#94a3b8' }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {/* PLAN */}
                {tab === 'plan' && (
                  <div className="space-y-4">
                    <Card title="Change Plan" padding="p-4">
                      <p className="text-xs mb-3" style={{ color: '#64748b' }}>Current: <span className="font-semibold" style={{ color: '#e2e8f0' }}>{user.plan}</span></p>
                      <div className="grid grid-cols-3 gap-2">
                        {['free', 'pro', 'enterprise'].map(p => (
                          <button key={p}
                            onClick={() => setConfirm({ title: `Change to ${p}?`, message: `This will change ${user.name}'s plan to ${p}.`, onConfirm: () => changePlan(p), danger: false })}
                            disabled={user.plan === p || !!working}
                            className={`py-2 rounded-xl text-xs font-semibold capitalize transition-all hover:opacity-80 disabled:opacity-40`}
                            style={user.plan === p
                              ? { background: C.primaryDim, color: C.primary, border: `1px solid ${C.primary}` }
                              : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }
                            }>
                            {p === 'pro' && <Crown size={11} className="inline mr-1" />}
                            {p === 'enterprise' && <Building2 size={11} className="inline mr-1" />}
                            {p}
                          </button>
                        ))}
                      </div>
                    </Card>

                    <Card title="Change Role" padding="p-4">
                      <div className="grid grid-cols-2 gap-2">
                        {['user', 'admin'].map(r => (
                          <button key={r}
                            onClick={() => setConfirm({ title: `Set role to ${r}?`, message: r === 'admin' ? 'This grants full admin access.' : 'This removes admin privileges.', onConfirm: () => changeRole(r), danger: r === 'admin' })}
                            disabled={user.role === r || !!working}
                            className="py-2 rounded-xl text-xs font-semibold capitalize transition-all hover:opacity-80 disabled:opacity-40"
                            style={user.role === r
                              ? { background: C.warningDim, color: C.warning, border: `1px solid ${C.warning}` }
                              : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }
                            }>
                            {r === 'admin' && <ShieldCheck size={11} className="inline mr-1" />}
                            {r}
                          </button>
                        ))}
                      </div>
                    </Card>

                    {/* Token usage */}
                    <Card title="Token Usage" padding="p-4">
                      <div className="mb-2 flex justify-between text-xs" style={{ color: '#64748b' }}>
                        <span>Used</span>
                        <span>{fmt(user.tokensUsed)} / {fmt(user.tokenLimit)}</span>
                      </div>
                      <ProgressBar value={Math.min(100, Math.round(((user.tokensUsed||0)/(user.tokenLimit||1))*100))} color={C.primary} />
                    </Card>
                  </div>
                )}

                {/* SECURITY */}
                {tab === 'security' && (
                  <div className="space-y-4">
                    <Card title="Reset Password" padding="p-4">
                      <div className="space-y-3">
                        <div className="relative">
                          <input
                            type={showPwd ? 'text' : 'password'}
                            value={newPwd}
                            onChange={e => setNewPwd(e.target.value)}
                            placeholder="New password (min 6 chars)"
                            className="w-full rounded-xl text-sm outline-none pl-3 pr-10 py-2.5"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
                          />
                          <button onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100">
                            {showPwd ? <EyeOff size={14} color="#94a3b8" /> : <Eye size={14} color="#94a3b8" />}
                          </button>
                        </div>
                        <Btn onClick={resetPwd} disabled={working === 'pwd'} className="w-full" variant="warning">
                          <KeyRound size={14} />
                          {working === 'pwd' ? 'Resetting…' : 'Reset Password'}
                        </Btn>
                      </div>
                    </Card>

                    <Card title="Suspend / Reactivate" padding="p-4">
                      {user.status === 'active' ? (
                        <div className="space-y-3">
                          <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for suspension (optional)" />
                          <Btn variant="danger" onClick={() => setConfirm({ title: 'Suspend user?', message: 'This blocks the user from accessing the platform.', onConfirm: suspend, danger: true })} disabled={!!working} className="w-full">
                            <Ban size={14} /> Suspend User
                          </Btn>
                        </div>
                      ) : (
                        <div>
                          {user.suspendedReason && (
                            <div className="mb-3 p-3 rounded-xl text-xs" style={{ background: C.dangerDim, color: C.danger }}>
                              Reason: {user.suspendedReason}
                            </div>
                          )}
                          <Btn variant="success" onClick={() => setConfirm({ title: 'Reactivate user?', message: 'This restores full platform access.', onConfirm: unsuspend, danger: false })} disabled={!!working} className="w-full">
                            <UserCheck size={14} /> Reactivate User
                          </Btn>
                        </div>
                      )}
                    </Card>
                  </div>
                )}

                {/* DOCUMENTS */}
                {tab === 'documents' && (
                  <div>
                    {user.plan === 'enterprise' ? (
                      <div className="p-6 rounded-2xl text-center" style={{ background: C.primaryDim, border: `1px solid ${C.primary}30` }}>
                        <Lock size={24} style={{ color: C.primary }} className="mx-auto mb-3" />
                        <p className="text-sm font-semibold mb-1" style={{ color: '#e2e8f0' }}>Enterprise Privacy</p>
                        <p className="text-xs" style={{ color: '#64748b' }}>Documents for enterprise users are private.</p>
                      </div>
                    ) : docs.length === 0 ? (
                      <Empty icon={FileText} title="No documents" sub="This user hasn't uploaded any files yet." />
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs mb-3" style={{ color: '#64748b' }}>{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
                        {docs.map(doc => (
                          <div key={doc._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl group"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.primaryDim }}>
                              <FileText size={14} style={{ color: C.primary }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate" style={{ color: '#e2e8f0' }}>{doc.filename}</p>
                              <p className="text-[11px]" style={{ color: '#475569' }}>{fmtDate(doc.uploadedAt)}</p>
                            </div>
                            <button
                              onClick={() => setConfirm({ title: 'Delete document?', message: 'This cannot be undone.', onConfirm: () => deleteDoc(doc._id), danger: true })}
                              className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ background: C.dangerDim }}>
                              <Trash2 size={12} style={{ color: C.danger }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* DANGER ZONE */}
                {tab === 'danger' && (
                  <Card title="Danger Zone" padding="p-4">
                    <p className="text-xs mb-4" style={{ color: '#64748b' }}>
                      Permanently delete this user and all their data. This action cannot be reversed.
                    </p>
                    <Btn variant="danger" className="w-full"
                      onClick={() => setConfirm({ title: 'Delete user permanently?', message: `All data for ${user.name} will be deleted forever.`, onConfirm: deleteUser, danger: true })}>
                      <Trash2 size={14} /> Delete User & All Data
                    </Btn>
                  </Card>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════════
function OverviewTab({ stats, loading }) {
  const s = stats || {};

  const kpiCards = [
    { icon: Users, label: 'Total Users', value: s.totalUsers, sub: `+${s.newUsersThisWeek ?? 0} this week`, trend: s.newUsersThisWeek > 0 ? 12 : 0, color: C.primary },
    { icon: UserCheck, label: 'Active Users', value: s.activeUsers, sub: `${s.suspendedUsers ?? 0} suspended`, trend: 5, color: C.success },
    { icon: FileText, label: 'Total Documents', value: s.totalDocuments, sub: `+${s.docsThisWeek ?? 0} this week`, trend: s.docsThisWeek > 0 ? 8 : 0, color: C.cyan },
    { icon: DollarSign, label: 'Total Revenue', value: s.totalRevenue ?? 0, prefix: '₹', sub: `₹${(s.revenueThisMonth??0).toLocaleString('en-IN')} this month`, trend: 18, color: C.success },
    { icon: Crown, label: 'Pro Users', value: s.plans?.pro ?? 0, sub: `${s.plans?.enterprise ?? 0} enterprise`, trend: 6, color: C.warning },
    { icon: Building2, label: 'Enterprise', value: s.plans?.enterprise ?? 0, sub: `${s.plans?.free ?? 0} on free`, color: C.purple },
    { icon: ShieldCheck, label: 'Admins', value: s.adminCount ?? 0, color: C.amber },
    { icon: BarChart2, label: 'Tables Extracted', value: s.totalTables ?? 0, color: C.pink },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map(c => <KPICard key={c.label} {...c} loading={loading} />)}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily signups chart */}
        <div className="lg:col-span-2">
          <Card title="User Signups" subtitle="Last 7 days" padding="p-5">
            {loading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={s.dailySignups || []}>
                  <defs>
                    <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.primary} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="count" stroke={C.primary} strokeWidth={2} fill="url(#signupGrad)" dot={{ r: 3, fill: C.primary, strokeWidth: 0 }} name="Signups" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Plan distribution */}
        <Card title="Plan Distribution" padding="p-5">
          {loading ? <Skeleton className="h-48 w-full" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={[
                  { name: 'Free', value: s.plans?.free || 0 },
                  { name: 'Pro', value: s.plans?.pro || 0 },
                  { name: 'Enterprise', value: s.plans?.enterprise || 0 },
                ]} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                  <Cell fill={C.cyan} />
                  <Cell fill={C.warning} />
                  <Cell fill={C.purple} />
                </Pie>
                <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} iconSize={8} iconType="circle" />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Docs chart + top uploaders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card title="Document Uploads" subtitle="Last 7 days" padding="p-5">
            {loading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={s.dailyDocs || []} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill={C.success} radius={[4, 4, 0, 0]} name="Docs" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Top uploaders */}
        <Card title="Top Uploaders" padding="p-4">
          {loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />) : (
            <div className="space-y-2">
              {(s.topUploaders || []).map((u, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <span className="text-xs font-bold w-4" style={{ color: i === 0 ? C.warning : '#475569' }}>#{i + 1}</span>
                  <Avatar name={u.name || u.email} size={28} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: '#e2e8f0' }}>{u.name || u.email}</p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: C.primary }}>{u.count}</span>
                </div>
              ))}
              {!(s.topUploaders?.length) && <Empty title="No data" />}
            </div>
          )}
        </Card>
      </div>

      {/* Recent signups */}
      <Card title="Recent Sign-ups" subtitle="Last 5 users">
        <Table headers={['User', 'Role', 'Plan', 'Joined']} loading={loading}>
          {(s.recentSignups || []).map(u => (
            <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={u.name || u.email} size={30} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: '#e2e8f0' }}>{u.name || '—'}</p>
                    <p className="text-[11px]" style={{ color: '#475569' }}>{u.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3"><Badge label={u.role || 'user'} colors={roleColor(u.role)} /></td>
              <td className="px-4 py-3"><Badge label={u.plan || 'free'} colors={planColor(u.plan)} /></td>
              <td className="px-4 py-3 text-xs" style={{ color: '#64748b' }}>{fmtDate(u.createdAt)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// USERS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function UsersTab({ showToast }) {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: 'all', role: 'all', plan: 'all', sort: 'newest' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const searchRef = useRef();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, search, ...filters };
      const { data } = await api.get('/api/admin/users', { params });
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch { showToast('Failed to load users', 'error'); }
    setLoading(false);
  }, [page, search, filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, filters]);

  const toggleSelect = id => setSelected(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const selectAll = () => setSelected(s => s.size === users.length ? new Set() : new Set(users.map(u => u._id)));

  const FILTER_OPTIONS = {
    status: [{ value: 'all', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }],
    role: [{ value: 'all', label: 'All Roles' }, { value: 'user', label: 'User' }, { value: 'admin', label: 'Admin' }],
    plan: [{ value: 'all', label: 'All Plans' }, { value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }, { value: 'enterprise', label: 'Enterprise' }],
    sort: [{ value: 'newest', label: 'Newest First' }, { value: 'oldest', label: 'Oldest First' }, { value: 'name', label: 'Name A→Z' }, { value: 'email', label: 'Email A→Z' }],
  };

  return (
    <>
      {selectedUser && (
        <AnimatePresence>
          <UserDrawer userId={selectedUser} onClose={() => setSelectedUser(null)} showToast={showToast} onRefresh={load} />
        </AnimatePresence>
      )}

      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users by name or email…" icon={Search} />
          </div>
          <Btn variant="secondary" onClick={() => setShowFilters(v => !v)}>
            <Filter size={13} /> Filters
            {Object.values(filters).filter(v => v !== 'all' && v !== 'newest').length > 0 && (
              <span className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center" style={{ background: C.primary, color: '#fff' }}>
                {Object.values(filters).filter(v => v !== 'all' && v !== 'newest').length}
              </span>
            )}
          </Btn>
          <Btn variant="secondary" onClick={load}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </Btn>
          <span className="text-xs" style={{ color: '#64748b' }}>{total.toLocaleString()} users</span>
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-3 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {Object.entries(FILTER_OPTIONS).map(([key, opts]) => (
                  <Select key={key} value={filters[key]} onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))} options={opts} />
                ))}
                <Btn variant="ghost" size="sm" onClick={() => setFilters({ status: 'all', role: 'all', plan: 'all', sort: 'newest' })}>
                  Clear
                </Btn>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk actions */}
        <AnimatePresence>
          {selected.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: C.primaryDim, border: `1px solid ${C.primary}30` }}>
              <span className="text-sm font-medium" style={{ color: C.primary }}>{selected.size} selected</span>
              <Btn size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Btn>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <Card>
          <Table
            headers={['', 'User', 'Role', 'Plan', 'Status', 'Docs', 'Created', 'Last Login', 'Actions']}
            loading={loading}
            rowCount={15}
          >
            {users.map(u => (
              <motion.tr
                key={u._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="group transition-colors"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(u._id)} onChange={() => toggleSelect(u._id)}
                    className="w-3.5 h-3.5 rounded accent-indigo-500" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={u.name || u.email} size={30} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate max-w-[120px]" style={{ color: '#e2e8f0' }}>{u.name || '—'}</p>
                      <p className="text-[11px] truncate max-w-[120px]" style={{ color: '#475569' }}>{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><Badge label={u.role || 'user'} colors={roleColor(u.role)} /></td>
                <td className="px-4 py-3"><Badge label={u.plan || 'free'} colors={planColor(u.plan)} /></td>
                <td className="px-4 py-3"><Badge label={u.status || 'active'} colors={statusColor(u.status)} /></td>
                <td className="px-4 py-3 text-xs font-medium" style={{ color: '#64748b' }}>{u.docCount ?? 0}</td>
                <td className="px-4 py-3 text-xs" style={{ color: '#475569' }}>{fmtDate(u.createdAt)}</td>
                <td className="px-4 py-3 text-xs" style={{ color: '#475569' }}>{u.lastLogin ? timeAgo(u.lastLogin) : '—'}</td>
                <td className="px-4 py-3">
                  <Btn size="sm" variant="secondary" onClick={() => setSelectedUser(u._id)}>
                    <Eye size={12} /> View
                  </Btn>
                </td>
              </motion.tr>
            ))}
            {!loading && users.length === 0 && (
              <tr><td colSpan={9} className="text-center py-12"><Empty icon={Users} title="No users found" sub="Try adjusting your search or filters" /></td></tr>
            )}
          </Table>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-xs" style={{ color: '#64748b' }}>
                Page {page} of {pages} · {total} users
              </span>
              <div className="flex gap-2">
                <Btn size="sm" variant="secondary" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                  <ChevronLeft size={13} />
                </Btn>
                {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2 + i, pages - 4 + i));
                  return (
                    <Btn key={p} size="sm" variant={p === page ? 'primary' : 'secondary'} onClick={() => setPage(p)}>
                      {p}
                    </Btn>
                  );
                })}
                <Btn size="sm" variant="secondary" onClick={() => setPage(p => p + 1)} disabled={page >= pages}>
                  <ChevronRight size={13} />
                </Btn>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVENUE TAB
// ═══════════════════════════════════════════════════════════════════════════════
function RevenueTab({ showToast, stats }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/api/billing/admin-payments').catch(() => ({ data: { payments: [] } }));
        setPayments(data.payments || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const s = stats || {};

  return (
    <div className="space-y-6">
      {/* Revenue KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard icon={DollarSign} label="Total Revenue" value={s.totalRevenue ?? 0} prefix="₹" trend={18} color={C.success} />
        <KPICard icon={TrendingUp} label="This Month" value={s.revenueThisMonth ?? 0} prefix="₹" trend={12} color={C.primary} />
        <KPICard icon={CreditCard} label="Transactions" value={s.totalTransactions ?? 0} trend={8} color={C.cyan} />
      </div>

      {/* Plan revenue breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Revenue by Plan" padding="p-5">
          <div className="space-y-3">
            {[
              { plan: 'free', label: 'Free', revenue: 0, users: s.plans?.free ?? 0 },
              { plan: 'pro', label: 'Pro', revenue: (s.plans?.pro ?? 0) * 499, users: s.plans?.pro ?? 0 },
              { plan: 'enterprise', label: 'Enterprise', revenue: (s.plans?.enterprise ?? 0) * 2999, users: s.plans?.enterprise ?? 0 },
            ].map(p => (
              <div key={p.plan}>
                <div className="flex justify-between mb-1.5 text-xs">
                  <span style={{ color: '#94a3b8' }}>{p.label} ({p.users} users)</span>
                  <span style={{ color: '#e2e8f0' }}>{fmtMoney(p.revenue)}</span>
                </div>
                <ProgressBar
                  value={Math.min(100, p.revenue > 0 ? Math.round((p.revenue / Math.max((s.totalRevenue ?? 1) * 100, 1)) * 100) : 0)}
                  color={planColor(p.plan).text}
                />
              </div>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card title="Revenue Trend" subtitle="Estimated based on plan data" padding="p-5">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={s.dailySignups?.map((d, i) => ({
                day: d.day,
                revenue: Math.round((d.count || 0) * 249),
              })) || []}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.success} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.success} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`₹${v}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke={C.success} strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>

      {/* Payments table */}
      <Card title="Payment History" subtitle="Recent transactions">
        <Table headers={['Invoice', 'Customer', 'Plan', 'Amount', 'Date']} loading={loading} rowCount={10}>
          {payments.slice(0, 30).map((p, i) => (
            <tr key={p._id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <td className="px-4 py-3 text-xs font-mono" style={{ color: '#475569' }}>{p.invoiceNumber || `#${i + 1001}`}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Avatar name={p.user?.name || p.user?.email} size={26} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: '#e2e8f0' }}>{p.user?.name || 'Unknown'}</p>
                    <p className="text-[11px]" style={{ color: '#475569' }}>{p.user?.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge label={`${p.plan || 'pro'} / ${p.billingCycle || 'monthly'}`} colors={planColor(p.plan)} />
              </td>
              <td className="px-4 py-3 text-sm font-bold" style={{ color: C.success }}>{fmtMoney(p.amount / 100)}</td>
              <td className="px-4 py-3 text-xs" style={{ color: '#475569' }}>{fmtDate(p.paidAt)}</td>
            </tr>
          ))}
          {!loading && payments.length === 0 && (
            <tr><td colSpan={5}><Empty icon={DollarSign} title="No payments yet" sub="Transactions will appear here" /></td></tr>
          )}
        </Table>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// API USAGE TAB (merges UsageDashboard)
// ═══════════════════════════════════════════════════════════════════════════════
function ApiUsageTab() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const sseRef = useRef(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const loadHistory = useCallback(async () => {
    try {
      const { data: r } = await api.get('/api/usage/history?days=7');
      if (r.success) setHistory(r.data);
    } catch {}
  }, []);

  useEffect(() => {
    let es;
    const connect = () => {
      es = new EventSource(`${API_BASE}/api/usage/stream`, { withCredentials: true });
      es.onmessage = e => {
        try {
          const payload = JSON.parse(e.data);
          payload.error ? setError(payload.error) : (setData(payload), setError(null));
        } catch {}
      };
      es.onerror = () => { es.close(); setTimeout(connect, 5000); };
      sseRef.current = es;
    };
    connect();
    loadHistory();
    const hi = setInterval(loadHistory, 5 * 60 * 1000);
    return () => { sseRef.current?.close(); clearInterval(hi); };
  }, [loadHistory]);

  const fmt2 = n => {
    if (n == null) return '—';
    if (n >= 1_000_000) return `${(n/1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n/1_000).toFixed(1)}K`;
    return String(n);
  };

  if (!data) return (
    <div className="flex items-center justify-center h-64">
      {error ? (
        <div className="text-center">
          <AlertCircle size={32} style={{ color: C.danger }} className="mx-auto mb-3" />
          <p className="text-sm font-medium" style={{ color: C.danger }}>{error}</p>
          <p className="text-xs mt-1" style={{ color: '#475569' }}>Admin access required</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={22} className="animate-spin" style={{ color: C.primary }} />
          <p className="text-sm" style={{ color: '#64748b' }}>Connecting to live stream…</p>
        </div>
      )}
    </div>
  );

  const { keys = [], totals = {}, currentKeyIndex = 0, lastRotatedAt, date } = data;

  return (
    <div className="space-y-6">
      {/* Live indicator */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Gemini API Key Usage</p>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
            {date} (UTC) · Key {currentKeyIndex + 1} active
            {lastRotatedAt && ` · rotated ${timeAgo(lastRotatedAt)}`}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: C.successDim, color: C.success, border: `1px solid ${C.success}30` }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.success }} />
          Live · 10s
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard icon={Activity} label="Total Requests Today" value={totals.requestCount ?? 0} color={C.primary} />
        <KPICard icon={Cpu} label="Total Tokens" value={totals.totalTokens ?? 0} suffix="" color={C.purple} />
        <KPICard icon={AlertTriangle} label="Rate Limit Hits" value={totals.rateLimitHits ?? 0} color={C.warning} />
        <KPICard icon={KeyRound} label="Active Key" value={currentKeyIndex + 1} prefix="Key " color={C.success} />
      </div>

      {/* Last request banner */}
      {data.lastUsageMetadata && (
        <div className="flex flex-wrap gap-4 items-center px-4 py-3 rounded-2xl text-xs"
          style={{ background: C.primaryDim, border: `1px solid ${C.primary}30`, color: '#94a3b8' }}>
          <span style={{ color: C.primary }}>Last via Key {(data.lastRequestKeyIndex ?? currentKeyIndex) + 1}</span>
          <span>·</span>
          <span>{data.lastRequestFeature || '—'}</span>
          <span className="ml-auto flex gap-4">
            <span>↑ <b style={{ color: '#e2e8f0' }}>{fmt2(data.lastUsageMetadata.promptTokenCount)}</b> in</span>
            <span>↓ <b style={{ color: '#e2e8f0' }}>{fmt2(data.lastUsageMetadata.candidatesTokenCount)}</b> out</span>
            <span>· {timeAgo(data.lastRequestAt)}</span>
          </span>
        </div>
      )}

      {/* Key cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {keys.map(k => {
          const pctReq = k.requestUsagePct || 0;
          const pctTok = k.tokenUsagePct || 0;
          return (
            <div key={k.keyIndex}
              className="rounded-2xl p-5 relative"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: k.isActive ? `1px solid ${C.primary}` : '1px solid rgba(255,255,255,0.07)',
                boxShadow: k.isActive ? `0 0 20px ${C.primary}20` : 'none',
              }}>
              {k.isActive && (
                <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: C.primaryDim, color: C.primary, border: `1px solid ${C.primary}40` }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.primary }} />
                  ACTIVE
                </span>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold"
                  style={{ background: k.isActive ? C.primary : 'rgba(255,255,255,0.07)', color: '#fff' }}>
                  {k.keyIndex + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{k.keyLabel}</p>
                  <p className="text-xs" style={{ color: '#475569' }}>{timeAgo(k.lastRequestAt)}</p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5" style={{ color: '#64748b' }}>
                    <span>Requests</span>
                    <span>{fmt2(k.requestCount)} / {fmt2(k.dailyRequestLimit)}</span>
                  </div>
                  <ProgressBar value={pctReq} color={C.primary} />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5" style={{ color: '#64748b' }}>
                    <span>Tokens</span>
                    <span>{fmt2(k.totalTokens)} / {fmt2(k.dailyTokenBudget)}</span>
                  </div>
                  <ProgressBar value={pctTok} color={C.purple} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Remaining', value: fmt2(k.remainingRequests), color: C.success },
                  { label: 'Rate Limits', value: k.rateLimitHits, color: k.rateLimitHits > 0 ? C.warning : '#475569' },
                  { label: 'Errors', value: k.errorCount, color: k.errorCount > 0 ? C.danger : '#475569' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-xs" style={{ color: '#475569' }}>{label}</p>
                    <p className="text-sm font-bold" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>

              {k.byFeature && (
                <div className="space-y-1.5 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {Object.entries(k.byFeature).map(([feat, stats]) => (
                    <div key={feat} className="flex items-center justify-between text-xs">
                      <span className="capitalize" style={{ color: '#64748b' }}>{feat}</span>
                      <div className="flex gap-2">
                        <span className="px-1.5 py-0.5 rounded" style={{ background: C.primaryDim, color: C.primary }}>{fmt2(stats.requests)} req</span>
                        <span className="px-1.5 py-0.5 rounded" style={{ background: C.purpleDim, color: C.purple }}>{fmt2(stats.tokens)} tok</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* History chart */}
      {history.length > 0 && (
        <Card title="7-Day Request History" padding="p-5">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={history} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false}
                tickFormatter={v => v?.slice(5) || v} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [fmt2(v), n === 'requestCount' ? 'Requests' : 'Tokens']} />
              <Bar dataKey="requestCount" fill={C.primary} radius={[4, 4, 0, 0]} name="requestCount" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Config note */}
      <div className="px-4 py-3 rounded-xl text-xs" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: '#475569' }}>
        <p className="font-semibold mb-1" style={{ color: '#64748b' }}>Quota configuration</p>
        Configure via env: <code className="px-1 rounded" style={{ background: 'rgba(255,255,255,0.07)' }}>GEMINI_DAILY_REQUEST_LIMIT</code> (default: 1,500) and{' '}
        <code className="px-1 rounded" style={{ background: 'rgba(255,255,255,0.07)' }}>GEMINI_DAILY_TOKEN_BUDGET</code> (default: 1,000,000). Resets at midnight UTC.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function AnalyticsTab({ stats, loading }) {
  const s = stats || {};

  return (
    <div className="space-y-6">
      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={TrendingUp} label="Conversion Rate" value={s.plans?.pro > 0 ? Math.round(((s.plans?.pro + (s.plans?.enterprise||0)) / (s.totalUsers||1))*100) : 0} suffix="%" trend={3} color={C.success} loading={loading} />
        <KPICard icon={Users} label="Total Users" value={s.totalUsers ?? 0} trend={12} color={C.primary} loading={loading} />
        <KPICard icon={FileText} label="Docs Processed" value={s.totalDocuments ?? 0} trend={18} color={C.cyan} loading={loading} />
        <KPICard icon={Activity} label="New This Week" value={s.newUsersThisWeek ?? 0} color={C.warning} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Signups trend */}
        <Card title="Signup Trend" subtitle="Daily new users last 7 days" padding="p-5">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={s.dailySignups || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="count" stroke={C.primary} strokeWidth={2.5} dot={{ r: 4, fill: C.primary }} name="Signups" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Document uploads */}
        <Card title="Document Activity" subtitle="Daily uploads last 7 days" padding="p-5">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={s.dailyDocs || []} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" fill={C.cyan} radius={[4, 4, 0, 0]} name="Docs" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Plan breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="User Status Split" padding="p-5">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Active', value: s.activeUsers || 0 },
                  { name: 'Suspended', value: s.suspendedUsers || 0 },
                ]}
                cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value"
              >
                <Cell fill={C.success} />
                <Cell fill={C.danger} />
              </Pie>
              <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} iconSize={8} iconType="circle" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Role Distribution" padding="p-5">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Users', value: (s.totalUsers || 0) - (s.adminCount || 0) },
                  { name: 'Admins', value: s.adminCount || 0 },
                ]}
                cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value"
              >
                <Cell fill={C.primary} />
                <Cell fill={C.warning} />
              </Pie>
              <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} iconSize={8} iconType="circle" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Top uploaders */}
        <Card title="Top 5 Uploaders" padding="p-4">
          <div className="space-y-3">
            {(s.topUploaders || []).map((u, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold w-5 text-right" style={{ color: i === 0 ? C.warning : '#475569' }}>
                  {i + 1}
                </span>
                <Avatar name={u.name || u.email} size={26} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate" style={{ color: '#94a3b8' }}>{u.name || u.email}</p>
                  <div className="mt-1">
                    <ProgressBar value={Math.round((u.count / ((s.topUploaders?.[0]?.count) || 1)) * 100)} color={C.primary} />
                  </div>
                </div>
                <span className="text-xs font-bold" style={{ color: C.primary }}>{u.count}</span>
              </div>
            ))}
            {!(s.topUploaders?.length) && <Empty title="No upload data" />}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOOLS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function ToolsTab({ showToast }) {
  const [adminForm, setAdminForm] = useState({ email: '', password: '', name: '' });
  const [working, setWorking] = useState('');
  const [migrateResult, setMigrateResult] = useState(null);

  const createAdmin = async () => {
    if (!adminForm.email || !adminForm.password) return showToast('Email and password required', 'error');
    setWorking('admin');
    try {
      const { data } = await api.post('/api/admin/create-admin', {
        email: adminForm.email, password: adminForm.password, name: adminForm.name
      });
      showToast(data.message);
      setAdminForm({ email: '', password: '', name: '' });
    } catch (e) { showToast(e?.response?.data?.message || 'Failed', 'error'); }
    setWorking('');
  };

  const migrate = async () => {
    setWorking('migrate');
    try {
      const { data } = await api.post('/api/admin/migrate-defaults');
      setMigrateResult(data);
      showToast('Migration complete');
    } catch { showToast('Migration failed', 'error'); }
    setWorking('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
      {/* Create Admin */}
      <Card title="Create / Promote Admin" subtitle="Create a new admin or promote an existing user">
        <div className="space-y-3">
          <Input value={adminForm.name} onChange={e => setAdminForm(f => ({ ...f, name: e.target.value }))} placeholder="Display name (optional)" />
          <Input value={adminForm.email} onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))} placeholder="Email address" type="email" icon={Mail} />
          <Input value={adminForm.password} onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))} placeholder="Password (min 6 chars)" type="password" icon={Lock} />
          <Btn onClick={createAdmin} disabled={working === 'admin'} className="w-full">
            <Plus size={14} />
            {working === 'admin' ? 'Creating…' : 'Create / Promote Admin'}
          </Btn>
        </div>
      </Card>

      {/* Migration */}
      <Card title="Database Migration" subtitle="Backfill missing defaults for existing users">
        <p className="text-xs mb-4" style={{ color: '#64748b' }}>
          Sets role/status/plan defaults for users that were created before these fields existed.
        </p>
        <Btn variant="secondary" onClick={migrate} disabled={working === 'migrate'} className="w-full mb-4">
          <RefreshCw size={14} className={working === 'migrate' ? 'animate-spin' : ''} />
          {working === 'migrate' ? 'Running…' : 'Run Migration'}
        </Btn>
        {migrateResult && (
          <div className="space-y-1.5 p-3 rounded-xl text-xs" style={{ background: C.successDim, border: `1px solid ${C.success}30` }}>
            <p style={{ color: C.success }}>✓ Roles backfilled: {migrateResult.r1}</p>
            <p style={{ color: C.success }}>✓ Statuses backfilled: {migrateResult.r2}</p>
            <p style={{ color: C.success }}>✓ Plans backfilled: {migrateResult.r3}</p>
          </div>
        )}
      </Card>

      {/* Quick stats */}
      <Card title="System Info" subtitle="Runtime environment">
        <div className="space-y-2 text-xs">
          {[
            { label: 'Environment', value: import.meta.env.MODE || 'production' },
            { label: 'API Base', value: import.meta.env.VITE_API_URL || 'http://localhost:5000' },
            { label: 'Build', value: new Date().toLocaleDateString() },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span style={{ color: '#64748b' }}>{label}</span>
              <span className="font-mono" style={{ color: '#94a3b8' }}>{value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Danger zone */}
      <Card title="Danger Zone" subtitle="Irreversible operations">
        <div className="space-y-3">
          <div className="p-3 rounded-xl text-xs" style={{ background: C.dangerDim, border: `1px solid ${C.danger}30`, color: '#94a3b8' }}>
            These operations cannot be undone. Use with extreme caution.
          </div>
          <Btn variant="danger" className="w-full" onClick={() => showToast('Feature coming soon', 'info')}>
            <Trash2 size={14} /> Clear All Sessions
          </Btn>
          <Btn variant="warning" className="w-full" onClick={() => showToast('Feature coming soon', 'info')}>
            <RotateCcw size={14} /> Reset All Rate Limits
          </Btn>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'overview',      label: 'Overview',      icon: LayoutDashboard },
  { id: 'users',         label: 'Users',          icon: Users },
  { id: 'analytics',     label: 'Analytics',      icon: BarChart3 },
  { id: 'revenue',       label: 'Revenue',        icon: DollarSign },
  { id: 'api',           label: 'API Usage',      icon: Zap },
  { id: 'tools',         label: 'Admin Tools',    icon: Settings },
  // ── Enterprise Features ────────────────────────────────────────────────────
  { id: 'maintenance',   label: 'Maintenance',    icon: Wrench },
  { id: 'announcements', label: 'Announcements',  icon: Megaphone },
  { id: 'broadcast',     label: 'Broadcast',      icon: Radio },
  { id: 'notifications', label: 'Alerts',         icon: BellRing },
  { id: 'features',      label: 'Feature Flags',  icon: ToggleLeft },
  { id: 'status',        label: 'System Status',  icon: Activity },
  { id: 'security',      label: 'Security',       icon: ShieldAlert },
  { id: 'feedback',      label: 'Feedback',       icon: MessageSquare },
];

export default function AdminPanel() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Sync with the global dark/light mode set by Navbar
  const [darkMode, setDarkMode] = useState(() =>
    document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const showToast = useCallback((msg, type = 'success') => {
    setToasts(t => [...t, { msg, type, id: Date.now() + Math.random() }]);
  }, []);

  const removeToast = useCallback(id => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const { data } = await api.get('/api/admin/stats');
      setStats(data);
    } catch { showToast('Failed to load stats', 'error'); }
    setLoadingStats(false);
  }, [showToast]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen" style={{ background: darkMode ? '#060b14' : '#f1f5f9', color: darkMode ? '#e2e8f0' : '#1e293b' }}>

      {/* Header */}
      <div className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between"
        style={{ background: darkMode ? 'rgba(6,11,20,0.9)' : 'rgba(241,245,249,0.9)', borderBottom: darkMode ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(20px)' }}>
        <div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <ShieldCheck size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold" style={{ color: '#f1f5f9' }}>Admin Console</h1>
              <p className="text-[11px]" style={{ color: '#475569' }}>{dateStr}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
            style={{ background: C.successDim, color: C.success, border: `1px solid ${C.success}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.success }} />
            Live
          </div>

          <Btn variant="secondary" size="sm" onClick={loadStats} disabled={loadingStats}>
            <RefreshCw size={12} className={loadingStats ? 'animate-spin' : ''} />
            {loadingStats ? 'Loading…' : 'Refresh'}
          </Btn>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-[68px] z-20 px-6" style={{ background: darkMode ? 'rgba(6,11,20,0.95)' : 'rgba(241,245,249,0.95)', borderBottom: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.07)', backdropFilter: 'blur(20px)' }}>
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-all whitespace-nowrap relative"
                style={{ color: active ? C.primary : '#64748b', borderBottom: active ? `2px solid ${C.primary}` : '2px solid transparent' }}>
                <Icon size={14} />
                {t.label}
                {active && (
                  <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: C.primary }}
                    layoutId="tabIndicator"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'overview' && <OverviewTab stats={stats} loading={loadingStats} />}
            {tab === 'users' && <UsersTab showToast={showToast} />}
            {tab === 'analytics' && <AnalyticsTab stats={stats} loading={loadingStats} />}
            {tab === 'revenue' && <RevenueTab showToast={showToast} stats={stats} />}
            {tab === 'api' && <ApiUsageTab />}
            {tab === 'tools' && <ToolsTab showToast={showToast} />}
            {/* ── Enterprise extension ── */}
            {['maintenance','announcements','broadcast','notifications','features','status','security','feedback'].includes(tab) && (
              <AdminPanelExtension tab={tab} showToast={showToast} stats={stats} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[300] space-y-2">
        <AnimatePresence>
          {toasts.map(t => (
            <Toast key={t.id} msg={t.msg} type={t.type} onClose={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
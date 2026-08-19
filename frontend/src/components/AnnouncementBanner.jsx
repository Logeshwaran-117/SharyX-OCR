// src/components/AnnouncementBanner.jsx
// Reads active announcements from AdminContext and renders them
// as banners, toasts, or popups depending on their display setting.
//
// Fix applied: Banner items, Toast items, and Popup modal now use the
// project's .glass CSS class for a premium glassmorphism treatment
// instead of flat solid backgrounds.

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdmin } from '../context/AdminContext';
import {
  X, Info, CheckCircle, AlertTriangle, XCircle,
  Star, Wrench, Package, Bell,
} from 'lucide-react';

const TYPE_CONFIG = {
  Information:    { icon: Info,          color: '#06b6d4', border: 'rgba(6,182,212,0.35)'  },
  Success:        { icon: CheckCircle,   color: '#10b981', border: 'rgba(16,185,129,0.35)' },
  Warning:        { icon: AlertTriangle, color: '#f59e0b', border: 'rgba(245,158,11,0.35)' },
  Error:          { icon: XCircle,       color: '#ef4444', border: 'rgba(239,68,68,0.35)'  },
  Promotion:      { icon: Star,          color: '#ec4899', border: 'rgba(236,72,153,0.35)' },
  Maintenance:    { icon: Wrench,        color: '#f59e0b', border: 'rgba(245,158,11,0.35)' },
  'Release Notes':{ icon: Package,       color: '#8b5cf6', border: 'rgba(139,92,246,0.35)' },
};

// ─── Individual dismissible toast/banner ──────────────────────────────────────
function AnnouncementItem({ item, onDismiss }) {
  const cfg = TYPE_CONFIG[item.type] || {
    icon: Bell, color: '#6366f1', border: 'rgba(99,102,241,0.35)',
  };
  const Ic = cfg.icon;

  if (item.display === 'Toast') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 60 }}
        // .glass provides: rgba(primary-rgb,.05) bg + backdrop-filter + primary border
        // Override just the border tint with the type colour via inline style
        className="glass flex items-start gap-3 p-4 rounded-2xl max-w-sm pointer-events-auto"
        style={{
          borderColor: cfg.border,
          boxShadow: `0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px ${cfg.border}`,
        }}
      >
        <Ic size={16} style={{ color: cfg.color, marginTop: 2, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{item.title}</p>
          {item.content && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{item.content}</p>
          )}
        </div>
        <button
          onClick={() => onDismiss(item.id)}
          className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        >
          <X size={14} style={{ color: 'var(--muted)' }} />
        </button>
      </motion.div>
    );
  }

  // Banner — glassmorphism strip at the top of the page
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
      style={{ borderBottom: `1px solid ${cfg.border}` }}
    >
      {/* .glass gives the backdrop-blur + semi-transparent fill */}
      <div
        className="glass flex items-center gap-3 px-4 py-2.5"
        style={{ borderRadius: 0, borderColor: 'transparent' }}
      >
        <Ic size={14} style={{ color: cfg.color, flexShrink: 0 }} />
        <p className="flex-1 text-sm font-medium" style={{ color: 'var(--text)' }}>
          <span className="font-semibold" style={{ color: cfg.color }}>{item.title}:</span>{' '}
          {item.content}
        </p>
        <button
          onClick={() => onDismiss(item.id)}
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X size={14} style={{ color: 'var(--muted)' }} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Popup modal announcement ─────────────────────────────────────────────────
function AnnouncementPopup({ item, onDismiss }) {
  if (!item) return null;
  const cfg = TYPE_CONFIG[item.type] || {
    icon: Bell, color: '#6366f1', border: 'rgba(99,102,241,0.35)',
  };
  const Ic = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onDismiss(item.id)}
      />

      {/* Modal card — .glass for premium feel */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass relative w-full max-w-md rounded-2xl p-6 text-center"
        style={{
          borderColor: cfg.border,
          boxShadow: `0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px ${cfg.border}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Icon bubble */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{
            background: `${cfg.color}1a`, // 10% opacity tint
            border: `1px solid ${cfg.border}`,
          }}
        >
          <Ic size={24} style={{ color: cfg.color }} />
        </div>

        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: cfg.color }}>
          {item.type}
        </p>
        <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text)' }}>{item.title}</h3>
        {item.content && (
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>{item.content}</p>
        )}

        <button
          onClick={() => onDismiss(item.id)}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 text-white"
          style={{ background: cfg.color }}
        >
          Got it
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AnnouncementBanner({ user }) {
  const { activeAnnouncements } = useAdmin();
  const [dismissed, setDismissed] = useState(new Set());

  const dismiss = (id) => setDismissed(prev => new Set([...prev, id]));

  const visible = activeAnnouncements.filter(a => !dismissed.has(a.id));
  const banners = visible.filter(a => !['Toast', 'Popup', 'Modal'].includes(a.display));
  const toasts  = visible.filter(a => a.display === 'Toast');
  const popup   = visible.find(a => ['Popup', 'Modal'].includes(a.display));

  return (
    <>
      {/* Top banners — rendered above the main content */}
      <AnimatePresence>
        {banners.map(item => (
          <AnnouncementItem key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </AnimatePresence>

      {/* Toast stack — bottom right */}
      <div className="fixed bottom-6 right-6 z-[140] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(item => (
            <AnnouncementItem key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>

      {/* Popup/Modal */}
      <AnimatePresence>
        {popup && <AnnouncementPopup key={popup.id} item={popup} onDismiss={dismiss} />}
      </AnimatePresence>
    </>
  );
}
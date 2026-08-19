// src/components/MaintenanceGate.jsx
// Shows maintenance page to non-admin users when maintenance is active.
// Respects the "allowAdmins" setting from the admin panel.
// Uses both storage events (cross-tab) AND polling (same-tab / fallback).

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdmin } from '../context/AdminContext';
import { Wrench, Clock, RefreshCw } from 'lucide-react';

function Countdown({ endTime }) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endTime) - new Date();
      if (diff <= 0) { setDisplay('Any moment now…'); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setDisplay(
        h > 0
          ? `${h}h ${m.toString().padStart(2,'0')}m ${s.toString().padStart(2,'0')}s`
          : `${m.toString().padStart(2,'0')}m ${s.toString().padStart(2,'0')}s`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs font-medium mb-2 uppercase tracking-widest opacity-50">Time remaining</p>
      <p className="font-mono text-5xl font-bold tracking-tight" style={{ color: '#f59e0b' }}>{display}</p>
    </div>
  );
}

export default function MaintenanceGate({ user, children }) {
  const { maintenance, isMaintenanceActive } = useAdmin();
  const isAdmin = user?.role === 'admin';

  // Respect the "Allow admin access" toggle from the maintenance settings form.
  // If allowAdmins is explicitly false, even admins see the maintenance page.
  const adminsBypassMaintenance = maintenance?.allowAdmins !== false;

  // Should this user be blocked?
  const isBlocked = isMaintenanceActive && !(isAdmin && adminsBypassMaintenance);

  if (!isBlocked) return children;

  const m = maintenance;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center text-center px-6"
      style={{ background: 'linear-gradient(135deg, #050a14 0%, #0a1020 50%, #050a14 100%)' }}>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(245,158,11,0.08), transparent)' }} />

      {/* Animated wrench */}
      <motion.div
        animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 relative z-10"
        style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))',
          border: '1px solid rgba(245,158,11,0.3)',
          boxShadow: '0 0 60px rgba(245,158,11,0.15)',
        }}>
        <Wrench size={44} style={{ color: '#f59e0b' }} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="relative z-10 max-w-lg">

        <h1 className="text-4xl font-bold mb-4" style={{ color: '#f1f5f9' }}>
          We'll be right back
        </h1>

        {m?.reason ? (
          <p className="text-lg mb-8 leading-relaxed" style={{ color: '#94a3b8' }}>{m.reason}</p>
        ) : (
          <p className="text-lg mb-8 leading-relaxed" style={{ color: '#94a3b8' }}>
            We're performing scheduled maintenance to improve your experience. Thank you for your patience.
          </p>
        )}

        {m?.showCountdown && m?.endTime && (
          <div className="mb-8 py-6 px-8 rounded-2xl"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Countdown endTime={m.endTime} />
          </div>
        )}

        {m?.estimatedDone && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <Clock size={14} style={{ color: '#64748b' }} />
            <p className="text-sm" style={{ color: '#64748b' }}>
              Expected completion: <span style={{ color: '#94a3b8' }}>{m.estimatedDone}</span>
            </p>
          </div>
        )}

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{ background: 'rgba(255,255,255,0.07)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
          <RefreshCw size={14} />
          Check again
        </button>
      </motion.div>

      {/* Bottom branding */}
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="absolute bottom-8 text-xs" style={{ color: '#334155' }}>
        SharyX OCR · Status updates at status.sharyxocr.com
      </motion.p>
    </div>
  );
}
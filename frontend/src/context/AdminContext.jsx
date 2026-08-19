// src/context/AdminContext.jsx
// Syncs maintenance mode, feature flags and announcements from the BACKEND
// so every user's browser is affected when an admin makes a change.
//
// Strategy:
//   - Admin writes  → POST /api/admin/app-settings  (admin-authenticated via api axios)
//   - All users read → GET  /api/admin/app-settings  (plain fetch, no auth needed, public)
//   - localStorage is a fast local cache for instant UI updates in the admin's own tab

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';

// ─── Default feature flags ────────────────────────────────────────────────────
const DEFAULT_FLAGS = {
  aiChat: true, summarizer: true, ocr: true, tableExtract: true,
  docUpload: true, apiAccess: true, registration: true, login: true,
  newDashboard: false, experimental: false, betaFeatures: false, maintenanceBanner: false,
};

// ─── Backend base URL (same source as the api axios instance) ─────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── localStorage helpers (fast local cache) ─────────────────────────────────
const LS = {
  getMaintenance:   () => { try { return JSON.parse(localStorage.getItem('admin_maintenance') || 'null'); } catch { return null; } },
  getFlags:         () => { try { return { ...DEFAULT_FLAGS, ...JSON.parse(localStorage.getItem('admin_flags') || '{}') }; } catch { return { ...DEFAULT_FLAGS }; } },
  getAnnouncements: () => { try { return JSON.parse(localStorage.getItem('admin_announcements') || '[]'); } catch { return []; } },
  setMaintenance:   (v) => v != null ? localStorage.setItem('admin_maintenance', JSON.stringify(v)) : localStorage.removeItem('admin_maintenance'),
  setFlags:         (v) => localStorage.setItem('admin_flags', JSON.stringify(v)),
  setAnnouncements: (v) => localStorage.setItem('admin_announcements', JSON.stringify(v)),
};

// ─── Context ──────────────────────────────────────────────────────────────────
const AdminContext = createContext(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>');
  return ctx;
}

// ─── Push settings to backend (admin-only, uses authenticated api instance) ──
async function pushToBackend(patch) {
  try {
    await api.post('/admin/app-settings', patch);
  } catch (err) {
    // Non-fatal: local state is already updated.
    // A 403 here just means current user isn't admin — that's expected for regular users.
    if (err?.response?.status !== 403) {
      console.warn('[AdminContext] Failed to push settings to backend:', err?.response?.status);
    }
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AdminProvider({ children }) {
  // Initialise from localStorage cache for instant render; backend poll corrects it
  const [maintenance,   _setMaintenance]   = useState(LS.getMaintenance);
  const [featureFlags,  _setFeatureFlags]  = useState(LS.getFlags);
  const [announcements, _setAnnouncements] = useState(LS.getAnnouncements);

  // ── Emergency alert ──────────────────────────────────────────────────────────
  const [emergencyAlert, setEmergencyAlert] = useState(null);

  // ── Broadcasts ───────────────────────────────────────────────────────────────
  const [broadcasts, setBroadcasts] = useState([]);
  const pushBroadcast   = useCallback((msg) => setBroadcasts(prev => [{ ...msg, id: Date.now(), receivedAt: new Date(), dismissed: false }, ...prev]), []);
  const dismissBroadcast = useCallback((id) => setBroadcasts(prev => prev.map(x => x.id === id ? { ...x, dismissed: true } : x)), []);

  // ── Maintenance ─────────────────────────────────────────────────────────────
  const setMaintenance = useCallback((data) => {
    _setMaintenance(data);
    LS.setMaintenance(data);
    pushToBackend({ maintenance: data });
  }, []);

  // ── Feature flags ────────────────────────────────────────────────────────────
  const toggleFlag = useCallback((key) => {
    _setFeatureFlags(prev => {
      const next = { ...prev, [key]: !prev[key] };
      LS.setFlags(next);
      pushToBackend({ featureFlags: next });
      return next;
    });
  }, []);

  const setFlag = useCallback((key, value) => {
    _setFeatureFlags(prev => {
      const next = { ...prev, [key]: value };
      LS.setFlags(next);
      pushToBackend({ featureFlags: next });
      return next;
    });
  }, []);

  // ── Announcements ────────────────────────────────────────────────────────────
  const publishAnnouncement = useCallback((item) => {
    _setAnnouncements(prev => {
      const next = [item, ...prev.filter(x => x.id !== item.id)];
      LS.setAnnouncements(next);
      pushToBackend({ announcements: next });
      return next;
    });
  }, []);

  const removeAnnouncement = useCallback((id) => {
    _setAnnouncements(prev => {
      const next = prev.filter(x => x.id !== id);
      LS.setAnnouncements(next);
      pushToBackend({ announcements: next });
      return next;
    });
  }, []);

  // ── Backend polling — uses plain fetch (NOT the api axios instance) ───────────
  // Reason: the api axios interceptor redirects to /login on any 401/403.
  // This public endpoint needs no auth, so we use fetch directly to avoid
  // accidentally triggering that interceptor for regular users.
  const prevRef = useRef({ maintenance: null, featureFlags: {}, announcements: [] });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/app-settings`, {
          method: 'GET',
          // No credentials needed — this endpoint is public
        });
        if (!res.ok) return; // silently skip on any error
        const data = await res.json();

        // Only update state if something actually changed
        if (JSON.stringify(data.maintenance) !== JSON.stringify(prevRef.current.maintenance)) {
          prevRef.current.maintenance = data.maintenance;
          _setMaintenance(data.maintenance);
          LS.setMaintenance(data.maintenance);
        }

        const mergedFlags = { ...DEFAULT_FLAGS, ...(data.featureFlags || {}) };
        if (JSON.stringify(mergedFlags) !== JSON.stringify(prevRef.current.featureFlags)) {
          prevRef.current.featureFlags = mergedFlags;
          _setFeatureFlags(mergedFlags);
          LS.setFlags(mergedFlags);
        }

        const anns = data.announcements || [];
        if (JSON.stringify(anns) !== JSON.stringify(prevRef.current.announcements)) {
          prevRef.current.announcements = anns;
          _setAnnouncements(anns);
          LS.setAnnouncements(anns);
        }
      } catch {
        // Network error or backend down — silently use localStorage cache
      }
    };

    fetchSettings(); // immediately on mount
    const poll = setInterval(fetchSettings, 30000); // then every 30 s (was 4 s — reduced to avoid hammering on page transitions)

    // Cross-tab sync (same browser, different tab)
    const onStorage = (e) => {
      if (e.key === 'admin_maintenance')        _setMaintenance(LS.getMaintenance());
      else if (e.key === 'admin_flags')         _setFeatureFlags(LS.getFlags());
      else if (e.key === 'admin_announcements') _setAnnouncements(LS.getAnnouncements());
    };
    window.addEventListener('storage', onStorage);

    return () => {
      clearInterval(poll);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // ── Computed ─────────────────────────────────────────────────────────────────
  const isMaintenanceActive = maintenance?.enabled === true;
  const activeAnnouncements = announcements.filter(a => {
    if (a.status !== 'active') return false;
    if (a.expiresAt && new Date(a.expiresAt) < new Date()) return false;
    return true;
  });
  const activeBroadcasts = broadcasts.filter(b => !b.dismissed);

  return (
    <AdminContext.Provider value={{
      maintenance, setMaintenance, isMaintenanceActive,
      featureFlags, toggleFlag, setFlag,
      announcements, activeAnnouncements, publishAnnouncement, removeAnnouncement,
      broadcasts, activeBroadcasts, pushBroadcast, dismissBroadcast,
      emergencyAlert, setEmergencyAlert,
    }}>
      {children}
    </AdminContext.Provider>
  );
}
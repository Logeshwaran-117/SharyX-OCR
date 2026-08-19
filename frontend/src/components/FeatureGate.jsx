// src/components/FeatureGate.jsx
// Wraps any feature/page. If the feature flag is OFF, shows a "Feature disabled" screen.
//
// Usage:
//   <FeatureGate flag="summarizer">
//     <Uploadcard />
//   </FeatureGate>
//
//   <FeatureGate flag="tableExtract" inline>
//     <TableButton />   ← renders nothing (not a full page block) when disabled
//   </FeatureGate>

import { motion } from 'framer-motion';
import { useAdmin } from '../context/AdminContext';
import { Lock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FLAG_LABELS = {
  aiChat:          'AI Chat',
  summarizer:      'Document Summarizer',
  ocr:             'OCR',
  tableExtract:    'Table Extraction',
  docUpload:       'Document Upload',
  apiAccess:       'API Access',
  registration:    'Registration',
  login:           'Login',
  newDashboard:    'New Dashboard',
  experimental:    'Experimental Features',
  betaFeatures:    'Beta Features',
  maintenanceBanner:'Maintenance Banner',
};

// Full-page block shown when a feature is disabled
function FeatureDisabledPage({ flag }) {
  const navigate = useNavigate();
  const label = FLAG_LABELS[flag] || flag;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6"
    >
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))',
          border: '1px solid rgba(99,102,241,0.25)',
        }}
      >
        <Lock size={32} style={{ color: '#6366f1' }} />
      </div>

      {/* Text */}
      <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text)' }}>
        {label} is Disabled
      </h2>
      <p className="text-sm max-w-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
        This feature has been temporarily disabled by an administrator. Please check back later or contact support.
      </p>

      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
        style={{
          background: 'rgba(99,102,241,0.12)',
          color: '#6366f1',
          border: '1px solid rgba(99,102,241,0.25)',
        }}
      >
        <ArrowLeft size={14} />
        Go to Dashboard
      </button>
    </motion.div>
  );
}

// Main gate component
export default function FeatureGate({ flag, children, inline = false }) {
  const { featureFlags } = useAdmin();

  // If flag doesn't exist in context, default to enabled
  const isEnabled = featureFlags[flag] !== false;

  if (isEnabled) return children;

  // inline=true: simply render nothing (for buttons/cards inside a page)
  if (inline) return null;

  // Default: full page block
  return <FeatureDisabledPage flag={flag} />;
}

// src/hooks/useFeatureFlag.js
// Convenience hook — use anywhere to check if a flag is on.
//
// import { useFeatureFlag } from '../hooks/useFeatureFlag';
// const summariserOn = useFeatureFlag('summarizer');

import { useAdmin } from '../context/AdminContext';

export function useFeatureFlag(flag) {
  const { featureFlags } = useAdmin();
  return featureFlags[flag] !== false; // defaults to true if flag not set
}

export function useFeatureFlags() {
  const { featureFlags } = useAdmin();
  return featureFlags;
}
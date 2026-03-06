import React, { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import UpgradeModal from '../../Account/components/UpgradeModal';

/**
 * LockedSection — wraps a feedback section for free-tier gating.
 *
 * Props:
 *   isLocked   – boolean; if false, renders children normally
 *   title      – section label shown on the overlay (e.g. "Detailed Scores")
 *   currentTier – user's current tier (passed down from FeedbackRouter)
 *   onUnlock   – optional callback after successful payment (re-fetches feedback access)
 *   children   – the actual content (never rendered for free users — placeholder shown instead)
 */
const LockedSection = ({ isLocked, title = 'This section', currentTier = 0, onUnlock, children }) => {
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!isLocked) return children;

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden">
        {/* Blurred placeholder — dummy visual, NOT real data */}
        <div
          className="pointer-events-none select-none"
          style={{ filter: 'blur(7px)', userSelect: 'none' }}
          aria-hidden="true"
        >
          <PlaceholderContent />
        </div>

        {/* Upgrade overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm rounded-2xl p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
            <Lock className="h-5 w-5 text-gray-500" />
          </div>
          <p className="font-semibold text-gray-800 text-sm mb-1">
            Unlock {title}
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Upgrade to Basic or Pro to access detailed feedback
          </p>
          <button
            onClick={() => setShowUpgrade(true)}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md"
          >
            View Full Report <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        currentTier={currentTier}
        context="general"
        onSuccess={() => {
          setShowUpgrade(false);
          onUnlock?.();
        }}
      />
    </>
  );
};

/** Dummy placeholder — purely visual, no real data */
const PlaceholderContent = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
    <div className="h-4 bg-gray-200 rounded w-1/3" />
    <div className="space-y-3">
      {[80, 65, 72, 58, 90].map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 bg-gray-200 rounded w-24" />
          <div className="flex-1 h-3 bg-gray-200 rounded" style={{ width: `${w}%` }} />
          <div className="h-3 bg-gray-200 rounded w-8" />
        </div>
      ))}
    </div>
    <div className="space-y-2 pt-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-3 bg-gray-100 rounded w-full" />
      ))}
    </div>
  </div>
);

export default LockedSection;

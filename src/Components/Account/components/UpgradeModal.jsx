import React, { useState } from 'react';
import { X, Zap, Star, ArrowRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RazorpayButton from './RazorpayButton';
import { PLAN_DISPLAY, formatINR, TIER_BASIC, TIER_PRO } from '../../../utils/planUtils';

const PLANS = [
  {
    key: 'basic',
    name: 'Basic',
    tier: TIER_BASIC,
    icon: Zap,
    color: 'blue',
    tagline: '5 interviews/month',
    features: ['10 credits/month', '5 interviews', '10 resume analyses', 'Full feedback'],
  },
  {
    key: 'pro',
    name: 'Pro',
    tier: TIER_PRO,
    icon: Star,
    color: 'purple',
    tagline: '50 interviews/month',
    features: ['100 credits/month', '50 interviews', '100 resume analyses', 'Priority support'],
    popular: true,
  },
];

const COLOR = {
  blue:   { border: 'border-blue-200',   bg: 'bg-blue-50',   btn: 'bg-blue-600 hover:bg-blue-700',   text: 'text-blue-600' },
  purple: { border: 'border-purple-200', bg: 'bg-purple-50', btn: 'bg-purple-600 hover:bg-purple-700', text: 'text-purple-600' },
};

const UpgradeModal = ({ isOpen, onClose, currentTier = 0, context = 'general', onSuccess }) => {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const visiblePlans = PLANS.filter((p) => p.tier > currentTier);

  const getPlanKey = (planKey) =>
    billingCycle === 'yearly'
      ? PLAN_DISPLAY[planKey].planKey.yearly
      : PLAN_DISPLAY[planKey].planKey.monthly;

  const getPrice = (planKey) => {
    const d = PLAN_DISPLAY[planKey];
    return billingCycle === 'yearly' ? d.yearlyPrice : d.monthlyPrice;
  };

  const getDisplayPrice = (planKey) => {
    const d = PLAN_DISPLAY[planKey];
    return billingCycle === 'yearly' ? d.monthlyEquiv : d.monthlyPrice;
  };

  const handleSuccess = (data) => {
    onSuccess?.(data);
    onClose();
  };

  const contextMessage = {
    interview: "You've used all your interview credits.",
    resume:    "You've used all your resume analysis credits.",
    time:      "Your free 10-minute session has ended.",
    general:   "Upgrade to unlock more features.",
  }[context] || "Upgrade to unlock more features.";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5 text-white">
              <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-bold">Upgrade Your Plan</h2>
              <p className="text-sm text-white/80 mt-1">{contextMessage}</p>
            </div>

            <div className="p-6 space-y-5">
              {/* Billing Cycle Toggle */}
              <div className="flex justify-center">
                <div className="flex items-center bg-gray-100 rounded-full p-1 gap-1">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      billingCycle === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                      billingCycle === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Yearly
                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                      Save 10%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plan Cards */}
              {visiblePlans.length > 0 ? (
                <div className="space-y-3">
                  {visiblePlans.map((plan) => {
                    const c    = COLOR[plan.color];
                    const Icon = plan.icon;
                    return (
                      <div
                        key={plan.key}
                        className={`rounded-xl border-2 ${c.border} ${c.bg} p-4`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${c.text}`} />
                            <div>
                              <span className="font-bold text-gray-900">{plan.name}</span>
                              <span className="text-xs text-gray-500 ml-2">{plan.tagline}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900">
                              {formatINR(getDisplayPrice(plan.key))}<span className="text-xs font-normal text-gray-500">/mo</span>
                            </div>
                            {billingCycle === 'yearly' && (
                              <div className="text-xs text-gray-400">
                                billed {formatINR(getPrice(plan.key))}/yr
                              </div>
                            )}
                          </div>
                        </div>

                        <ul className="grid grid-cols-2 gap-1 mb-3">
                          {plan.features.map((f) => (
                            <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                              <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>

                        <RazorpayButton
                          type="plan"
                          plan={getPlanKey(plan.key)}
                          label={`Upgrade to ${plan.name}`}
                          amount={getPrice(plan.key) * 100}
                          onSuccess={handleSuccess}
                          className={`w-full py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors ${c.btn}`}
                        >
                          Upgrade to {plan.name} <ArrowRight className="h-4 w-4" />
                        </RazorpayButton>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-sm text-gray-500 py-4">You're already on the highest plan.</p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UpgradeModal;

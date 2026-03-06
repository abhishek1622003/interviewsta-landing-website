import React, { useState } from 'react';
import { Clock, ArrowRight, Zap, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import RazorpayButton from './RazorpayButton';
import { formatINR, PLAN_DISPLAY } from '../../../utils/planUtils';

/**
 * Non-dismissable full-screen modal shown when a Free-tier user's
 * 10-minute interview session expires.
 * Props:
 *   isOpen          – boolean
 *   feedbackReady   – boolean; true once endInterviewAPI + feedback polling completes
 *   onUpgradeSuccess(data) – called after successful payment; parent should navigate to feedback
 *   onContinueToFeedback() – called when user clicks "Continue to Feedback" without upgrading
 */
const FreeSessionEndedModal = ({ isOpen, feedbackReady = false, onUpgradeSuccess, onContinueToFeedback }) => {
  const [billingCycle, setBillingCycle] = useState('monthly');

  if (!isOpen) return null;

  const getPrice = (planKey) =>
    billingCycle === 'yearly' ? PLAN_DISPLAY[planKey].yearlyPrice : PLAN_DISPLAY[planKey].monthlyPrice;

  const getDisplayPrice = (planKey) =>
    billingCycle === 'yearly' ? PLAN_DISPLAY[planKey].monthlyEquiv : PLAN_DISPLAY[planKey].monthlyPrice;

  const getPlanKey = (planKey) =>
    billingCycle === 'yearly'
      ? PLAN_DISPLAY[planKey].planKey.yearly
      : PLAN_DISPLAY[planKey].planKey.monthly;

  const plans = [
    {
      key: 'basic',
      name: 'Basic',
      icon: Zap,
      tagline: '5 interviews/month · 10 credits',
      color: 'blue',
      btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
      borderClass: 'border-blue-200 bg-blue-50',
    },
    {
      key: 'pro',
      name: 'Pro',
      icon: Star,
      tagline: '50 interviews/month · 100 credits',
      color: 'purple',
      btnClass: 'bg-purple-600 hover:bg-purple-700 text-white',
      borderClass: 'border-purple-200 bg-purple-50',
      popular: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 px-6 py-8 text-center text-white">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-4">
            <Clock className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Free Session Ended</h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            Your free 10-minute interview session has ended.<br />
            Upgrade to continue with full-length interviews.
          </p>
          {/* Feedback processing indicator */}
          {!feedbackReady && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-400">
              <span className="h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Generating your feedback report…
            </div>
          )}
          {feedbackReady && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-green-400">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Feedback report ready
            </div>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Billing cycle toggle */}
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

          {/* Plan options */}
          <div className="space-y-3">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <div key={plan.key} className={`rounded-xl border-2 ${plan.borderClass} p-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${plan.color === 'blue' ? 'text-blue-600' : 'text-purple-600'}`} />
                      <div>
                        <span className="font-bold text-gray-900">{plan.name}</span>
                        {plan.popular && (
                          <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                            Popular
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900">
                        {formatINR(getDisplayPrice(plan.key))}
                      </span>
                      <span className="text-xs text-gray-500">/mo</span>
                      {billingCycle === 'yearly' && (
                        <div className="text-xs text-gray-400">
                          billed {formatINR(getPrice(plan.key))}/yr
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{plan.tagline}</p>
                  <RazorpayButton
                    type="plan"
                    plan={getPlanKey(plan.key)}
                    label={`Upgrade to ${plan.name}`}
                    amount={getPrice(plan.key) * 100}
                    onSuccess={onUpgradeSuccess}
                    className={`w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${plan.btnClass}`}
                  >
                    Upgrade to {plan.name} <ArrowRight className="h-4 w-4" />
                  </RazorpayButton>
                </div>
              );
            })}
          </div>

          {/* Continue to feedback without upgrading */}
          <button
            onClick={onContinueToFeedback}
            disabled={!feedbackReady}
            className={`w-full py-2.5 text-sm transition-colors underline underline-offset-2 flex items-center justify-center gap-2 ${
              feedbackReady
                ? 'text-gray-500 hover:text-gray-700'
                : 'text-gray-300 cursor-not-allowed no-underline'
            }`}
          >
            {!feedbackReady ? (
              <>
                <span className="h-3 w-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                Preparing feedback…
              </>
            ) : (
              'Continue to feedback (limited view)'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default FreeSessionEndedModal;

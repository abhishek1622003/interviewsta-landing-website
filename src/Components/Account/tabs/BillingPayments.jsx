import React, { useState, useEffect } from 'react';
import { CreditCard, ChevronLeft, ChevronRight, Zap, Star, Check, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../../service/api';
import TransactionTable from '../components/TransactionTable';
import UpgradeModal from '../components/UpgradeModal';
import PlanBadge from '../components/PlanBadge';
import RazorpayButton from '../components/RazorpayButton';
import { PLAN_DISPLAY, formatINR, TIER_FREE, TIER_BASIC, TIER_PRO, TIER_DEV } from '../../../utils/planUtils';

const PLAN_OPTIONS = [
  {
    key: 'basic',
    name: 'Basic',
    tier: TIER_BASIC,
    icon: Zap,
    color: 'blue',
    description: '5 interviews/month',
    features: [
      '10 credits/month',
      '5 video interviews',
      '10 resume analyses',
      'Full feedback reports',
      'Email support',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    tier: TIER_PRO,
    icon: Star,
    color: 'purple',
    popular: true,
    description: '50 interviews/month',
    features: [
      '100 credits/month',
      '50 video interviews',
      '100 resume analyses',
      'Full feedback reports',
      'Priority support',
      'Advanced analytics',
    ],
  },
];

const COLOR = {
  blue:   { border: 'border-blue-200',   bg: 'bg-blue-50',   btn: 'bg-blue-600 hover:bg-blue-700 text-white',   badge: 'bg-blue-100 text-blue-700',   ring: 'ring-blue-400' },
  purple: { border: 'border-purple-200', bg: 'bg-purple-50', btn: 'bg-purple-600 hover:bg-purple-700 text-white', badge: 'bg-purple-100 text-purple-700', ring: 'ring-purple-400' },
};

const BillingPayments = ({ account, onRefresh }) => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [transactions, setTransactions]   = useState([]);
  const [txnLoading, setTxnLoading]       = useState(true);
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const fetchTransactions = async (p = 1) => {
    setTxnLoading(true);
    try {
      const { data } = await api.get(`billing/transactions/?page=${p}`);
      setTransactions(data.results || []);
      setTotalPages(Math.ceil((data.count || 0) / 10));
    } catch {
      setTransactions([]);
    } finally {
      setTxnLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(page); }, [page]);

  const handleSuccess = () => {
    onRefresh?.();
    fetchTransactions(1);
    setShowUpgradeModal(false);
  };

  const currentTier    = account?.tier ?? 0;
  const currentCycle   = account?.billing_cycle ?? 'monthly';
  const isYearly       = billingCycle === 'yearly';

  const getPlanKey = (planKey) =>
    isYearly ? PLAN_DISPLAY[planKey].planKey.yearly : PLAN_DISPLAY[planKey].planKey.monthly;

  const getPrice = (plan) =>
    isYearly ? plan.yearlyPrice : plan.monthlyPrice;

  const getCTAState = (planTier) => {
    if (currentTier === planTier) {
      if (currentCycle === 'monthly' && isYearly) return 'switch_yearly';
      return 'current';
    }
    if (currentTier > planTier) return 'downgrade';
    return 'upgrade';
  };

  return (
    <div className="space-y-8">
      {/* Current Plan Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Current Plan</h3>
          <PlanBadge tier={account?.tier_name || 'Free'} size="lg" />
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-2xl font-bold text-gray-900">{account?.total_credits ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Total Credits</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-2xl font-bold text-blue-600">
              {account?.remaining_credits === -1 ? '∞' : account?.remaining_credits ?? 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Remaining</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-2xl font-bold text-gray-900">
              {account?.interviews_equivalent === -1 ? '∞' : account?.interviews_equivalent ?? 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Interviews Left</p>
          </div>
        </div>
        {account?.month_reset_date && currentTier > TIER_FREE && currentTier < TIER_DEV && (
          <p className="text-xs text-gray-400 mt-3 text-center">
            Credits reset on the 1st of each month · Next reset: {new Date(account.month_reset_date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Billing Cycle Toggle */}
      {currentTier < TIER_DEV && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900">Available Plans</h3>
            {/* Cursor-style pill toggle */}
            <div className="relative flex items-center bg-gray-100 rounded-full p-1 gap-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  billingCycle === 'yearly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Yearly
                <span className="bg-green-100 text-green-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  Save 10%
                </span>
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {PLAN_OPTIONS.map((plan) => {
              const c       = COLOR[plan.color];
              const display = PLAN_DISPLAY[plan.key];
              const price   = getPrice(display);
              const ctaState = getCTAState(plan.tier);
              const Icon    = plan.icon;

              return (
                <motion.div
                  key={plan.key}
                  whileHover={{ y: -2 }}
                  className={`relative rounded-2xl border-2 ${c.border} ${c.bg} p-5 ${
                    plan.popular ? `ring-2 ${c.ring}` : ''
                  }`}
                >
                  {plan.popular && (
                    <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full ${c.badge}`}>
                      Most Popular
                    </span>
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 ${plan.color === 'blue' ? 'text-blue-600' : 'text-purple-600'}`} />
                        <h4 className="font-bold text-gray-900">{plan.name}</h4>
                      </div>
                      <p className="text-xs text-gray-500">{plan.description}</p>
                    </div>
                    {isYearly && (
                      <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        Save 10%
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-gray-900">
                        {formatINR(isYearly ? display.monthlyEquiv : price)}
                      </span>
                      <span className="text-sm text-gray-500">/month</span>
                    </div>
                    {isYearly && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        billed {formatINR(price)}/year
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-1.5 mb-5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {ctaState === 'current' && (
                    <button disabled className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed">
                      Current Plan
                    </button>
                  )}
                  {ctaState === 'switch_yearly' && (
                    <RazorpayButton
                      type="plan"
                      plan={getPlanKey(plan.key)}
                      label={`Switch to ${plan.name} Yearly`}
                      amount={display.yearlyPrice * 100}
                      onSuccess={handleSuccess}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${c.btn}`}
                    >
                      Switch to Yearly <ArrowRight className="h-4 w-4" />
                    </RazorpayButton>
                  )}
                  {ctaState === 'upgrade' && (
                    <RazorpayButton
                      type="plan"
                      plan={getPlanKey(plan.key)}
                      label={`Upgrade to ${plan.name}`}
                      amount={price * 100}
                      onSuccess={handleSuccess}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${c.btn}`}
                    >
                      Upgrade to {plan.name} <ArrowRight className="h-4 w-4" />
                    </RazorpayButton>
                  )}
                  {ctaState === 'downgrade' && (
                    <button disabled className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed">
                      Lower Plan
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-400" />
            Transaction History
          </h3>
        </div>

        <TransactionTable transactions={transactions} loading={txnLoading} />

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={currentTier}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default BillingPayments;

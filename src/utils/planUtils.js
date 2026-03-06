// Central feature-flag / plan utility
// Tier values mirror backend myapp/models.py constants
export const TIER_FREE  = 0;
export const TIER_BASIC = 1;
export const TIER_PRO   = 2;
export const TIER_ORG   = 3;
export const TIER_DEV   = 4;

export const TIER_NAMES = {
  [TIER_FREE]:  'Free',
  [TIER_BASIC]: 'Basic',
  [TIER_PRO]:   'Pro',
  [TIER_ORG]:   'Organisation',
  [TIER_DEV]:   'Developer',
};

// Monthly credit allocation per tier
export const TIER_CREDITS = {
  [TIER_FREE]:  0,
  [TIER_BASIC]: 10,
  [TIER_PRO]:   100,
  [TIER_ORG]:   0,
  [TIER_DEV]:   -1, // unlimited
};

// Interview equivalent (2 credits per interview)
export const CREDIT_COST_INTERVIEW = 2;
export const CREDIT_COST_RESUME    = 1;

export const getMonthlyCredits = (tier) => TIER_CREDITS[tier] ?? 0;

export const getInterviewEquivalent = (tier) =>
  tier === TIER_DEV ? Infinity : Math.floor(getMonthlyCredits(tier) / CREDIT_COST_INTERVIEW);

/** Basic+ users get full feedback */
export const canAccessFullFeedback = (tier) => tier >= TIER_BASIC;

/** Only Free tier has a 10-minute session cap */
export const hasTimeLimit = (tier) => tier === TIER_FREE;

/** Developer and Org bypass all credit/time checks */
export const hasUnlimitedAccess = (tier) => tier === TIER_DEV || tier === TIER_ORG;

export const isFreeTier  = (tier) => tier === TIER_FREE;
export const isBasicTier = (tier) => tier === TIER_BASIC;
export const isProTier   = (tier) => tier === TIER_PRO;
export const isDevTier   = (tier) => tier === TIER_DEV;

// Pricing display helpers (INR)
export const PLAN_DISPLAY = {
  free: {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyEquiv: 0,
    credits: 0,
    interviews: 0,
    planKey: null,
  },
  basic: {
    name: 'Basic',
    monthlyPrice: 599,
    yearlyPrice: 6471,
    monthlyEquiv: 539,   // ₹6,471 / 12 ≈ ₹539
    credits: 10,
    interviews: 5,
    planKey: { monthly: 'basic_monthly', yearly: 'basic_yearly' },
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 2999,
    yearlyPrice: 32388,
    monthlyEquiv: 2699,  // ₹32,388 / 12 ≈ ₹2,699
    credits: 100,
    interviews: 50,
    planKey: { monthly: 'pro_monthly', yearly: 'pro_yearly' },
  },
};

export const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

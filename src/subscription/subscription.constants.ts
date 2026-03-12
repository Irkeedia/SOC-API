// ═══════════════════════════════════════════════
// SOC — Plan / Subscription Constants
// ═══════════════════════════════════════════════

export const PLAN_LIMITS = {
  FREE: {
    maxDolls: 1,
    aiMessagesPerMonth: 3,
    wardrobeAccess: false,
    priceEur: 0,
    label: 'Free',
    description: 'Découvrez SOC gratuitement',
  },
  PREMIUM: {
    maxDolls: 5,
    aiMessagesPerMonth: 50,
    wardrobeAccess: true,
    priceEur: 5,
    label: 'Premium',
    description: 'Pour les passionnés',
  },
  ULTRA: {
    maxDolls: 15,
    aiMessagesPerMonth: 150,
    wardrobeAccess: true,
    priceEur: 10,
    label: 'Ultra',
    description: 'L\'expérience complète SOC',
  },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

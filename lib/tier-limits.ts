// lib/tier-limits.ts
// Single source of truth for subscription tier definitions and enforcement

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'unlimited'

export type TierFeature = 'ragChatHistory' | 'export'

export interface TierDefinition {
  name: string
  conversationLimit: number | null // null = unlimited
  ragQueriesPerMonth: number
  projectsAllowed: number
  projectLimit: number | null // null = unlimited
  priceMonthly: number // GBP
  priceAnnual: number  // GBP (20% discount)
  stripePriceIdMonthly?: string
  stripePriceIdAnnual?: string
  features: Record<TierFeature, boolean>
}

export const TIER_DEFINITIONS: Record<SubscriptionTier, TierDefinition> = {
  free: {
    name: 'Free',
    conversationLimit: 50,
    ragQueriesPerMonth: 0,
    projectsAllowed: 3,
    projectLimit: 3,
    priceMonthly: 0,
    priceAnnual: 0,
    features: { ragChatHistory: false, export: false },
  },
  starter: {
    name: 'Starter',
    conversationLimit: 250,
    ragQueriesPerMonth: 150,
    projectsAllowed: 10,
    projectLimit: null,
    priceMonthly: 8,
    priceAnnual: 77, // ~£6.40/mo
    stripePriceIdMonthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID,
    features: { ragChatHistory: true, export: true },
  },
  pro: {
    name: 'Pro',
    conversationLimit: 1000,
    ragQueriesPerMonth: 400,
    projectsAllowed: 25,
    projectLimit: null,
    priceMonthly: 16,
    priceAnnual: 154, // ~£12.80/mo
    stripePriceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
    features: { ragChatHistory: true, export: true },
  },
  unlimited: {
    name: 'Unlimited',
    conversationLimit: null,
    ragQueriesPerMonth: 800,
    projectsAllowed: Infinity,
    projectLimit: null,
    priceMonthly: 25,
    priceAnnual: 240, // ~£20/mo
    stripePriceIdMonthly: process.env.STRIPE_UNLIMITED_MONTHLY_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_UNLIMITED_ANNUAL_PRICE_ID,
    features: { ragChatHistory: true, export: true },
  },
}

export function getTierDefinition(tier: SubscriptionTier): TierDefinition {
  return TIER_DEFINITIONS[tier] ?? TIER_DEFINITIONS.free
}

export function getTierFromPriceId(priceId: string): SubscriptionTier | null {
  for (const [tier, def] of Object.entries(TIER_DEFINITIONS)) {
    if (def.stripePriceIdMonthly === priceId || def.stripePriceIdAnnual === priceId) {
      return tier as SubscriptionTier
    }
  }
  return null
}

/**
 * Check if a user can import more conversations based on their tier
 */
export function canImportConversation(
  tier: SubscriptionTier,
  currentConversationCount: number
): { allowed: boolean; limit: number | null; current: number } {
  const def = getTierDefinition(tier)
  const limit = def.conversationLimit

  if (limit === null) {
    return { allowed: true, limit: null, current: currentConversationCount }
  }

  return {
    allowed: currentConversationCount < limit,
    limit,
    current: currentConversationCount,
  }
}

/**
 * Format tier badge label for display
 */
export function formatTierBadge(tier: SubscriptionTier): string {
  return TIER_DEFINITIONS[tier]?.name ?? 'Free'
}

/**
 * Returns true if the user is approaching their conversation limit (80%+)
 */
export function isApproachingConversationLimit(
  tier: SubscriptionTier,
  currentCount: number
): boolean {
  const def = getTierDefinition(tier)
  if (def.conversationLimit === null) return false
  return currentCount >= def.conversationLimit * 0.8
}

/**
 * Check if a user's tier includes access to a specific feature
 */
export function canAccessFeature(
  tier: SubscriptionTier,
  feature: TierFeature
): boolean {
  return getTierDefinition(tier).features[feature] ?? false
}

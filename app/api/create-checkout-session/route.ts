// app/api/create-checkout-session/route.ts
// Creates a Stripe Checkout session for subscription plans

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getTierDefinition, type SubscriptionTier } from '@/lib/tier-limits'

export async function POST(request: Request) {
  try {
    const { tier, billingPeriod, userId } = await request.json() as {
      tier: SubscriptionTier
      billingPeriod: 'monthly' | 'annual'
      userId: string
    }

    if (!tier || !userId || !billingPeriod) {
      return NextResponse.json(
        { error: 'tier, billingPeriod, and userId are required' },
        { status: 400 }
      )
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[Checkout] STRIPE_SECRET_KEY not configured')
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

    const tierDef = getTierDefinition(tier)

    if (tierDef.priceMonthly === 0) {
      return NextResponse.json({ error: 'Free tier does not require checkout' }, { status: 400 })
    }

    const priceId = billingPeriod === 'annual'
      ? tierDef.stripePriceIdAnnual
      : tierDef.stripePriceIdMonthly

    if (!priceId) {
      console.error(`[Checkout] Missing Stripe price ID for tier=${tier} billing=${billingPeriod}`)
      return NextResponse.json(
        { error: `Stripe price not configured for ${tier} ${billingPeriod}` },
        { status: 500 }
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover' as any,
    })

    // Determine base URL
    let baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (!baseUrl) {
      const host = request.headers.get('host')
      const protocol = request.headers.get('x-forwarded-proto') || 'https'
      baseUrl = host ? `${protocol}://${host}` : 'http://localhost:3000'
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId, tier, billingPeriod },
      success_url: `${baseUrl}/settings/billing?success=true&tier=${tier}`,
      cancel_url: `${baseUrl}/settings/billing?cancelled=true`,
      subscription_data: {
        metadata: { userId, tier },
      },
    })

    console.log(`[Checkout] Session created for user=${userId} tier=${tier} billing=${billingPeriod}`)

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('[Checkout] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
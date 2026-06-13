// app/api/webhooks/stripe/route.ts
// Handles Stripe webhook events for subscription tier management

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getTierFromPriceId, type SubscriptionTier } from '@/lib/tier-limits'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Stripe webhook endpoint is accessible',
    env_check: {
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  })
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * Update user tier in Supabase based on subscription state
 */
async function setUserTier(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  tier: SubscriptionTier,
  stripeCustomerId: string,
  stripeSubscriptionId: string | null,
  periodEnd: Date | null
) {
  const { error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        id: userId,
        subscription_tier: tier,
        subscription_status: tier === 'free' ? 'active' : 'active',
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        subscription_period_end: periodEnd?.toISOString() ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

  if (error) {
    console.error(`[Webhook] Failed to update tier for user=${userId}:`, error)
    throw error
  }

  console.log(`[Webhook] ✅ Set tier=${tier} for user=${userId}`)
}

export async function POST(request: Request) {
  console.log('[Webhook] Request received')

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[Webhook] Missing Stripe environment variables')
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-10-29.clover' as any,
  })

  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
    console.log(`[Webhook] Event: ${event.type}`)
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  try {
    switch (event.type) {
      // -----------------------------------------------------------------------
      // New subscription created via checkout
      // -----------------------------------------------------------------------
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode !== 'subscription' || session.payment_status !== 'paid') break

        const { userId, tier } = session.metadata || {}
        if (!userId || !tier) {
          console.error('[Webhook] Missing metadata on checkout session:', session.metadata)
          break
        }

        // Fetch the subscription to get period end
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        const periodEndTs = (subscription as any).current_period_end
          ?? subscription.items?.data[0]?.['current_period_end']
        const periodEnd = periodEndTs ? new Date(periodEndTs * 1000) : null

        await setUserTier(
          supabase,
          userId,
          tier as SubscriptionTier,
          session.customer as string,
          session.subscription as string,
          periodEnd
        )
        break
      }

      // -----------------------------------------------------------------------
      // Subscription renewed or plan changed
      // -----------------------------------------------------------------------
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (!userId) {
          console.warn('[Webhook] No userId in subscription metadata, skipping')
          break
        }

        // Determine tier from the price ID on the subscription
        const priceId = subscription.items.data[0]?.price?.id
        const tier = priceId ? getTierFromPriceId(priceId) : null

        if (!tier) {
          console.warn(`[Webhook] Could not resolve tier from priceId=${priceId}`)
          break
        }

        const periodEndTs = (subscription as any).current_period_end
          ?? subscription.items?.data[0]?.['current_period_end']
        const periodEnd = periodEndTs ? new Date(periodEndTs * 1000) : null
        const isActive = ['active', 'trialing'].includes(subscription.status)

        if (isActive) {
          await setUserTier(supabase, userId, tier, subscription.customer as string, subscription.id, periodEnd)
        } else {
          // Subscription is paused/incomplete — downgrade to free
          await setUserTier(supabase, userId, 'free', subscription.customer as string, null, null)
        }
        break
      }

      // -----------------------------------------------------------------------
      // Subscription cancelled / expired
      // -----------------------------------------------------------------------
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (!userId) {
          console.warn('[Webhook] No userId in subscription metadata, skipping')
          break
        }

        await setUserTier(supabase, userId, 'free', subscription.customer as string, null, null)
        break
      }

      // -----------------------------------------------------------------------
      // Payment failed — optionally downgrade or flag
      // -----------------------------------------------------------------------
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.warn(`[Webhook] Payment failed for customer=${invoice.customer}`)
        // We don't immediately downgrade on first failure — Stripe will retry
        // If subscription eventually gets to 'past_due' it fires subscription.updated
        break
      }

      default:
        console.log(`[Webhook] Ignored event: ${event.type}`)
    }
  } catch (error: any) {
    console.error('[Webhook] Handler error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
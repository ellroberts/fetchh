'use client'
import React from 'react'
import { Alert } from '@/components/Alert'

interface ClaimBannerProps {
  count: number
  conversationCount?: number
  subscriptionTier?: string
  onReview: () => void
  onDismiss: () => void
  style?: React.CSSProperties
}

export function ClaimBanner({
  count,
  conversationCount = 0,
  subscriptionTier = 'free',
  onReview,
  onDismiss,
  style,
}: ClaimBannerProps) {
  if (count <= 0) return null

  const isAtLimit = conversationCount >= 10 && subscriptionTier === 'free'

  return (
    <Alert
      type="info"
      shadow="md"
      onClose={onDismiss}
      action={
        isAtLimit
          ? { label: 'Upgrade to sync', onClick: onReview }
          : { label: 'Review', onClick: onReview }
      }
      style={style}
    >
      You have {count} chat{count !== 1 ? 's' : ''} saved in your browser waiting to be added to your account
    </Alert>
  )
}

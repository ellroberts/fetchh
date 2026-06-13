'use client'
import React, { useEffect, useRef } from 'react'
import { ModalHeader } from '@/components/ModalHeader'
import { ModalFooter } from '@/components/ModalFooter'
import { Button } from '@/components/Button'

export type LearnMoreTopic = 'thread-groups' | 'highlights' | 'actions' | 'reminders'

interface TopicContent {
  title: string
  subtitle: string
  videoSrc: string
  posterSrc?: string
  mediaType?: 'video' | 'gif'
}

const CONTENT: Record<LearnMoreTopic, TopicContent> = {
  'thread-groups': {
    title: 'Thread Groups',
    subtitle: 'Organise related conversations into groups so you can find and compare them at a glance. Great for tracking ongoing topics across multiple sessions.',
    videoSrc: '/demos/thread-groups.mp4',
    posterSrc: '/demos/thread-groups-poster.jpg',
    mediaType: 'video',
  },
  'highlights': {
    title: 'Highlights',
    subtitle: 'Pin the most useful parts of any conversation — a great answer, a key insight, a snippet worth revisiting. Highlights are saved across all your threads.',
    videoSrc: '/demos/highlights.mp4',
    posterSrc: '/demos/highlights-poster.jpg',
    mediaType: 'video',
  },
  'actions': {
    title: 'Actions',
    subtitle: 'Turn conversation outputs into trackable action items. Set a title, add context, and check them off as you go — all without leaving your threads.',
    videoSrc: '/demos/actions.mp4',
    posterSrc: '/demos/actions-poster.jpg',
    mediaType: 'video',
  },
  'reminders': {
    title: 'Reminders',
    subtitle: 'Set reminders directly from your conversations so nothing slips through the cracks. Useful for follow-ups, deadlines, and anything time-sensitive.',
    videoSrc: '/demos/reminders.mp4',
    posterSrc: '/demos/reminders-poster.jpg',
    mediaType: 'video',
  },
}

interface LearnMoreModalProps {
  topic: LearnMoreTopic
  onClose: () => void
}

export function LearnMoreModal({ topic, onClose }: LearnMoreModalProps) {
  const content = CONTENT[topic]
  const videoRef = useRef<HTMLVideoElement>(null)
  const isGif = content.mediaType === 'gif'

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Auto-play when topic changes (video only)
  useEffect(() => {
    if (!isGif) {
      videoRef.current?.play().catch(() => {/* autoplay blocked — poster shows */})
    }
  }, [topic, isGif])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        backgroundColor: 'var(--color-overlay, rgba(0,0,0,0.5))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--spacing-4)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="learn-more-title"
        style={{
          backgroundColor: 'var(--color-surface-raised)',
          borderRadius: 'var(--border-radius-xl)',
          border: '1px solid var(--color-border-default)',
          width: '100%',
          maxWidth: '520px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ModalHeader
          id="learn-more-title"
          title={content.title}
          subtitle={content.subtitle}
          onClose={onClose}
          divider={false}
        />

        {/* ── Media body ── */}
        <div style={{
          position: 'relative',
          margin: 'var(--spacing-4) var(--spacing-6)',
          borderRadius: 'var(--border-radius-lg)',
          overflow: 'hidden',
          aspectRatio: '16/9',
          backgroundColor: 'var(--color-surface-subtle)',
          border: '1px solid var(--color-border-subtle)',
        }}>
          {isGif ? (
            <img
              src={content.videoSrc}
              alt={`${content.title} demo`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <video
              ref={videoRef}
              src={content.videoSrc}
              poster={content.posterSrc}
              loop
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}

          {/* Fallback label — visible only if src fails to load */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-disabled)',
            fontSize: 'var(--font-size-sm)',
            pointerEvents: 'none',
            fontFamily: 'var(--font-family-primary)',
            zIndex: -1,
          }}>
            Demo coming soon
          </div>
        </div>

        <ModalFooter>
          <Button variant="tertiary" size="sm" onClick={onClose}>Close</Button>
        </ModalFooter>
      </div>
    </div>
  )
}
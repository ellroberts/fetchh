'use client'
import React from 'react'
import { Button } from '@/components/Button'
import { ModalHeader } from '@/components/ModalHeader'
import { ModalFooter } from '@/components/ModalFooter'
import { PlatformBar } from '@/components/PlatformBar'

interface PlatformsModalProps {
  platforms: [string, number][]
  total: number
  onClose: () => void
}

export function PlatformsModal({ platforms, total, onClose }: PlatformsModalProps) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: 'var(--spacing-4)'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: 'var(--color-surface-raised)',
        borderRadius: 'var(--border-radius-xl)',
        maxWidth: 480, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        border: '1px solid var(--color-border-default)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '80vh',
      }}>
        <ModalHeader title="Platforms used" onClose={onClose} divider={true} />
        <div style={{
          overflowY: 'auto', flexGrow: 1,
          padding: 'var(--spacing-4) var(--spacing-6)',
          display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)',
        }}>
          {platforms.map(([platform, count]) => (
            <PlatformBar key={platform} platform={platform} count={count} total={total} />
          ))}
        </div>
        <ModalFooter divider={false}>
          <Button variant="tertiary" size="sm" onClick={onClose}>Close</Button>
        </ModalFooter>
      </div>
    </div>
  )
}

export default PlatformsModal
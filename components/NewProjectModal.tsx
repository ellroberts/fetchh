'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { ModalHeader } from '@/components/ModalHeader'
import { ModalFooter } from '@/components/ModalFooter'
import { Checkbox } from '@/components/Checkbox'
import { Cloud } from 'lucide-react'
import type { SubscriptionTier } from '@/lib/tier-limits'

const NEXT_TIER: Record<SubscriptionTier, SubscriptionTier | null> = {
  free: 'starter',
  starter: 'pro',
  pro: 'unlimited',
  unlimited: null,
}

const TIER_DISPLAY: Record<SubscriptionTier, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  unlimited: 'Unlimited',
}

interface Thread {
  id: string
  title: string
  platform?: string
  message_count?: number
  project_id?: string | null
  projectName?: string | null
  isClaimable?: boolean
}

interface NewProjectModalProps {
  name: string
  description: string
  onChangeName: (v: string) => void
  onChangeDescription: (v: string) => void
  onConfirm: (selectedThreadIds: string[]) => Promise<void>
  onClose: () => void
  threads?: Thread[]
  showUpgradeView?: boolean
  currentTier?: SubscriptionTier
}

function formatPlatform(platform?: string): string {
  const p = platform?.toLowerCase() ?? ''
  if (p.includes('claude') || p.includes('anthropic')) return 'Claude.ai'
  if (p.includes('chatgpt') || p.includes('openai')) return 'ChatGPT'
  if (p.includes('gemini') || p.includes('google')) return 'Gemini'
  return platform ?? 'Unknown'
}

export function NewProjectModal({
  name,
  description,
  onChangeName,
  onChangeDescription,
  onConfirm,
  onClose,
  threads = [],
  showUpgradeView = false,
  currentTier = 'free',
}: NewProjectModalProps) {
  const router = useRouter()
  const nextTier = NEXT_TIER[currentTier]
  const nextTierName = nextTier ? TIER_DISPLAY[nextTier] : null
  const hasThreads = threads.length > 0
  const [step, setStep] = useState<1 | 2>(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !confirming) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, confirming])

  const allSelected = selected.size === threads.length && threads.length > 0
  const indeterminate = selected.size > 0 && !allSelected

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(threads.map(t => t.id)))
  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const handleStep1Continue = () => {
    if (!name.trim()) return
    setStep(2)
  }

  const handleFinish = async (ids: string[]) => {
    setConfirming(true)
    try {
      await onConfirm(ids)
    } finally {
      setConfirming(false)
    }
  }

  const claimableCount = threads.filter(t => t.isClaimable).length
  const step1Title = 'New project'
  const step2Title = 'Add threads'
  const step2Subtitle = claimableCount > 0
    ? `${threads.length} thread${threads.length !== 1 ? 's' : ''} available (${claimableCount} from cloud). Selected threads will be moved into this project.`
    : `${threads.length} thread${threads.length !== 1 ? 's' : ''} available. Selected threads will be moved into this project.`

  return (
    <div onClick={() => { if (!confirming) onClose() }} style={{
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

        {/* Step indicator — only show if threads exist and not in upgrade view */}
        {hasThreads && !showUpgradeView && (
          <div style={{
            display: 'flex', gap: 6,
            padding: 'var(--spacing-5) var(--spacing-6) 0',
          }}>
            {[1, 2].map(n => (
              <div key={n} style={{
                height: 3, flex: 1, borderRadius: 99,
                backgroundColor: n <= step
                  ? 'var(--color-accent-teal)'
                  : 'var(--color-border-subtle)',
                transition: 'background-color 250ms ease',
              }} />
            ))}
          </div>
        )}

        {showUpgradeView ? (
          <>
            <ModalHeader title="New project" onClose={onClose} divider={false} />
            <div style={{
              padding: 'var(--spacing-6)',
              display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)',
              alignItems: 'flex-start',
            }}>
              <p style={{ margin: 0, fontSize: 'var(--font-size-base)', color: 'var(--color-text-title)', fontWeight: 'var(--font-weight-semibold)' }}>
                You've reached the project limit on the {TIER_DISPLAY[currentTier]} plan.
              </p>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {nextTierName
                  ? `Upgrade to ${nextTierName} for unlimited projects, plus more saved conversations and AI queries each month.`
                  : 'Contact us to discuss options for your account.'}
              </p>
            </div>
            <ModalFooter divider={false}>
              <Button variant="tertiary" size="sm" onClick={onClose}>Cancel</Button>
              {nextTierName && (
                <Button
                  variant="primary" size="sm"
                  onClick={() => { router.push('/settings/billing'); onClose() }}
                >
                  Upgrade plan
                </Button>
              )}
            </ModalFooter>
          </>
        ) : step === 1 ? (
          <>
            <ModalHeader title={step1Title} onClose={onClose} divider={false} />
            <div style={{
              padding: '0 var(--spacing-6)',
              marginTop: 'var(--spacing-4)',
              display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)',
            }}>
              <Input
                label="Name"
                placeholder="Enter a project name..."
                value={name}
                onChange={(e) => onChangeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStep1Continue()}
                autoComplete="off"
                autoFocus
              />
              <Input
                label="Description"
                placeholder="Add a brief description..."
                value={description}
                onChange={(e) => onChangeDescription(e.target.value)}
                multiline
                rows={3}
              />
            </div>
            <ModalFooter divider={false}>
              <Button variant="tertiary" size="sm" onClick={onClose}>Cancel</Button>
              <Button
                variant="primary" size="sm"
                onClick={handleStep1Continue}
                disabled={!name.trim()}
              >
                Next
              </Button>
            </ModalFooter>
          </>
        ) : (
          <>
            <ModalHeader
              title={step2Title}
              subtitle={step2Subtitle}
              onClose={onClose}
              divider={true}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-3)' }}>
                <Checkbox
                  checked={allSelected}
                  indeterminate={indeterminate}
                  onChange={toggleAll}
                  size="sm"
                />
                <span
                  onClick={toggleAll}
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  Select all
                </span>
              </div>
            </ModalHeader>

            <div style={{
              overflowY: 'auto', flexGrow: 1,
              padding: 'var(--spacing-3) var(--spacing-6)',
              display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)',
            }}>
              {threads.map(thread => {
                const isChecked = selected.has(thread.id)
                return (
                  <button
                    key={thread.id}
                    onClick={() => toggle(thread.id)}
                    style={{
                      width: '100%', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)',
                      padding: 'var(--spacing-1) var(--spacing-4)',
                      backgroundColor: thread.isClaimable
                        ? 'color-mix(in srgb, var(--color-accent-teal) 5%, transparent)'
                        : 'transparent',
                      border: '1px solid',
                      borderColor: thread.isClaimable
                        ? 'color-mix(in srgb, var(--color-accent-teal) 25%, var(--color-border-subtle))'
                        : 'var(--color-border-subtle)',
                      borderRadius: 'var(--border-radius-lg)',
                      cursor: 'pointer',
                      transition: 'border-color var(--transition-base)',
                      minHeight: 56,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = thread.isClaimable
                        ? 'var(--color-accent-teal)'
                        : 'var(--color-border-default)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = thread.isClaimable
                        ? 'color-mix(in srgb, var(--color-accent-teal) 25%, var(--color-border-subtle))'
                        : 'var(--color-border-subtle)'
                    }}
                  >
                    <Checkbox checked={isChecked} onChange={() => toggle(thread.id)} size="sm" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text-title)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {thread.title || 'Untitled thread'}
                      </div>
                      <div style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-secondary)',
                        marginTop: 2,
                        display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)',
                      }}>
                        <span>
                          {formatPlatform(thread.platform)}
                          {thread.message_count != null && <> · {thread.message_count} messages</>}
                          {thread.projectName && <> · <em>in {thread.projectName}</em></>}
                        </span>
                        {thread.isClaimable && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            color: 'var(--color-accent-teal)',
                            fontWeight: 'var(--font-weight-semibold)',
                          }}>
                            <Cloud size={10} />
                            From cloud
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <ModalFooter divider={true}>
              <Button variant="tertiary" size="sm" onClick={() => setStep(1)} disabled={confirming}>Back</Button>
              <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                <Button variant="tertiary" size="sm" onClick={() => handleFinish([])} disabled={confirming}>
                  Skip for now
                </Button>
                <Button
                  variant="primary" size="sm"
                  onClick={() => handleFinish(Array.from(selected))}
                  disabled={selected.size === 0 || confirming}
                  loading={confirming}
                >
                  {selected.size === 0 ? 'Create project' : `Add ${selected.size === threads.length ? `all ${threads.length}` : selected.size}`}
                </Button>
              </div>
            </ModalFooter>
          </>
        )}
      </div>
    </div>
  )
}
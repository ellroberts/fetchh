// components/projects/PinInsightModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Lightbulb, Flame, TriangleAlert, RotateCcw, SquarePen } from 'lucide-react'
import { Button } from '@/components/Button'
import { ModalHeader } from '@/components/ModalHeader'
import { ModalFooter } from '@/components/ModalFooter'
import { SelectableChip } from '@/components/SelectableChip'
import { InsightTag } from '@/lib/project-insight-types'

export type PinType = 'insight' | 'reminder' | 'action'

const TAG_OPTIONS: {
  value: InsightTag
  label: string
  icon: React.ComponentType<any>
}[] = [
  { value: 'note',         label: 'Note',         icon: SquarePen      },
  { value: 'breakthrough', label: 'Breakthrough',  icon: Lightbulb      },
  { value: 'ai_mistake',   label: 'Mistake',       icon: TriangleAlert  },
  { value: 'rework',       label: 'Rework',        icon: RotateCcw      },
  { value: 'friction',     label: 'Friction',      icon: Flame          },
]

const TYPE_OPTIONS: { value: PinType; label: string }[] = [
  { value: 'insight',  label: 'Insight'  },
  { value: 'reminder', label: 'Reminder' },
  { value: 'action',   label: 'Action'   },
]

export interface PinInsightModalProps {
  content: string
  projectName?: string
  projects?: { id: string; name: string }[]
  defaultProjectId?: string
  defaultType?: PinType
  onSave: (type: PinType, tag: InsightTag | null, note?: string, projectId?: string) => Promise<void>
  onCancel: () => void
}

export function PinInsightModal({
  content,
  projectName,
  projects,
  defaultProjectId,
  defaultType,
  onSave,
  onCancel,
}: PinInsightModalProps) {
  const [pinType, setPinType] = useState<PinType>(defaultType ?? 'insight')
  const [selectedTag, setSelectedTag] = useState<InsightTag | null>('note')
  const [note, setNote] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string>(defaultProjectId ?? '')
  const [saving, setSaving] = useState(false)

  const hasProjects = !!projects && projects.length > 0

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel, saving])

  const handleSave = async () => {
    if (pinType === 'insight' && !selectedTag) return
    setSaving(true)
    await onSave(pinType, pinType === 'insight' ? selectedTag : null, note.trim() || undefined, selectedProjectId || undefined)
    setSaving(false)
  }

  const subtitle = projectName
    ? `Saving to "${projectName}"`
    : hasProjects
    ? 'Choose a project'
    : undefined

  const canSave = pinType === 'insight' ? !!selectedTag : true

  return (
    <div onClick={() => { if (!saving) onCancel() }} style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: 'var(--spacing-4)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: 'var(--color-surface-raised)',
        borderRadius: 'var(--border-radius-xl)',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        border: '1px solid var(--color-border-default)',
      }}>

        <ModalHeader
          title="Pin to Project"
          subtitle={subtitle}
          onClose={onCancel}
          closeDisabled={saving}
          divider={false}
        />

        <div style={{
          padding: 'var(--spacing-2) var(--spacing-6) var(--spacing-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-5)',
        }}>

          {/* Type selector */}
          <div style={{ display: 'flex', gap: '0', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-border-default)', overflow: 'hidden', flexShrink: 0 }}>
            {TYPE_OPTIONS.map((opt, i) => (
              <button
                key={opt.value}
                onClick={() => setPinType(opt.value)}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  border: 'none',
                  borderLeft: i > 0 ? '1px solid var(--color-border-default)' : 'none',
                  backgroundColor: pinType === opt.value ? 'var(--color-primary-500)' : 'transparent',
                  color: pinType === opt.value ? '#fff' : 'var(--color-text-body)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: pinType === opt.value ? 600 : 400,
                  fontFamily: 'var(--font-family-primary)',
                  cursor: saving ? 'default' : 'pointer',
                  transition: 'background-color 150ms, color 150ms',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Project picker — only outside a project */}
          {hasProjects && (
            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-body)',
                marginBottom: 'var(--spacing-2)',
                fontFamily: 'var(--font-family-primary)',
              }}>
                Project
              </label>
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-2) var(--spacing-3)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 'var(--border-radius-md)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'var(--color-surface-raised)',
                  fontFamily: 'var(--font-family-primary)',
                  outline: 'none',
                }}
              >
                <option value="">No project</option>
                {projects!.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Note textarea */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-body)',
              marginBottom: 'var(--spacing-2)',
              fontFamily: 'var(--font-family-primary)',
            }}>
              Add a note
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add some context"
              rows={4}
              style={{
                width: '100%',
                padding: 'var(--spacing-3)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--border-radius-lg)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-body)',
                backgroundColor: 'var(--color-surface-raised)',
                fontFamily: 'var(--font-family-primary)',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
                lineHeight: 'var(--line-height-relaxed)',
              }}
            />
          </div>

          {/* Tag chips — only for Insight type */}
          {pinType === 'insight' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
              {TAG_OPTIONS.map(tag => (
                <SelectableChip
                  key={tag.value}
                  label={tag.label}
                  icon={tag.icon}
                  selected={selectedTag === tag.value}
                  onClick={() => setSelectedTag(selectedTag === tag.value ? null : tag.value)}
                  disabled={saving}
                />
              ))}
            </div>
          )}

        </div>

        <ModalFooter divider={false}>
          <Button variant="tertiary" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!canSave || saving}
            loading={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </ModalFooter>

      </div>
    </div>
  )
}

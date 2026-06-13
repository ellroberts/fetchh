'use client'
// components/TagPicker.tsx
import { useState } from 'react'
import { Plus, Check, Tag as TagIcon, Lightbulb, Flame, TriangleAlert, RotateCcw, SquarePen } from 'lucide-react'
import { SelectableChip } from '@/components/SelectableChip'
import { Input } from '@/components/Input'
import { IconButton } from '@/components/IconButton'

// ─── Preset tags ─────────────────────────────────────────────────────────────

export const PRESET_TAGS = [
  { value: 'note',         label: 'Note',         icon: SquarePen      },
  { value: 'breakthrough', label: 'Breakthrough',  icon: Lightbulb      },
  { value: 'ai_mistake',   label: 'Mistake',       icon: TriangleAlert  },
  { value: 'rework',       label: 'Rework',        icon: RotateCcw      },
  { value: 'friction',     label: 'Friction',      icon: Flame          },
]

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TagPickerProps {
  /** Custom tags from user_tags table, merged after presets */
  customTags: string[]
  /** Currently selected tag value (single-select), or null if none */
  selectedTag: string | null
  /** Called with the new value on toggle. Pass null to deselect. */
  onSelect: (tag: string | null) => void
  /**
   * Called when the user confirms a new tag name.
   * Should persist to user_tags and return the saved name, or null on failure.
   */
  onAddTag: (name: string) => Promise<string | null>
  disabled?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TagPicker({ customTags, selectedTag, onSelect, onAddTag, disabled }: TagPickerProps) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const allTags = [
    ...PRESET_TAGS,
    ...customTags.map(name => ({ value: name, label: name, icon: TagIcon })),
  ]

  const cancelAdding = () => { setAdding(false); setNewName('') }

  const handleConfirm = async () => {
    const trimmed = newName.trim()
    if (!trimmed) { cancelAdding(); return }

    // If the tag already exists (case-insensitive), just select it
    const existing = allTags.find(t => t.label.toLowerCase() === trimmed.toLowerCase())
    if (existing) {
      onSelect(existing.value)
      cancelAdding()
      return
    }

    setSaving(true)
    const saved = await onAddTag(trimmed)
    if (saved) onSelect(saved)
    setSaving(false)
    cancelAdding()
  }

  return (
    <div className="tag-picker">
      {allTags.map(tag => (
        <SelectableChip
          key={tag.value}
          label={tag.label}
          icon={tag.icon}
          selected={selectedTag === tag.value}
          onClick={() => onSelect(selectedTag === tag.value ? null : tag.value)}
          disabled={disabled || saving}
        />
      ))}

      {adding ? (
        <div className="tag-picker__add-row">
          <Input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleConfirm()
              if (e.key === 'Escape') cancelAdding()
            }}
            placeholder="Tag name"
            disabled={saving}
            style={{ width: '140px' }}
          />
          <IconButton tooltip="Add tag" size="md" onClick={handleConfirm} disabled={saving}>
            <Check size={14} />
          </IconButton>
        </div>
      ) : (
        <SelectableChip
          label="Add tag"
          icon={Plus}
          selected={false}
          onClick={() => setAdding(true)}
          disabled={disabled}
        />
      )}
    </div>
  )
}

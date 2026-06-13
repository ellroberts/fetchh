export type InsightTag = 'friction' | 'breakthrough' | 'ai_mistake' | 'rework' | 'recurring_problem' | 'note'

export const TAG_CONFIG: Record<InsightTag, { label: string; color: string; bg: string; emoji: string }> = {
  friction:          { label: 'Friction',          color: '#dc2626', bg: '#fef2f2', emoji: '🔥' },
  breakthrough:      { label: 'Breakthrough',      color: '#16a34a', bg: '#f0fdf4', emoji: '💡' },
  ai_mistake:        { label: 'AI Mistake',        color: '#d97706', bg: '#fffbeb', emoji: '⚠️' },
  rework:            { label: 'Rework',            color: '#7c3aed', bg: '#f5f3ff', emoji: '🔄' },
  recurring_problem: { label: 'Recurring Problem', color: '#dc2626', bg: '#fef2f2', emoji: '🔁' },
  note:              { label: 'Note',              color: '#0284c7', bg: '#f0f9ff', emoji: '📝' },
}
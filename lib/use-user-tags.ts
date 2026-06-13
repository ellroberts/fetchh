'use client'
// lib/use-user-tags.ts
import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'

export function useUserTags() {
  const [customTags, setCustomTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('user_tags')
        .select('name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      setCustomTags((data ?? []).map((r: { name: string }) => r.name))
      setLoading(false)
    }
    load()
  }, [])

  const addTag = async (name: string): Promise<string | null> => {
    const supabase = createSupabaseClient()
    const normalized = name.trim()
    if (!normalized) return null
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { error } = await supabase.from('user_tags').insert({
      user_id: user.id,
      name: normalized,
    })

    if (!error || error.code === '23505') {
      // Successfully inserted, or tag already exists (unique constraint)
      setCustomTags(prev => prev.includes(normalized) ? prev : [...prev, normalized])
      return normalized
    }

    console.error('Failed to save tag:', error)
    return null
  }

  return { customTags, addTag, loading }
}

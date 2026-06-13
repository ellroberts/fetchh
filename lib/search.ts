// lib/search.ts
export function filterConversations<T extends { title: string; summary?: string | null; platform?: string | null }>(
  conversations: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return conversations
  return conversations.filter(
    (c) =>
      c.title?.toLowerCase().includes(q) ||
      c.summary?.toLowerCase().includes(q) ||
      c.platform?.toLowerCase().includes(q)
  )
}
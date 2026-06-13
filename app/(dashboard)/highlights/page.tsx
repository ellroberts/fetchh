'use client'

import { useState, useEffect, useMemo } from 'react'
import { createSupabaseClient } from '../../../lib/supabase'
import { HighlightCard } from '../../../components/HighlightCard'
import { Search, Filter, Sparkles, X } from 'lucide-react'

// Retry logic for Supabase queries
const withRetry = async (operation: any, maxRetries: number = 3): Promise<any> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation()
      if (attempt > 1) console.log(`Success on retry attempt ${attempt}`)
      return result
    } catch (error: any) {
      console.warn(`Attempt ${attempt} failed:`, error.message)
      if (attempt === maxRetries) throw error
      const delay = 1000 * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('All attempts failed')
}

interface Highlight {
  id: string
  user_id: string
  conversation_id?: string
  source_url: string
  source_chat_id?: string
  source_title?: string
  source_platform: string
  highlighted_text: string
  surrounding_context?: string
  message_role?: string
  created_at: string
  updated_at: string
  tags?: string[]
  notes?: string
  is_archived: boolean
}

export default function HighlightsPage() {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')

  const supabase = createSupabaseClient()

  useEffect(() => {
    fetchHighlights()
  }, [])

  const fetchHighlights = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error('No user found')
        setError('Please sign in to view highlights')
        setLoading(false)
        return
      }

      const result = await withRetry(() =>
        supabase
          .from('highlights')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
      )

      const { data, error: fetchError } = result

      if (fetchError) {
        throw fetchError
      }

      setHighlights(data || [])
    } catch (err: any) {
      console.error('Error fetching highlights:', err)
      setError(err.message || 'Failed to load highlights')
    } finally {
      setLoading(false)
    }
  }

  // Get all unique tags from highlights
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    highlights.forEach(h => {
      if (h.tags) {
        h.tags.forEach(tag => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  }, [highlights])

  // Get all unique platforms
  const allPlatforms = useMemo(() => {
    const platformSet = new Set<string>()
    highlights.forEach(h => {
      if (h.source_platform) {
        platformSet.add(h.source_platform)
      }
    })
    return Array.from(platformSet).sort()
  }, [highlights])

  // Filter highlights based on search, tag, and platform
  const filteredHighlights = useMemo(() => {
    return highlights.filter(highlight => {
      // Search filter
      const matchesSearch = searchTerm === '' ||
        highlight.highlighted_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        highlight.source_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        highlight.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

      // Tag filter
      const matchesTag = !selectedTag ||
        (highlight.tags && highlight.tags.includes(selectedTag))

      // Platform filter
      const matchesPlatform = selectedPlatform === 'all' ||
        highlight.source_platform === selectedPlatform

      return matchesSearch && matchesTag && matchesPlatform
    })
  }, [highlights, searchTerm, selectedTag, selectedPlatform])

  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null)
    } else {
      setSelectedTag(tag)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedTag(null)
    setSelectedPlatform('all')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading highlights...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
        <div className="bg-background rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Highlights</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={fetchHighlights}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Header */}
      <div className="bg-background border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-yellow-500" />
                Your Highlights
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredHighlights.length} {filteredHighlights.length === 1 ? 'highlight' : 'highlights'}
                {selectedTag && ` tagged with #${selectedTag}`}
                {selectedPlatform !== 'all' && ` from ${selectedPlatform}`}
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 w-5 h-5" />
              <input
                type="text"
                placeholder="Search highlights..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Platform Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-muted-foreground/70" />
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-sm min-w-[150px]"
              >
                <option value="all">All Platforms</option>
                {allPlatforms.map(platform => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {(searchTerm || selectedTag || selectedPlatform !== 'all') && (
              <button
                onClick={clearFilters}
                className="px-4 py-2.5 bg-muted text-foreground/80 rounded-lg hover:bg-muted transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>

          {/* Tag Pills */}
          {allTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs font-medium text-muted-foreground flex items-center">
                Tags:
              </span>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`px-3 py-1 text-xs rounded-full border transition-all ${
                    selectedTag === tag
                      ? 'bg-blue-500 text-white border-blue-600 shadow-sm'
                      : 'bg-background text-foreground/80 border-border hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {highlights.length === 0 ? (
          // Empty State
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-12 h-12 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">No highlights yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start highlighting interesting parts of your AI conversations using the ThreadCub Chrome extension.
              They'll appear here!
            </p>
            <a
              href="https://chrome.google.com/webstore"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Get Chrome Extension
            </a>
          </div>
        ) : filteredHighlights.length === 0 ? (
          // No Results State
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-muted-foreground/70" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">No highlights found</h2>
            <p className="text-muted-foreground mb-6">
              Try adjusting your search or filters to find what you're looking for.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          // Masonry Grid Layout
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
            {filteredHighlights.map((highlight) => (
              <div key={highlight.id} className="break-inside-avoid">
                <HighlightCard
                  id={highlight.id}
                  highlightedText={highlight.highlighted_text}
                  tags={highlight.tags}
                  sourcePlatform={highlight.source_platform}
                  sourceUrl={highlight.source_url}
                  sourceTitle={highlight.source_title}
                  createdAt={highlight.created_at}
                  onClick={() => {
                    // Could open a modal or navigate to the conversation
                    window.open(highlight.source_url, '_blank')
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// lib/storyline-types.ts
// Type definitions for the ThreadCub Storyline feature.
// Covers DB shape, service layer, API contracts, and UI state.

// ============================================================================
// NODE TYPES
// ============================================================================

/**
 * The category of a story node.
 * Claude is instructed to assign one of these per node.
 * 'general' is the safe fallback — Claude should never leave type undefined.
 */
export type StoryNodeType =
  | 'idea'         // A new concept or direction introduced
  | 'decision'     // A concrete choice was made
  | 'blocker'      // A problem, obstacle, or dead end encountered
  | 'milestone'    // Something completed, shipped, or resolved
  | 'insight'      // A realisation, learning, or breakthrough
  | 'shift'        // A significant change in direction or thinking
  | 'exploration'  // A research or investigation phase
  | 'general'      // Fallback for developments that don't fit above

export type StoryNodeImportance = 'low' | 'medium' | 'high'

/**
 * A single node in the project storyline timeline.
 * Stored as an element within project_storylines.story_nodes (JSONB array).
 */
export interface StoryNode {
  // Identity
  id: string                        // Stable UUID — persists across incremental updates

  // Classification
  type: StoryNodeType
  importance: StoryNodeImportance   // Used to visually weight nodes in the timeline

  // Content
  title: string                     // Short label — 3–6 words
  summary: string                   // 1–2 sentence explanation of what happened

  // Relationships
  related_thread_ids: string[]      // Conversation UUIDs this node was derived from
  parent_node_id: string | null     // Causal parent — which node this branches from
  resolved_by_node_id: string | null // Only on blocker/exploration/shift — which node closed this
  phase: 'discovery' | 'architecture' | 'build' | 'iteration' | 'launch' | null

  // Ordering — explicit field, not inferred from array position.
  // Allows re-ordering without mutating the array structure.
  order: number

  // Temporal
  timestamp: string                 // ISO date string — when this development occurred
                                    // Derived from thread created_at, not generation time

  // Extensibility
  tags: string[]                    // Free-form, for future filtering/search
  metadata: Record<string, unknown> // Escape hatch for node-type-specific data
}

// ============================================================================
// DATABASE TYPES
// ============================================================================

export type StorylineStatus =
  | 'pending'     // Row exists, job scheduled, no generation started yet
  | 'processing'  // Lock acquired, Claude call in flight
  | 'ready'       // Generation succeeded, story_nodes populated
  | 'failed'      // Generation failed after max retries
  | 'stale'       // Ready but a new thread mutation has fired — update pending

/**
 * Full DB row shape for project_storylines.
 */
export interface ProjectStoryline {
  // Identity
  id: string
  project_id: string
  user_id: string

  // Content
  story_nodes: StoryNode[]

  // Status
  status: StorylineStatus
  thread_count_at_generation: number
  last_updated: string | null
  retry_count: number
  error_message: string | null

  // Idempotency / debounce
  job_id: string | null
  job_scheduled_at: string | null
  job_started_at: string | null

  // AI / cost metadata
  prompt_version: string | null
  model: string | null
  tokens_used: number | null
  generation_time_ms: number | null

  // Row timestamps
  created_at: string
  updated_at: string
}

// ============================================================================
// SERVICE LAYER TYPES
// ============================================================================

/**
 * What triggered a storyline update.
 * Passed to the service so it can be logged and used
 * to decide between incremental vs full regeneration.
 */
export type StorylineTriggerAction =
  | 'thread_added'
  | 'thread_removed'
  | 'thread_moved'      // Thread moved from another project into this one
  | 'thread_deleted'
  | 'manual_regenerate' // User explicitly clicked "Regenerate"
  | 'backfill'          // On-demand backfill when Storyline tab opened with no storyline

export interface StorylineTriggerPayload {
  projectId: string
  userId: string
  action: StorylineTriggerAction
  previousProjectId?: string  // Present when action = 'thread_moved', triggers update on old project too
}

/**
 * Result returned by generateProjectStoryline / updateProjectStoryline.
 */
export interface StorylineGenerationResult {
  success: boolean
  nodes?: StoryNode[]
  tokensUsed?: number
  generationTimeMs?: number
  error?: string
  skipped?: boolean   // True if lock was not acquired (another job running)
  skippedReason?: 'lock_not_acquired' | 'debounce_delay' | 'cooldown_active'
}

/**
 * Input passed to the Claude prompt builder.
 */
export interface StorylinePromptInput {
  projectName: string
  threads: StorylineThreadSummary[]
  existingNodes: StoryNode[]   // Empty array for full regen, populated for incremental
  isIncremental: boolean
}

/**
 * Lightweight thread summary sent to Claude.
 * We summarise rather than send full content to control token cost.
 */
export interface StorylineThreadSummary {
  id: string
  title: string
  summary: string | null    // quick_summary.overview if available
  created_at: string
  message_count: number
}

// ============================================================================
// API TYPES
// ============================================================================

/**
 * GET /api/storyline/[projectId]
 */
export interface GetStorylineResponse {
  storyline: ProjectStoryline | null   // null = no row exists yet
  threadCount: number                  // Current thread count in the project
}

/**
 * POST /api/storyline/[projectId]
 * Body shape for triggering an update.
 */
export interface TriggerStorylineRequest {
  action: StorylineTriggerAction
  previousProjectId?: string
}

export interface TriggerStorylineResponse {
  scheduled: boolean
  jobId: string | null
  status: StorylineStatus
}

/**
 * POST /api/storyline/[projectId]/regenerate
 */
export interface RegenerateStorylineResponse {
  started: boolean
  reason?: 'cooldown_active' | 'already_processing'
  cooldownRemainingSeconds?: number
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface StorylineViewState {
  storyline: ProjectStoryline | null
  threadCount: number
  isLoading: boolean
  error: string | null
  expandedNodeIds: Set<string>
}

/**
 * Derived display status — maps DB status to what the UI should show.
 */
export type StorylineDisplayState =
  | 'empty'       // No storyline row exists and no threads in project
  | 'generating'  // pending / processing / stale with no existing nodes
  | 'updating'    // stale with existing nodes — show timeline + spinner
  | 'ready'       // ready — show timeline
  | 'failed'      // failed — show error + regenerate button

export function deriveDisplayState(
  storyline: ProjectStoryline | null,
  threadCount: number
): StorylineDisplayState {
  if (!storyline) {
    return threadCount === 0 ? 'empty' : 'generating'
  }

  if (storyline.status === 'failed') return 'failed'

  if (storyline.status === 'ready') {
    return 'ready'
  }

  if (storyline.status === 'stale') {
    return storyline.story_nodes.length > 0 ? 'updating' : 'generating'
  }

  // pending / processing
  return storyline.story_nodes.length > 0 ? 'updating' : 'generating'
}

// ============================================================================
// PROMPT CONSTANTS
// ============================================================================

export const STORYLINE_PROMPT_VERSION = 'storyline-v1.0'
export const STORYLINE_MODEL = 'claude-sonnet-4-20250514'
export const STORYLINE_MAX_INPUT_TOKENS_INCREMENTAL = 3000
export const STORYLINE_MAX_INPUT_TOKENS_FULL = 8000
export const STORYLINE_MAX_OUTPUT_TOKENS = 3000
export const STORYLINE_DEBOUNCE_SECONDS = 5
export const STORYLINE_REGEN_COOLDOWN_MINUTES = 10
export const STORYLINE_MAX_RETRIES = 3
export const STORYLINE_DRIFT_THRESHOLD = 0.2  // Trigger full regen if thread count drifts >20%

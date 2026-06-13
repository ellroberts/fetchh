// lib/storyline-service.ts
// Core service for generating and updating project storylines.
//
// Architecture:
//   scheduleStorylineUpdate  — called by the trigger API, lightweight, just debounces + UPSERTs
//   runStorylineJob          — the actual worker: lock → fetch → prompt → Claude → write
//   updateProjectStoryline   — incremental entry point (default path)
//   generateProjectStoryline — full regeneration entry point
//
// Both entry points call runStorylineJob internally.
// The service uses a service role Supabase client (same pattern as embed-conversation.ts)
// so it can write results without being blocked by RLS.
// Ownership is verified by the API layer before this service is invoked.

import { createClient } from '@supabase/supabase-js'
import {
  StoryNode,
  StoryNodeType,
  StorylineGenerationResult,
  StorylinePromptInput,
  StorylineThreadSummary,
  StorylineTriggerAction,
  STORYLINE_PROMPT_VERSION,
  STORYLINE_MODEL,
  STORYLINE_MAX_INPUT_TOKENS_INCREMENTAL,
  STORYLINE_MAX_INPUT_TOKENS_FULL,
  STORYLINE_MAX_OUTPUT_TOKENS,
  STORYLINE_DEBOUNCE_SECONDS,
  STORYLINE_REGEN_COOLDOWN_MINUTES,
  STORYLINE_MAX_RETRIES,
  STORYLINE_DRIFT_THRESHOLD,
} from './storyline-types'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

// ── Supabase service role client (bypasses RLS for writes) ────────────────────

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ============================================================================
// PUBLIC: SCHEDULE (called by trigger API — fast, fire-and-forget safe)
// ============================================================================

/**
 * Schedule a storyline update for a project.
 * Creates the row if it doesn't exist (status=pending).
 * Updates job_id + job_scheduled_at if a row already exists (collapsing rapid triggers).
 * Returns the new job_id so the caller can pass it to the worker.
 */
export async function scheduleStorylineUpdate(
  projectId: string,
  userId: string
): Promise<string> {
  const supabase = getServiceClient()
  const jobId = crypto.randomUUID()

  const { error } = await supabase.rpc('schedule_storyline_update', {
    p_project_id: projectId,
    p_user_id: userId,
    p_job_id: jobId,
    p_delay_seconds: STORYLINE_DEBOUNCE_SECONDS,
  })

  if (error) {
    console.error(`❌ Failed to schedule storyline update for project ${projectId}:`, error)
    throw new Error(`Failed to schedule storyline update: ${error.message}`)
  }

  console.log(`📅 Storyline update scheduled for project ${projectId}, job ${jobId}`)
  return jobId
}

// ============================================================================
// PUBLIC: ENTRY POINTS
// ============================================================================

/**
 * Incremental update — default path for thread mutations.
 * Detects if drift threshold is exceeded and falls back to full regen.
 */
export async function updateProjectStoryline(
  projectId: string,
  userId: string,
  jobId: string
): Promise<StorylineGenerationResult> {
  return runStorylineJob(projectId, userId, jobId, false)
}

/**
 * Full regeneration — called explicitly (user action, prompt version change, recovery).
 * Checks cooldown before proceeding.
 */
export async function generateProjectStoryline(
  projectId: string,
  userId: string,
  jobId: string
): Promise<StorylineGenerationResult> {
  const supabase = getServiceClient()

  // Cooldown check — prevent hammering Claude on full regens
  const { data: existing } = await supabase
    .from('project_storylines')
    .select('last_updated, status')
    .eq('project_id', projectId)
    .single()

  if (existing?.last_updated && existing.status !== 'failed') {
    const lastUpdated = new Date(existing.last_updated)
    const cooldownMs = STORYLINE_REGEN_COOLDOWN_MINUTES * 60 * 1000
    const elapsed = Date.now() - lastUpdated.getTime()

    if (elapsed < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - elapsed) / 1000)
      console.log(`⏳ Regen cooldown active for project ${projectId}, ${remainingSeconds}s remaining`)
      return {
        success: false,
        skipped: true,
        skippedReason: 'cooldown_active',
      }
    }
  }

  return runStorylineJob(projectId, userId, jobId, true)
}

// ============================================================================
// CORE WORKER
// ============================================================================

/**
 * The actual generation worker. Called by both updateProjectStoryline
 * and generateProjectStoryline.
 *
 * Flow:
 *   1. Acquire DB lock (atomic UPDATE — prevents race conditions)
 *   2. Fetch project name + threads
 *   3. Decide incremental vs full regen based on drift
 *   4. Build prompt
 *   5. Call Claude
 *   6. Parse response → StoryNode[]
 *   7. Write results back to DB
 *   8. On failure: write error, increment retry_count
 */
async function runStorylineJob(
  projectId: string,
  userId: string,
  jobId: string,
  forceFullRegen: boolean
): Promise<StorylineGenerationResult> {
  const supabase = getServiceClient()
  const startTime = Date.now()

  // ── Step 1: Acquire lock ────────────────────────────────────────────────────

  const { data: lockAcquired, error: lockError } = await supabase.rpc(
    'acquire_storyline_lock',
    {
      p_project_id: projectId,
      p_job_id: jobId,
      p_user_id: userId,
    }
  )

  if (lockError) {
    console.error(`❌ Lock acquisition error for project ${projectId}:`, lockError)
    return { success: false, error: lockError.message }
  }

  if (!lockAcquired) {
    console.log(`⏭️  Lock not acquired for project ${projectId} job ${jobId} — skipping`)
    return { success: false, skipped: true, skippedReason: 'lock_not_acquired' }
  }

  console.log(`🔒 Lock acquired for project ${projectId}`)

  try {
    // ── Step 2: Fetch project and threads ─────────────────────────────────────

    const [projectRes, threadsRes, storylineRes] = await Promise.all([
      supabase.from('projects').select('name').eq('id', projectId).single(),
      supabase
        .from('conversations')
        .select('id, title, summary, quick_summary, created_at, message_count')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true }),
      supabase
        .from('project_storylines')
        .select('story_nodes, thread_count_at_generation, retry_count')
        .eq('project_id', projectId)
        .single(),
    ])

    if (projectRes.error || !projectRes.data) {
      throw new Error(`Project not found: ${projectId}`)
    }

    const projectName = projectRes.data.name
    const threads: StorylineThreadSummary[] = (threadsRes.data || []).map((t: any) => ({
      id: t.id,
      title: t.title || 'Untitled',
      summary: t.quick_summary?.overview || t.summary || null,
      created_at: t.created_at,
      message_count: t.message_count || 0,
    }))

    if (threads.length === 0) {
      // Nothing to generate — mark as ready with empty nodes
      await supabase
        .from('project_storylines')
        .update({
          status: 'ready',
          story_nodes: [],
          thread_count_at_generation: 0,
          last_updated: new Date().toISOString(),
          error_message: null,
        })
        .eq('project_id', projectId)

      return { success: true, nodes: [], tokensUsed: 0, generationTimeMs: 0 }
    }

    const existingNodes: StoryNode[] = storylineRes.data?.story_nodes || []
    const threadCountAtLastGen = storylineRes.data?.thread_count_at_generation || 0
    const currentRetryCount = storylineRes.data?.retry_count || 0

    // ── Step 3: Decide incremental vs full regen ──────────────────────────────

    const drift = threadCountAtLastGen > 0
      ? Math.abs(threads.length - threadCountAtLastGen) / threadCountAtLastGen
      : 1 // No prior generation = treat as 100% drift → full regen

    const useFullRegen =
      forceFullRegen ||
      existingNodes.length === 0 ||
      drift > STORYLINE_DRIFT_THRESHOLD

    console.log(
      `📊 Project ${projectId}: ${threads.length} threads, ${existingNodes.length} existing nodes, ` +
      `drift ${(drift * 100).toFixed(0)}%, mode: ${useFullRegen ? 'full regen' : 'incremental'}`
    )

    // ── Step 4: Build prompt ──────────────────────────────────────────────────

    const maxInputTokens = useFullRegen
      ? STORYLINE_MAX_INPUT_TOKENS_FULL
      : STORYLINE_MAX_INPUT_TOKENS_INCREMENTAL

    const promptInput: StorylinePromptInput = {
      projectName,
      threads: trimThreadsToTokenBudget(threads, maxInputTokens),
      existingNodes: useFullRegen ? [] : existingNodes,
      isIncremental: !useFullRegen,
    }

    const prompt = buildStorylinePrompt(promptInput)

    // ── Step 5: Call Claude ───────────────────────────────────────────────────

    const claudeResponse = await callClaude(prompt)

    // ── Step 6: Parse response ────────────────────────────────────────────────

    const nodes = parseStorylineResponse(claudeResponse.content, useFullRegen ? [] : existingNodes)

    const generationTimeMs = Date.now() - startTime

    // ── Step 7: Write results ─────────────────────────────────────────────────

    // Verify job_id still matches before writing — a newer job may have
    // been scheduled while Claude was processing. If so, discard our result.
    const { data: currentRow } = await supabase
      .from('project_storylines')
      .select('job_id')
      .eq('project_id', projectId)
      .single()

    if (currentRow?.job_id !== jobId) {
      console.log(`⏭️  Job ${jobId} superseded by ${currentRow?.job_id} — discarding result`)
      return { success: false, skipped: true, skippedReason: 'lock_not_acquired' }
    }

    await supabase
      .from('project_storylines')
      .update({
        status: 'ready',
        story_nodes: nodes,
        thread_count_at_generation: threads.length,
        last_updated: new Date().toISOString(),
        retry_count: 0,
        error_message: null,
        prompt_version: STORYLINE_PROMPT_VERSION,
        model: STORYLINE_MODEL,
        tokens_used: claudeResponse.tokensUsed,
        generation_time_ms: generationTimeMs,
      })
      .eq('project_id', projectId)

    console.log(`✅ Storyline generated for project ${projectId}: ${nodes.length} nodes, ${claudeResponse.tokensUsed} tokens, ${generationTimeMs}ms`)

    return {
      success: true,
      nodes,
      tokensUsed: claudeResponse.tokensUsed,
      generationTimeMs,
    }
  } catch (err: any) {
    console.error(`❌ Storyline generation failed for project ${projectId}:`, err)

    // ── Step 8: Write failure — preserve existing story_nodes ─────────────────

    const { data: currentRow } = await supabase
      .from('project_storylines')
      .select('retry_count, story_nodes')
      .eq('project_id', projectId)
      .single()

    const newRetryCount = (currentRow?.retry_count || 0) + 1
    const hasExistingNodes = (currentRow?.story_nodes || []).length > 0

    await supabase
      .from('project_storylines')
      .update({
        // If we have existing nodes, go back to 'stale' so UI still renders them
        // rather than showing a failed state on a previously working storyline
        status: hasExistingNodes && newRetryCount < STORYLINE_MAX_RETRIES ? 'stale' : 'failed',
        retry_count: newRetryCount,
        error_message: err.message || 'Unknown error',
        // Do NOT overwrite story_nodes — preserve last good state
      })
      .eq('project_id', projectId)

    return {
      success: false,
      error: err.message || 'Unknown error',
    }
  }
}

// ============================================================================
// PROMPT BUILDER
// ============================================================================

function buildStorylinePrompt(input: StorylinePromptInput): string {
  const { projectName, threads, existingNodes, isIncremental } = input

  const threadList = threads
    .map((t, i) =>
      [
        `Thread ID: ${t.id}\n  Title: "${t.title}"`,
        `  Date: ${new Date(t.created_at).toLocaleDateString('en-GB')}`,
        `  Messages: ${t.message_count}`,
        t.summary ? `  Summary: ${t.summary}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n\n')

  const existingNodesSection = isIncremental && existingNodes.length > 0
    ? `\n\nEXISTING STORYLINE NODES (do not remove or rewrite these, only add/merge):\n${JSON.stringify(existingNodes, null, 2)}`
    : ''

  const taskDescription = isIncremental
    ? `You are updating an existing project storyline with new threads.
Your task is to:
- Review the existing nodes
- Identify any new developments from the new threads
- Add new nodes for genuinely new developments
- Merge new threads into existing nodes where relevant
- Do NOT rewrite, reorder, or remove existing nodes
- Only return nodes that are new or updated`
    : `You are analysing a collection of AI conversations belonging to a single project.
Your task is to produce a structured storyline of how the project evolved over time.`

  return `${taskDescription}

PROJECT NAME: ${projectName}

THREADS:
${threadList}
${existingNodesSection}

Identify key developments such as:
- New ideas or concepts introduced
- Decisions made
- Blockers or problems encountered
- Milestones reached (something completed or shipped)
- Insights or breakthroughs
- Significant shifts in direction
- Research or exploration phases

Return a JSON array of story nodes. Each node must follow this exact structure:
{
  "id": "node_<uuid>",
  "type": one of: "idea" | "decision" | "blocker" | "milestone" | "insight" | "shift" | "exploration" | "general",
  "importance": one of: "low" | "medium" | "high",
  "title": "Short label, 3-6 words",
  "summary": "1-2 sentence explanation of what happened and why it matters.",
  "related_thread_ids": ["<thread id>", ...],
  "parent_node_id": "<id of the node this causally branches from, or null>",
  "resolved_by_node_id": "<id of node that closed this open loop, or null — only for blocker/exploration/shift>",
  "phase": "discovery" | "architecture" | "build" | "iteration" | "launch" | null,
  "order": <integer starting from 1>,
  "timestamp": "<ISO date string from the most relevant thread>",
  "tags": [],
  "metadata": {}
}

Rules:
- Be concise. 4-8 nodes is ideal. Maximum 12.
- Order nodes chronologically by when they occurred.
- Assign order as sequential integers starting from 1.
- Avoid duplicates. Merge similar developments into one node.
- Do not invent developments not supported by the threads.
- Always assign a type — use "general" if unsure.
- Assign parent_node_id when a node is a direct causal consequence of an earlier node (not just the next in sequence). Branching represents cause, not time — chronological order is preserved by the order field.
- Assign resolved_by_node_id only on blocker, exploration, or shift nodes, and only when a later node clearly closes them.
- Assign phase to group nodes into named chapters. Use consistent phase names within a project.
- Return ONLY the JSON array. No preamble, no markdown, no explanation.`
}

// ============================================================================
// CLAUDE API CALL
// ============================================================================

async function callClaude(prompt: string): Promise<{
  content: string
  tokensUsed: number
}> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: STORYLINE_MODEL,
      max_tokens: STORYLINE_MAX_OUTPUT_TOKENS,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Claude API error ${response.status}: ${body}`)
  }

  const data = await response.json()

  const content = data.content
    ?.filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('') || ''

  const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)

  return { content, tokensUsed }
}

// ============================================================================
// RESPONSE PARSER
// ============================================================================

/**
 * Parse Claude's JSON response into StoryNode[].
 * Strips markdown fences, validates required fields,
 * fills safe defaults for anything missing.
 */
function parseStorylineResponse(
  rawContent: string,
  existingNodes: StoryNode[]
): StoryNode[] {
  // Strip markdown code fences if present
  const cleaned = rawContent
    .replace(/```(?:json)?/gi, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  let parsed: any[]

  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    console.error('❌ Failed to parse storyline JSON:', err)
    console.error('Raw content:', rawContent.substring(0, 500))
    throw new Error('Claude returned invalid JSON for storyline nodes')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Claude response was not a JSON array')
  }

  const validTypes: StoryNodeType[] = [
    'idea', 'decision', 'blocker', 'milestone',
    'insight', 'shift', 'exploration', 'general',
  ]

  const existingIds = new Set(existingNodes.map(n => n.id))
  const existingMaxOrder = existingNodes.length > 0
    ? Math.max(...existingNodes.map(n => n.order))
    : 0

  const newNodes: StoryNode[] = parsed.map((node: any, index: number) => ({
    id: typeof node.id === 'string' && node.id.length > 0
      ? node.id
      : `node_${crypto.randomUUID()}`,
    type: validTypes.includes(node.type) ? node.type : 'general',
    importance: ['low', 'medium', 'high'].includes(node.importance)
      ? node.importance
      : 'medium',
    title: typeof node.title === 'string' ? node.title.trim() : 'Untitled',
    summary: typeof node.summary === 'string' ? node.summary.trim() : '',
    related_thread_ids: Array.isArray(node.related_thread_ids)
      ? node.related_thread_ids.filter((id: any) => typeof id === 'string')
      : [],
    parent_node_id: node.parent_node_id || null,
    resolved_by_node_id: typeof node.resolved_by_node_id === 'string' && node.resolved_by_node_id.length > 0 ? node.resolved_by_node_id : null,
    phase: ['discovery', 'architecture', 'build', 'iteration', 'launch'].includes(node.phase) ? node.phase : null,
    order: typeof node.order === 'number'
      ? existingMaxOrder + node.order  // Offset so new nodes sort after existing
      : existingMaxOrder + index + 1,
    timestamp: typeof node.timestamp === 'string'
      ? node.timestamp
      : new Date().toISOString(),
    tags: Array.isArray(node.tags) ? node.tags : [],
    metadata: typeof node.metadata === 'object' && node.metadata !== null
      ? node.metadata
      : {},
  }))

  // Merge: existing nodes + new nodes that don't duplicate existing IDs
  const deduped = newNodes.filter(n => !existingIds.has(n.id))

  const merged = [...existingNodes, ...deduped].sort((a, b) => a.order - b.order)

  console.log(
    `📖 Parsed ${newNodes.length} nodes from Claude, ` +
    `${deduped.length} new after dedup, ` +
    `${merged.length} total after merge with existing`
  )

  return merged
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Trim thread list to fit within token budget.
 * Estimates ~50 tokens per thread (title + summary + metadata).
 * Prefers keeping recent threads and threads with summaries.
 */
function trimThreadsToTokenBudget(
  threads: StorylineThreadSummary[],
  maxTokens: number
): StorylineThreadSummary[] {
  const ESTIMATED_TOKENS_PER_THREAD = 80
  const maxThreads = Math.floor(maxTokens / ESTIMATED_TOKENS_PER_THREAD)

  if (threads.length <= maxThreads) return threads

  console.warn(
    `⚠️  Thread count (${threads.length}) exceeds token budget. ` +
    `Sampling to ${maxThreads} threads.`
  )

  // Keep first 20% (project origins), last 40% (recent work), sample middle
  const keepFirst = Math.ceil(maxThreads * 0.2)
  const keepLast = Math.ceil(maxThreads * 0.4)
  const keepMiddle = maxThreads - keepFirst - keepLast

  const first = threads.slice(0, keepFirst)
  const last = threads.slice(-keepLast)
  const middleThreads = threads.slice(keepFirst, threads.length - keepLast)
  const middleStep = Math.max(1, Math.floor(middleThreads.length / keepMiddle))
  const middle = middleThreads.filter((_, i) => i % middleStep === 0).slice(0, keepMiddle)

  return [...first, ...middle, ...last]
}

/**
 * Check if the existing storyline has drifted enough to warrant a full regen.
 * Used externally by the API route if needed.
 */
export function shouldForceFullRegen(
  currentThreadCount: number,
  threadCountAtGeneration: number
): boolean {
  if (threadCountAtGeneration === 0) return true
  const drift = Math.abs(currentThreadCount - threadCountAtGeneration) / threadCountAtGeneration
  return drift > STORYLINE_DRIFT_THRESHOLD
}

// app/api/storyline/[projectId]/regenerate/route.ts
// POST — trigger a full storyline regeneration.
// Checks cooldown before proceeding.
// Same fire-and-forget pattern as the main trigger route.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  scheduleStorylineUpdate,
  generateProjectStoryline,
} from '../../../../../lib/storyline-service'
import {
  RegenerateStorylineResponse,
  STORYLINE_REGEN_COOLDOWN_MINUTES,
} from '../../../../../lib/storyline-types'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthenticatedUser(request: NextRequest) {
  const supabase = getServiceClient()
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

async function verifyProjectOwnership(
  projectId: string,
  userId: string
): Promise<boolean> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()
  if (error || !data) return false
  return true
}

// ============================================================================
// POST /api/storyline/[projectId]/regenerate
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params

    const isOwner = await verifyProjectOwnership(projectId, user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const supabase = getServiceClient()

    // Check cooldown and current status
    const { data: existing } = await supabase
      .from('project_storylines')
      .select('status, last_updated')
      .eq('project_id', projectId)
      .single()

    // Block if already processing
    if (existing?.status === 'processing') {
      const response: RegenerateStorylineResponse = {
        started: false,
        reason: 'already_processing',
      }
      return NextResponse.json(response, { status: 409 })
    }

    // Cooldown check — only applies to non-failed storylines
    // (failed storylines can always be regenerated immediately)
    if (existing?.last_updated && existing.status !== 'failed') {
      const lastUpdated = new Date(existing.last_updated)
      const cooldownMs = STORYLINE_REGEN_COOLDOWN_MINUTES * 60 * 1000
      const elapsed = Date.now() - lastUpdated.getTime()

      if (elapsed < cooldownMs) {
        const cooldownRemainingSeconds = Math.ceil((cooldownMs - elapsed) / 1000)
        const response: RegenerateStorylineResponse = {
          started: false,
          reason: 'cooldown_active',
          cooldownRemainingSeconds,
        }
        return NextResponse.json(response, { status: 429 })
      }
    }

    console.log(`🔄 Full regen triggered: project=${projectId}`)

    // Schedule with no debounce delay for manual regen (user explicitly asked)
    const jobId = await scheduleStorylineUpdate(projectId, user.id)

    // Fire-and-forget full regen
    generateProjectStoryline(projectId, user.id, jobId).catch(err => {
      console.error(`❌ Full regen failed for project ${projectId}:`, err)
    })

    const response: RegenerateStorylineResponse = { started: true }
    return NextResponse.json(response, { status: 202 })
  } catch (err: any) {
    console.error('POST /api/storyline/regenerate error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to start regeneration' },
      { status: 500 }
    )
  }
}
// app/api/storyline/[projectId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  scheduleStorylineUpdate,
  updateProjectStoryline,
} from '../../../../lib/storyline-service'
import {
  TriggerStorylineRequest,
  TriggerStorylineResponse,
  GetStorylineResponse,
} from '../../../../lib/storyline-types'

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

async function verifyProjectOwnership(projectId: string, userId: string): Promise<boolean> {
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { projectId } = await params

    const isOwner = await verifyProjectOwnership(projectId, user.id)
    if (!isOwner) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const supabase = getServiceClient()

    const [storylineRes, threadCountRes] = await Promise.all([
      supabase.from('project_storylines').select('*').eq('project_id', projectId).eq('user_id', user.id).single(),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    ])

    const storyline = storylineRes.error?.code === 'PGRST116'
      ? null
      : storylineRes.error
        ? (() => { throw new Error(storylineRes.error.message) })()
        : storylineRes.data

    const threadCount = threadCountRes.count || 0

    const response: GetStorylineResponse = { storyline, threadCount }
    return NextResponse.json(response)
  } catch (err: any) {
    console.error('GET /api/storyline error:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch storyline' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { projectId } = await params

    const isOwner = await verifyProjectOwnership(projectId, user.id)
    if (!isOwner) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let body: TriggerStorylineRequest = { action: 'thread_added' }
    try { body = await request.json() } catch { /* no body is fine */ }

    console.log(`📡 Storyline trigger: project=${projectId} action=${body.action}`)

    const jobId = await scheduleStorylineUpdate(projectId, user.id)

    // Delay by debounce window + small buffer so acquire_storyline_lock succeeds
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    delay(6000).then(() =>
      updateProjectStoryline(projectId, user.id, jobId)
    ).catch(err => {
      console.error(`❌ Background storyline job failed for project ${projectId}:`, err)
    })

    if (body.action === 'thread_moved' && body.previousProjectId) {
      scheduleStorylineUpdate(body.previousProjectId, user.id)
        .then(prevJobId => delay(6000).then(() => updateProjectStoryline(body.previousProjectId!, user.id, prevJobId)))
        .catch(err => console.error(`❌ Background storyline job failed for previous project:`, err))
    }

    const supabase = getServiceClient()
    const { data: storyline } = await supabase
      .from('project_storylines').select('status').eq('project_id', projectId).single()

    const response: TriggerStorylineResponse = {
      scheduled: true,
      jobId,
      status: storyline?.status || 'pending',
    }

    return NextResponse.json(response, { status: 202 })
  } catch (err: any) {
    console.error('POST /api/storyline error:', err)
    return NextResponse.json({ error: err.message || 'Failed to trigger storyline update' }, { status: 500 })
  }
}
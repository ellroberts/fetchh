import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
// Notion via Replit connector — handles OAuth token refresh automatically
import { ReplitConnectors } from '@replit/connectors-sdk'

// App Backlog database ID (discovered via /v1/search)
const NOTION_DB_ID = '302d4e28-09d5-8018-811d-de83495bc662'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function notionRequest(path: string, method: string, body?: object) {
  const connectors = new ReplitConnectors()
  const res = await connectors.proxy('notion', path, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await res.json()
  if (!res.ok) throw new Error((data as any).message || 'Notion API error')
  return data
}

export async function POST(req: NextRequest) {
  try {
    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await req.json()
    const { epic, task, story, filesTouched, notes } = body

    if (!epic || !task) {
      return NextResponse.json({ error: 'epic and task are required' }, { status: 400 })
    }

    const richText = (text: string) => [{ type: 'text', text: { content: (text ?? '').slice(0, 2000) } }]

    const properties: Record<string, any> = {
      Epic:            { title:     richText(epic) },
      Task:            { rich_text: richText(task) },
      'Story/Feature': { rich_text: richText(story ?? '') },
      'Files to touch':{ rich_text: richText(filesTouched ?? '') },
      Notes:           { rich_text: richText(notes ?? '') },
      Status:          { status:    { name: 'Done' } },
      'Start Date':    { date:      { start: new Date().toISOString().split('T')[0] } },
    }

    const page = await notionRequest('/v1/pages', 'POST', {
      parent: { database_id: NOTION_DB_ID },
      properties,
    }) as any

    return NextResponse.json({ success: true, pageId: page.id, url: page.url })
  } catch (err: any) {
    console.error('[notion-log] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

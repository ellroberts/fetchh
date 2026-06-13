import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/utils/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import mammoth from 'mammoth'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  const projectId = formData.get('project_id') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const allowedTypes = ['txt', 'md', 'docx']
  if (!allowedTypes.includes(ext)) {
    return NextResponse.json({ error: `Unsupported file type: .${ext}` }, { status: 400 })
  }

  let content = ''

  if (ext === 'docx') {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const result = await mammoth.extractRawText({ buffer })
    content = result.value.trim()
  } else {
    // txt and md — read as plain text
    content = (await file.text()).trim()
  }

  if (!content) return NextResponse.json({ error: 'Could not extract text from file' }, { status: 422 })

  const wordCount = content.split(/\s+/).filter(Boolean).length
  const title = file.name.replace(/\.(txt|md|docx)$/i, '')

  const { data, error } = await supabaseAdmin
    .from('library_documents')
    .insert([{
      user_id: user.id,
      title,
      file_name: file.name,
      file_type: ext,
      content,
      word_count: wordCount,
      tags: [],
      project_id: projectId || null,
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Embed in background — don't block the response
  try {
    const { embedLibraryDoc } = await import('../../../../lib/embed-library-doc')
    embedLibraryDoc(data.id).catch((err: any) => console.error('Library embed failed:', err))
  } catch (err) {
    console.error('Failed to import embedLibraryDoc:', err)
  }

  return NextResponse.json({ ok: true, document: data })
}

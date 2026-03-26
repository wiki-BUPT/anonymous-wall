import { supabaseAdmin } from '@/src/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

function toPositiveInt(value: string | null, fallback: number) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.floor(n)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const post_id = url.searchParams.get('post_id')
  const page = toPositiveInt(url.searchParams.get('page'), 1)
  const limit = Math.min(toPositiveInt(url.searchParams.get('limit'), 10), 50)

  if (!post_id) return NextResponse.json({ error: 'Missing post_id' }, { status: 400 })

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error } = await supabaseAdmin
    .from('comments')
    .select('comment_id, post_id, author_id, content, status, created_at')
    .eq('post_id', post_id)
    .eq('status', 1)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ page, limit, items: data ?? [] })
}

export async function POST(req: Request) {
  type CreateCommentBody = {
    post_id?: string
    author_id?: string
    content?: string
  }

  const text = await req.text().catch(() => '')
  const parsed = (() => {
    if (!text) return undefined
    try {
      return JSON.parse(text) as unknown
    } catch {
      return undefined
    }
  })()
  const body = parsed as CreateCommentBody | undefined

  const post_id = body?.post_id
  const author_id = body?.author_id
  const content = String(body?.content ?? '')

  if (!post_id) return NextResponse.json({ error: 'Missing post_id' }, { status: 400 })
  if (!author_id) return NextResponse.json({ error: 'Missing author_id' }, { status: 400 })

  const trimmed = content.trim()
  if (!trimmed) return NextResponse.json({ error: 'Missing content' }, { status: 400 })
  if (trimmed.length > 500) return NextResponse.json({ error: 'Content exceeds 500 chars' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('comments')
    .insert({
      post_id,
      author_id,
      content: trimmed,
      status: 1,
    })
    .select('comment_id, post_id, author_id, content, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ item: data })
}


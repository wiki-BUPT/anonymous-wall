import { supabaseAdmin } from '@/src/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

function toPositiveInt(value: string | null, fallback: number) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.floor(n)
}

const ALLOWED_TAGS = ['表白', '吐槽', '求助', '捞人', '打听'] as const
type AllowedTag = (typeof ALLOWED_TAGS)[number]

function isAllowedTag(tag: string | null | undefined): tag is AllowedTag {
  if (!tag) return false
  return (ALLOWED_TAGS as readonly string[]).includes(tag)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const page = toPositiveInt(url.searchParams.get('page'), 1)
  const limit = Math.min(toPositiveInt(url.searchParams.get('limit'), 10), 50)

  const tag = url.searchParams.get('tag') || null
  const keyword = url.searchParams.get('keyword') || null

  const from = (page - 1) * limit
  const to = from + limit - 1

  // MVP：使用 service_role 直连并在代码里强制过滤 status=1
  let query = supabaseAdmin
    .from('posts')
    .select('post_id, content, tag, bg_color, likes_count, created_at')
    .eq('status', 1)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (tag) query = query.eq('tag', tag)

  if (keyword) {
    // keyword 支持 content/ tag 两处模糊搜索
    const like = `%${keyword}%`
    query = query.or(`content.ilike.${like},tag.ilike.${like}`)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    page,
    limit,
    items: data ?? [],
  })
}

export async function POST(req: Request) {
  type CreatePostBody = {
    author_id?: string
    content?: string
    tag?: string
    bg_color?: string
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
  const body = parsed as CreatePostBody | undefined

  const author_id = body?.author_id
  const content = String(body?.content ?? '')
  const tag = body?.tag ?? null
  const bg_color = String(body?.bg_color ?? '')

  if (!author_id) {
    return NextResponse.json({ error: 'Missing author_id' }, { status: 400 })
  }

  const trimmed = content.trim()
  if (!trimmed) return NextResponse.json({ error: 'Missing content' }, { status: 400 })
  if (trimmed.length > 500) return NextResponse.json({ error: 'Content exceeds 500 chars' }, { status: 400 })

  if (!isAllowedTag(tag)) {
    return NextResponse.json({ error: 'Invalid tag' }, { status: 400 })
  }

  const trimmedBg = bg_color.trim()
  if (!trimmedBg) return NextResponse.json({ error: 'Missing bg_color' }, { status: 400 })
  if (trimmedBg.length > 32) return NextResponse.json({ error: 'bg_color too long' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('posts')
    .insert({
      author_id,
      content: trimmed,
      tag,
      bg_color: trimmedBg,
      status: 1,
    })
    .select('post_id, content, tag, bg_color, likes_count, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}


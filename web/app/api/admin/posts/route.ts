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
  const admin_id = url.searchParams.get('admin_id') || ''

  const page = toPositiveInt(url.searchParams.get('page'), 1)
  const limit = Math.min(toPositiveInt(url.searchParams.get('limit'), 10), 50)
  const from = (page - 1) * limit
  const to = from + limit - 1

  const tag = url.searchParams.get('tag') || null
  const keyword = url.searchParams.get('keyword') || null

  if (!admin_id) return NextResponse.json({ error: 'Missing admin_id' }, { status: 400 })

  const { data: adminUser, error: adminErr } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('user_id', admin_id)
    .single()

  if (adminErr) return NextResponse.json({ error: adminErr.message }, { status: 500 })
  if (!adminUser || adminUser.role !== 1) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let query = supabaseAdmin
    .from('posts')
    .select('post_id, author_id, content, tag, bg_color, likes_count, status, created_at')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (tag && isAllowedTag(tag)) query = query.eq('tag', tag)

  if (keyword) {
    const like = `%${keyword}%`
    query = query.or(`content.ilike.${like},tag.ilike.${like}`)
  }

  const { data: posts, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const authorIds = Array.from(new Set((posts ?? []).map((p) => p.author_id))).filter(Boolean)
  if (authorIds.length === 0) {
    return NextResponse.json({ page, limit, items: [] })
  }

  const { data: users, error: usersErr } = await supabaseAdmin
    .from('users')
    .select('user_id, student_id')
    .in('user_id', authorIds)

  if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 })

  const userMap = new Map((users ?? []).map((u) => [u.user_id, u.student_id]))

  const items = (posts ?? []).map((p) => ({
    post_id: p.post_id,
    author_student_id: userMap.get(p.author_id) ?? null,
    content: p.content,
    tag: p.tag,
    bg_color: p.bg_color,
    likes_count: p.likes_count,
    status: p.status,
    created_at: p.created_at,
  }))

  return NextResponse.json({ page, limit, items })
}


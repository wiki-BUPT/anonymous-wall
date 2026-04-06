import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth'
import { supabaseAdmin } from '@/src/lib/supabaseAdmin'

function toPositiveInt(value: string | null, fallback: number) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.floor(n)
}

export async function GET(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 1) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const page = toPositiveInt(url.searchParams.get('page'), 1)
  const limit = Math.min(toPositiveInt(url.searchParams.get('limit'), 10), 50)
  const keyword = url.searchParams.get('keyword')?.trim() || ''
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabaseAdmin
    .from('users')
    .select('user_id, student_id, role, status, created_at')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (keyword) {
    query = query.ilike('student_id', `%${keyword}%`)
  }

  const { data: users, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const userIds = (users ?? []).map((user) => user.user_id)
  const postCountMap = new Map<string, number>()
  const commentCountMap = new Map<string, number>()

  if (userIds.length > 0) {
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('posts')
      .select('author_id')
      .in('author_id', userIds)

    if (postsError) {
      return NextResponse.json({ error: postsError.message }, { status: 500 })
    }

    for (const post of posts ?? []) {
      postCountMap.set(post.author_id, (postCountMap.get(post.author_id) ?? 0) + 1)
    }

    const { data: comments, error: commentsError } = await supabaseAdmin
      .from('comments')
      .select('author_id')
      .in('author_id', userIds)

    if (commentsError) {
      return NextResponse.json({ error: commentsError.message }, { status: 500 })
    }

    for (const comment of comments ?? []) {
      commentCountMap.set(comment.author_id, (commentCountMap.get(comment.author_id) ?? 0) + 1)
    }
  }

  const items = (users ?? []).map((user) => ({
    ...user,
    posts_count: postCountMap.get(user.user_id) ?? 0,
    comments_count: commentCountMap.get(user.user_id) ?? 0,
  }))

  return NextResponse.json({ page, limit, items })
}

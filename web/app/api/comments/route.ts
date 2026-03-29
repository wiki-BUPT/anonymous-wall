import { supabaseAdmin } from '@/src/lib/supabaseAdmin'
import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth'
import { generateIdentity } from '@/src/lib/identity'

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
    .select('comment_id, post_id, author_id, content, status, created_at, is_author, anonymous_name, anonymous_avatar')
    .eq('post_id', post_id)
    .eq('status', 1)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ page, limit, items: data ?? [] })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  type CreateCommentBody = {
    post_id?: string
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
  const author_id = session.user_id
  const content = String(body?.content ?? '')

  if (!post_id) return NextResponse.json({ error: 'Missing post_id' }, { status: 400 })

  const trimmed = content.trim()
  if (!trimmed) return NextResponse.json({ error: 'Missing content' }, { status: 400 })
  if (trimmed.length > 500) return NextResponse.json({ error: 'Content exceeds 500 chars' }, { status: 400 })

  // 获取帖子信息
  const { data: post, error: postErr } = await supabaseAdmin
    .from('posts')
    .select('author_id, comments_count')
    .eq('post_id', post_id)
    .single()

  if (postErr || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const is_author = post.author_id === author_id
  let anonymous_name = ''
  let anonymous_avatar = ''

  if (is_author) {
    anonymous_name = '楼主'
    anonymous_avatar = '#000000' // 楼主专属颜色
  } else {
    // 查找是否已有马甲
    const { data: identity } = await supabaseAdmin
      .from('post_anonymous_identities')
      .select('anonymous_name, anonymous_avatar')
      .eq('post_id', post_id)
      .eq('user_id', author_id)
      .single()

    if (identity) {
      anonymous_name = identity.anonymous_name
      anonymous_avatar = identity.anonymous_avatar
    } else {
      // 生成新马甲
      const newIdentity = generateIdentity()
      anonymous_name = newIdentity.name
      anonymous_avatar = newIdentity.avatar

      await supabaseAdmin
        .from('post_anonymous_identities')
        .insert({
          post_id,
          user_id: author_id,
          anonymous_name,
          anonymous_avatar
        })
    }
  }

  const { data, error } = await supabaseAdmin
    .from('comments')
    .insert({
      post_id,
      author_id,
      content: trimmed,
      status: 1,
      is_author,
      anonymous_name,
      anonymous_avatar
    })
    .select('comment_id, post_id, author_id, content, status, created_at, is_author, anonymous_name, anonymous_avatar')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 更新评论数
  await supabaseAdmin
    .from('posts')
    .update({ comments_count: post.comments_count + 1 })
    .eq('post_id', post_id)

  return NextResponse.json({ item: data })
}


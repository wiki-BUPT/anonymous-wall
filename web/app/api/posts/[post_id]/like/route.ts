import { supabaseAdmin } from '@/src/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ post_id: string }> }
) {
  const { post_id } = await params
  type LikeBody = {
    user_id?: string
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
  const body = parsed as LikeBody | undefined

  const user_id = body?.user_id

  if (!post_id) return NextResponse.json({ error: 'Missing post_id' }, { status: 400 })
  if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

  // 先插入 UNIQUE(post_id, user_id)；若已存在则捕获冲突，禁止重复点赞
  const { error: insertError } = await supabaseAdmin
    .from('post_likes')
    .insert({ post_id, user_id })

  if (insertError) {
    // 23505: unique_violation
    if (insertError.code === '23505') {
      return NextResponse.json({ liked: false, reason: 'Already liked' })
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // 非严格事务场景：先读 likes_count，再 +1 写回（MVP 可接受）
  const { data: post, error: postError } = await supabaseAdmin
    .from('posts')
    .select('likes_count')
    .eq('post_id', post_id)
    .single()

  if (postError) return NextResponse.json({ error: postError.message }, { status: 500 })

  const nextLikes = (post?.likes_count ?? 0) + 1

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('posts')
    .update({ likes_count: nextLikes })
    .eq('post_id', post_id)
    .select('likes_count')
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ liked: true, likes_count: updated?.likes_count ?? nextLikes })
}


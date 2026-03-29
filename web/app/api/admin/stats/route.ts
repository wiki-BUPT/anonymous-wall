import { supabaseAdmin } from '@/src/lib/supabaseAdmin'
import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 1) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { count: usersCount } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true })

  const { count: postsCount } = await supabaseAdmin
    .from('posts')
    .select('*', { count: 'exact', head: true })

  const { count: commentsCount } = await supabaseAdmin
    .from('comments')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({
    users: usersCount ?? 0,
    posts: postsCount ?? 0,
    comments: commentsCount ?? 0
  })
}

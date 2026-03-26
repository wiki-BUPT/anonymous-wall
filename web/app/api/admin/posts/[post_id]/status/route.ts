import { supabaseAdmin } from '@/src/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ post_id: string }> }
) {
  const { post_id } = await params
  type AdminDownBody = {
    admin_id?: string
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
  const body = parsed as AdminDownBody | undefined
  const admin_id = body?.admin_id

  if (!post_id) return NextResponse.json({ error: 'Missing post_id' }, { status: 400 })
  if (!admin_id) return NextResponse.json({ error: 'Missing admin_id' }, { status: 400 })

  // 校验管理员 role=1
  const { data: adminUser, error: adminErr } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('user_id', admin_id)
    .single()

  if (adminErr) return NextResponse.json({ error: adminErr.message }, { status: 500 })
  if (!adminUser || adminUser.role !== 1) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('posts')
    .update({ status: 0 })
    .eq('post_id', post_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, post_id, status: 0 })
}


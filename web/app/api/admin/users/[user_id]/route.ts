import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth'
import { supabaseAdmin } from '@/src/lib/supabaseAdmin'

type UpdateBody = {
  status?: number
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ user_id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 1) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { user_id } = await params
  if (!user_id) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  }

  if (user_id === session.user_id) {
    return NextResponse.json({ error: '不能修改当前登录管理员状态' }, { status: 400 })
  }

  const body = (await req.json().catch(() => null)) as UpdateBody | null
  const status = body?.status === 0 ? 0 : 1

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ status })
    .eq('user_id', user_id)
    .select('user_id, status')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, item: data })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ user_id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 1) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { user_id } = await params
  if (!user_id) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  }

  if (user_id === session.user_id) {
    return NextResponse.json({ error: '不能删除当前登录管理员' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('user_id', user_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, user_id })
}

import { supabaseAdmin } from '@/src/lib/supabaseAdmin'
import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ comment_id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 1) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { comment_id } = await params

  if (!comment_id) return NextResponse.json({ error: 'Missing comment_id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('comments')
    .update({ status: 0 })
    .eq('comment_id', comment_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, comment_id, status: 0 })
}

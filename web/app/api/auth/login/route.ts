import { supabaseAdmin } from '@/src/lib/supabaseAdmin'
import { NextResponse } from 'next/server'
import { setSession } from '@/src/lib/auth'

export async function POST(req: Request) {
  try {
    const { student_id, password } = await req.json()

    if (!student_id || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }

    const password_hash = Buffer.from(password).toString('base64')

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('user_id, student_id, role, password_hash')
      .eq('student_id', student_id)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 })
    }

    if (user.password_hash !== password_hash) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 })
    }

    await setSession({
      user_id: user.user_id,
      student_id: user.student_id,
      role: user.role
    })

    return NextResponse.json({
      user: {
        user_id: user.user_id,
        student_id: user.student_id,
        role: user.role
      }
    })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

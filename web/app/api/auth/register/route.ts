import { supabaseAdmin } from '@/src/lib/supabaseAdmin'
import { NextResponse } from 'next/server'
import { setSession } from '@/src/lib/auth'

export async function POST(req: Request) {
  try {
    const { student_id, password } = await req.json()

    if (!student_id || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }

    // MVP: 简单哈希（实际应使用 bcrypt）
    const password_hash = Buffer.from(password).toString('base64')

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        student_id,
        password_hash,
        role: student_id === 'admin' ? 1 : 0 // 如果学号是 admin，则自动成为管理员
      })
      .select('user_id, student_id, role')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '学号已被注册' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await setSession({
      user_id: user.user_id,
      student_id: user.student_id,
      role: user.role
    })

    return NextResponse.json({ user })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

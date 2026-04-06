import { supabaseAdmin } from '@/src/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

type CreateUserBody = {
  student_id?: string
  password_hash?: string
  role?: number
  status?: number
}

async function parseJsonBody(req: Request) {
  try {
    const text = await req.text()
    if (!text) return undefined
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req)
  const body = parsed as CreateUserBody | undefined

  const student_id = body?.student_id
  const password_hash = body?.password_hash
  const roleRaw = body?.role
  const statusRaw = body?.status

  if (!student_id) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
  if (!password_hash) {
    return NextResponse.json({ error: 'Missing password_hash' }, { status: 400 })
  }

  const role = roleRaw === 1 ? 1 : 0
  const status = statusRaw === 0 ? 0 : 1

  // 以 student_id 为唯一键：存在就返回已存在的 user_id
  const { data, error } = await supabaseAdmin
    .from('users')
    .upsert(
      { student_id, password_hash, role, status },
      { onConflict: 'student_id' }
    )
    .select('user_id, student_id, role, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ user: data })
}


import { SignJWT, jwtVerify } from 'jose'
import { cookies, headers } from 'next/headers'
import { supabaseAdmin } from '@/src/lib/supabaseAdmin'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-mvp-key-for-local-dev-only'
const key = new TextEncoder().encode(JWT_SECRET)

export type JwtPayload = {
  user_id: string
  student_id: string
  role: number
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key)
    return payload as JwtPayload
  } catch (err) {
    return null
  }
}

export async function getSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('tw_token')?.value
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('user_id, student_id, role, status')
    .eq('user_id', payload.user_id)
    .single()

  if (error || !user || user.status !== 1) {
    return null
  }

  return {
    user_id: user.user_id,
    student_id: user.student_id,
    role: user.role,
  }
}

export async function setSession(payload: JwtPayload) {
  const token = await signToken(payload)
  const cookieStore = await cookies()
  const headerStore = await headers()
  const forwardedProto = headerStore.get('x-forwarded-proto')
  const isHttps = forwardedProto?.includes('https') ?? false
  cookieStore.set('tw_token', token, {
    httpOnly: true,
    // 在生产环境下优先根据反向代理协议决定是否启用 secure，
    // 这样未开 HTTPS 的临时环境也能正常写入登录态。
    secure: process.env.NODE_ENV === 'production' ? isHttps : false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete('tw_token')
}

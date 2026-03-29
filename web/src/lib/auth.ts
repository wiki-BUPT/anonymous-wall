import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

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
  return await verifyToken(token)
}

export async function setSession(payload: JwtPayload) {
  const token = await signToken(payload)
  const cookieStore = await cookies()
  cookieStore.set('tw_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete('tw_token')
}

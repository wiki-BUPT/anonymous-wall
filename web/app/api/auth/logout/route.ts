import { NextResponse } from 'next/server'
import { clearSession } from '@/src/lib/auth'

export async function POST() {
  await clearSession()
  return NextResponse.json({ success: true })
}

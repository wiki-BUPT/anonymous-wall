"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Leaf, LogOut, ShieldAlert } from 'lucide-react'
import { Button } from './ui/Button'

export function Header() {
  const router = useRouter()
  const [user, setUser] = useState<{ student_id: string; role: number } | null>(null)

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      setUser(data.user)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    fetchUser()
    window.addEventListener('auth-change', fetchUser)
    return () => window.removeEventListener('auth-change', fetchUser)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    window.dispatchEvent(new Event('auth-change'))
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-zinc-200/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-zinc-900 transition-opacity hover:opacity-80">
          <div className="w-8 h-8 bg-zinc-900 rounded-xl flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold tracking-tight text-lg">匿名树洞</span>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              {user.role === 1 && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="hidden sm:flex gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    管理后台
                  </Button>
                </Link>
              )}
              <div className="text-sm text-zinc-600 hidden sm:block">
                {user.student_id}
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors rounded-full hover:bg-zinc-100"
                title="退出登录"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link href="/login">
              <Button size="sm" className="rounded-full px-5">登录</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Ban, Search, ShieldAlert, Trash2 } from 'lucide-react'
import { Button } from '@/src/components/ui/Button'

type AdminUserItem = {
  user_id: string
  student_id: string
  role: number
  status: number
  created_at: string
  posts_count: number
  comments_count: number
}

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    loadUsers(1, true)
  }, [])

  const loadUsers = async (pageNum = 1, override = false) => {
    if (loading) return
    setLoading(true)

    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: '10',
      })

      if (keyword.trim()) {
        params.set('keyword', keyword.trim())
      }

      const res = await fetch(`/api/admin/users?${params.toString()}`)
      if (!res.ok) throw new Error('加载失败')

      const data = await res.json()
      if (override) {
        setUsers(data.items)
      } else {
        setUsers((prev) => [...prev, ...data.items])
      }

      setPage(pageNum)
      setHasMore(data.items.length === 10)
    } catch {
      alert('加载用户失败，请确认管理员权限是否正常')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadUsers(1, true)
  }

  const handleToggleBan = async (user: AdminUserItem) => {
    const nextStatus = user.status === 1 ? 0 : 1
    const actionText = nextStatus === 0 ? '封禁' : '解封'

    if (!confirm(`确定要${actionText}用户 ${user.student_id} 吗？`)) return

    try {
      const res = await fetch(`/api/admin/users/${user.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '操作失败')

      setUsers((prev) =>
        prev.map((item) =>
          item.user_id === user.user_id ? { ...item, status: nextStatus } : item
        )
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败')
    }
  }

  const handleDelete = async (user: AdminUserItem) => {
    if (!confirm(`确定要删除用户 ${user.student_id} 吗？该用户的帖子、评论和点赞会一并删除。`)) return

    try {
      const res = await fetch(`/api/admin/users/${user.user_id}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '删除失败')

      setUsers((prev) => prev.filter((item) => item.user_id !== user.user_id))
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-zinc-900 font-sans">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href="/admin" className="p-2 -ml-2 text-zinc-400 hover:text-zinc-900 transition-colors rounded-full hover:bg-zinc-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-semibold text-lg">用户管理</h1>
            <p className="text-xs text-zinc-500 mt-0.5">可搜索、封禁或删除用户，删除会级联删除该用户的帖子和评论</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <section className="bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-lg">用户列表</h2>
              <p className="text-sm text-zinc-500 mt-1">点击“封禁”后，用户将无法继续登录、发帖、评论或点赞。</p>
            </div>

            <form onSubmit={handleSearch} className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="搜索学号..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full h-10 pl-9 pr-4 bg-zinc-50 rounded-xl border-none focus:ring-2 focus:ring-zinc-900/10 text-sm outline-none"
              />
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-50/50 text-zinc-500 font-medium">
                <tr>
                  <th className="px-6 py-4">学号</th>
                  <th className="px-6 py-4">身份</th>
                  <th className="px-6 py-4">状态</th>
                  <th className="px-6 py-4">帖子数</th>
                  <th className="px-6 py-4">评论数</th>
                  <th className="px-6 py-4">注册时间</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map((user) => (
                  <tr key={user.user_id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{user.student_id}</td>
                    <td className="px-6 py-4">
                      {user.role === 1 ? (
                        <span className="inline-flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md text-xs font-medium">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          管理员
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-zinc-600 bg-zinc-100 px-2.5 py-1 rounded-md text-xs font-medium">
                          普通用户
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.status === 1 ? (
                        <span className="inline-flex items-center gap-1.5 text-green-600 bg-green-50 px-2.5 py-1 rounded-md text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          正常
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-red-600 bg-red-50 px-2.5 py-1 rounded-md text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          已封禁
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-zinc-500">{user.posts_count}</td>
                    <td className="px-6 py-4 text-zinc-500">{user.comments_count}</td>
                    <td className="px-6 py-4 text-zinc-500">{formatTime(user.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant={user.status === 1 ? 'danger' : 'secondary'}
                          size="sm"
                          className="h-8 px-3 rounded-lg text-xs"
                          onClick={() => handleToggleBan(user)}
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" />
                          {user.status === 1 ? '封禁' : '解封'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 rounded-lg text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(user)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-400">
                      暂无用户数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {hasMore && users.length > 0 && (
            <div className="p-4 border-t border-zinc-100 text-center bg-zinc-50/30">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-xl"
                isLoading={loading}
                onClick={() => loadUsers(page + 1)}
              >
                加载更多
              </Button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

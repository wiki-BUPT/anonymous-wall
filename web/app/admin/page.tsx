"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Ban, Users, MessageSquare, FileText, Search } from 'lucide-react'
import { Button } from '@/src/components/ui/Button'

type Stats = {
  users: number
  posts: number
  comments: number
}

type AdminPostItem = {
  post_id: string
  author_student_id: string | null
  content: string
  tag: string
  bg_color: string
  likes_count: number
  comments_count: number
  status: number
  created_at: string
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso)
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).format(d)
  } catch {
    return iso
  }
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [posts, setPosts] = useState<AdminPostItem[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    fetchStats()
    loadPosts(1, true)
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        setStats(await res.json())
      }
    } catch (err) {
      console.error(err)
    }
  }

  const loadPosts = async (pageNum = 1, override = false) => {
    if (loading) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: '10'
      })
      if (keyword.trim()) params.set('keyword', keyword.trim())

      const res = await fetch(`/api/admin/posts?${params.toString()}`)
      if (!res.ok) throw new Error('加载失败')
      
      const data = await res.json()
      if (override) {
        setPosts(data.items)
      } else {
        setPosts(prev => [...prev, ...data.items])
      }
      setHasMore(data.items.length === 10)
      setPage(pageNum)
    } catch (err) {
      alert('加载失败，请检查权限')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadPosts(1, true)
  }

  const handleBan = async (postId: string) => {
    if (!confirm('确定要下架该帖子吗？')) return
    
    try {
      const res = await fetch(`/api/admin/posts/${postId}/status`, {
        method: 'PUT'
      })
      if (!res.ok) throw new Error('操作失败')
      
      setPosts(prev => prev.map(p => 
        p.post_id === postId ? { ...p, status: 0 } : p
      ))
    } catch (err) {
      alert('操作失败')
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-zinc-900 font-sans">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 -ml-2 text-zinc-400 hover:text-zinc-900 transition-colors rounded-full hover:bg-zinc-100">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-semibold text-lg">管理后台</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* 数据看板 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/admin/users" className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 flex items-center gap-4 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-zinc-500 font-medium">总用户数</div>
              <div className="text-2xl font-semibold mt-1">{stats?.users ?? '-'}</div>
              <div className="text-xs text-blue-600 mt-1">点击进入用户管理</div>
            </div>
          </Link>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-500">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-zinc-500 font-medium">总帖子数</div>
              <div className="text-2xl font-semibold mt-1">{stats?.posts ?? '-'}</div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-zinc-500 font-medium">总评论数</div>
              <div className="text-2xl font-semibold mt-1">{stats?.comments ?? '-'}</div>
            </div>
          </div>
        </section>

        {/* 内容管理 */}
        <section className="bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="font-semibold text-lg">内容审核</h2>
            <form onSubmit={handleSearch} className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="搜索帖子内容..."
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
                  <th className="px-6 py-4">发布者学号</th>
                  <th className="px-6 py-4">内容摘要</th>
                  <th className="px-6 py-4">标签</th>
                  <th className="px-6 py-4">互动</th>
                  <th className="px-6 py-4">发布时间</th>
                  <th className="px-6 py-4">状态</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {posts.map(post => (
                  <tr key={post.post_id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{post.author_student_id}</td>
                    <td className="px-6 py-4">
                      <div className="max-w-[200px] truncate" title={post.content}>
                        {post.content}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-zinc-100 rounded-md text-xs font-medium text-zinc-600">
                        {post.tag}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500">
                      赞 {post.likes_count} · 评 {post.comments_count}
                    </td>
                    <td className="px-6 py-4 text-zinc-500">{formatTime(post.created_at)}</td>
                    <td className="px-6 py-4">
                      {post.status === 1 ? (
                        <span className="inline-flex items-center gap-1.5 text-green-600 bg-green-50 px-2.5 py-1 rounded-md text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          正常
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-red-600 bg-red-50 px-2.5 py-1 rounded-md text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          已下架
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="danger"
                        size="sm"
                        className="h-8 px-3 rounded-lg text-xs"
                        disabled={post.status === 0}
                        onClick={() => handleBan(post.post_id)}
                      >
                        <Ban className="w-3.5 h-3.5 mr-1" />
                        下架
                      </Button>
                    </td>
                  </tr>
                ))}
                {posts.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-400">
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {hasMore && posts.length > 0 && (
            <div className="p-4 border-t border-zinc-100 text-center bg-zinc-50/30">
              <Button 
                variant="secondary" 
                size="sm"
                className="rounded-xl"
                isLoading={loading}
                onClick={() => loadPosts(page + 1)}
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

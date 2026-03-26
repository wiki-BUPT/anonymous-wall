"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'

type AdminPostItem = {
  post_id: string
  author_student_id: string | null
  content: string
  tag: string
  bg_color: string
  likes_count: number
  status: number
  created_at: string
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso)
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return iso
  }
}

export default function AdminPage() {
  const [adminId, setAdminId] = useState('')
  const [keyword, setKeyword] = useState('')
  const [tagFilter, setTagFilter] = useState<string>('全部')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<AdminPostItem[]>([])
  const [err, setErr] = useState<string | null>(null)

  const load = async (nextPage = 1) => {
    setErr(null)
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('admin_id', adminId)
      params.set('page', String(nextPage))
      params.set('limit', String(limit))
      if (tagFilter !== '全部') params.set('tag', tagFilter)
      if (keyword.trim()) params.set('keyword', keyword.trim())

      const res = await fetch(`/api/admin/posts?${params.toString()}`)
      if (!res.ok) throw new Error(await res.text())
      const json = (await res.json()) as { items: AdminPostItem[] }

      setItems(nextPage === 1 ? json.items : [...items, ...json.items])
      setPage(nextPage)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const raw = localStorage.getItem('tw_admin_id')
    if (raw) setAdminId(raw)
  }, [])

  const down = async (post_id: string) => {
    if (!adminId.trim()) {
      alert('请输入 admin_id')
      return
    }
    const res = await fetch(`/api/admin/posts/${post_id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_id: adminId.trim() }),
    })
    if (!res.ok) {
      alert(await res.text())
      return
    }
    await load(1)
  }

  useEffect(() => {
    if (!adminId.trim()) return
    // 条件变动时重新拉取
    setItems([])
    setPage(1)
    void load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, tagFilter])

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 bg-white/80 backdrop-blur border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="text-xl font-bold text-zinc-900">管理员后台（匿名树洞）</div>
          <Link href="/" className="text-sm text-zinc-700 hover:underline">
            返回首页
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <section className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="font-semibold text-zinc-900">管理员身份</div>
            <div className="flex items-center gap-3">
              <input
                className="w-full sm:w-72 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="请输入 admin_id（users.user_id）"
                value={adminId}
                onChange={(e) => {
                  setAdminId(e.target.value)
                  localStorage.setItem('tw_admin_id', e.target.value)
                }}
              />
              <button
                className="rounded-lg bg-zinc-900 text-white px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-60"
                disabled={!adminId.trim() || loading}
                onClick={() => void load(1)}
              >
                {loading ? '加载中…' : '拉取列表'}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
            <input
              className="w-full sm:flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="关键词搜索（content/tag）"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <select
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            >
              <option value="全部">全部标签</option>
              <option value="表白">表白</option>
              <option value="吐槽">吐槽</option>
              <option value="求助">求助</option>
              <option value="捞人">捞人</option>
              <option value="打听">打听</option>
            </select>
          </div>

          {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
        </section>

        <section className="grid grid-cols-1 gap-4">
          {items.map((p) => (
            <article key={p.post_id} className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
              <div className="p-4" style={{ backgroundColor: p.bg_color }}>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-zinc-800">
                    {p.tag}
                  </span>
                  <div className="text-xs text-zinc-700/90">
                    {formatTime(p.created_at)}
                    <span className="ml-2 font-semibold">
                      {p.status === 1 ? '正常' : '已下架'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 whitespace-pre-wrap break-words text-zinc-900 font-medium">
                  {p.content}
                </div>
              </div>

              <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-zinc-700">
                  发帖者学号：{' '}
                  <span className="font-semibold">
                    {p.author_student_id ?? '未知'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-zinc-600">点赞：{p.likes_count}</div>
                  <button
                    className="rounded-lg bg-red-600 text-white px-3 py-2 text-sm hover:bg-red-700 disabled:opacity-60"
                    disabled={p.status === 0}
                    onClick={() => void down(p.post_id)}
                  >
                    一键下架
                  </button>
                </div>
              </div>
            </article>
          ))}

          {items.length === 0 && !loading && <div className="text-sm text-zinc-500">暂无数据</div>}
        </section>

        <div className="flex items-center justify-center">
          <button
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
            disabled={loading || items.length < limit}
            onClick={() => void load(page + 1)}
          >
            {loading ? '加载中…' : '加载更多'}
          </button>
        </div>
      </main>
    </div>
  )
}


"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'

const TAGS = ['表白', '吐槽', '求助', '捞人', '打听'] as const
type Tag = (typeof TAGS)[number]

const BG_COLORS = [
  { label: '奶油粉', value: '#FFD6E8' },
  { label: '焦糖杏', value: '#FFE7C7' },
  { label: '薄荷绿', value: '#D9F99D' },
  { label: '天空蓝', value: '#C9F5FF' },
  { label: '薰衣紫', value: '#E0D1FF' },
  { label: '桃子橘', value: '#FFC9A9' },
] as const

type UserState = {
  user_id: string
  student_id: string
  role: number
}

type PostItem = {
  post_id: string
  content: string
  tag: Tag
  bg_color: string
  likes_count: number
  created_at: string
}

type CommentItem = {
  comment_id: string
  post_id: string
  author_id: string
  content: string
  status: number
  created_at: string
}

function clampText(s: string, max: number) {
  const t = s.trim()
  return t.length > max ? t.slice(0, max) + '…' : t
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

export default function Home() {
  const [user, setUser] = useState<UserState | null>(null)
  const [studentId, setStudentId] = useState('')
  const [passwordHash, setPasswordHash] = useState('')
  const [role, setRole] = useState<0 | 1>(0)

  const [keyword, setKeyword] = useState('')
  const [tagFilter, setTagFilter] = useState<Tag | '全部'>('全部')

  const [posts, setPosts] = useState<PostItem[]>([])
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [loading, setLoading] = useState(false)

  const [newContent, setNewContent] = useState('')
  const [newTag, setNewTag] = useState<Tag>('表白')
  const [newBg, setNewBg] = useState<string>(BG_COLORS[0].value)
  const [publishing, setPublishing] = useState(false)

  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommentItem[]>>({})
  const [commentDraftByPost, setCommentDraftByPost] = useState<Record<string, string>>({})
  const [loadingCommentsByPost, setLoadingCommentsByPost] = useState<Record<string, boolean>>({})

  const canPublish = !!user?.user_id

  const bgColorStyle = (bg: string) => ({
    backgroundColor: bg,
  })

  const refresh = async (nextPage = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(nextPage))
      params.set('limit', String(limit))
      if (tagFilter !== '全部') params.set('tag', tagFilter)
      if (keyword.trim()) params.set('keyword', keyword.trim())

      const res = await fetch(`/api/posts?${params.toString()}`)
      if (!res.ok) throw new Error(await res.text())
      const json = (await res.json()) as { items: PostItem[] }

      setPosts(nextPage === 1 ? json.items : [...posts, ...json.items])
      setPage(nextPage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 首次加载 + 条件变化时刷新
    setPosts([])
    setPage(1)
    void (async () => {
      await refresh(1)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, tagFilter])

  useEffect(() => {
    const raw = localStorage.getItem('tw_user')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as UserState
      if (parsed?.user_id) setUser(parsed)
    } catch {
      // ignore
    }
  }, [])

  const createOrUseUser = async () => {
    if (!studentId.trim()) {
      alert('请输入 student_id')
      return
    }
    if (!passwordHash.trim()) {
      alert('请输入 password_hash（MVP 暂时不做真实加密校验，只用来写入数据库）')
      return
    }

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId.trim(),
        password_hash: passwordHash.trim(),
        role,
      }),
    })

    if (!res.ok) {
      alert(await res.text())
      return
    }
    const json = (await res.json()) as { user: UserState }
    setUser(json.user)
    localStorage.setItem('tw_user', JSON.stringify(json.user))
  }

  const publishPost = async () => {
    if (!user?.user_id) {
      alert('请先创建/选择用户身份')
      return
    }
    const content = newContent.trim()
    if (!content) {
      alert('请输入内容')
      return
    }
    if (content.length > 500) {
      alert('内容不能超过 500 字符')
      return
    }

    setPublishing(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_id: user.user_id,
          content,
          tag: newTag,
          bg_color: newBg,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      await res.json()

      setNewContent('')
      // 重新拉取第一页
      setPosts([])
      await refresh(1)
    } catch (e) {
      alert(e instanceof Error ? e.message : '发布失败')
    } finally {
      setPublishing(false)
    }
  }

  const likePost = async (post: PostItem) => {
    if (!user?.user_id) {
      alert('请先创建/选择用户身份')
      return
    }
    const res = await fetch(`/api/posts/${post.post_id}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.user_id }),
    })
    const json = (await res.json()) as { liked?: boolean; likes_count?: number; reason?: string }
    if (!res.ok) {
      alert(json.reason ?? '点赞失败')
      return
    }

    setPosts((prev) =>
      prev.map((p) =>
        p.post_id === post.post_id
          ? {
              ...p,
              likes_count: typeof json.likes_count === 'number' ? json.likes_count : p.likes_count,
            }
          : p
      )
    )
  }

  const loadComments = async (post_id: string) => {
    setLoadingCommentsByPost((m) => ({ ...m, [post_id]: true }))
    try {
      const params = new URLSearchParams()
      params.set('post_id', post_id)
      params.set('page', '1')
      params.set('limit', '20')

      const res = await fetch(`/api/comments?${params.toString()}`)
      if (!res.ok) throw new Error(await res.text())
      const json = (await res.json()) as { items: CommentItem[] }
      setCommentsByPost((m) => ({ ...m, [post_id]: json.items }))
    } catch (e) {
      alert(e instanceof Error ? e.message : '加载评论失败')
    } finally {
      setLoadingCommentsByPost((m) => ({ ...m, [post_id]: false }))
    }
  }

  const createComment = async (post_id: string) => {
    if (!user?.user_id) {
      alert('请先创建/选择用户身份')
      return
    }
    const content = (commentDraftByPost[post_id] ?? '').trim()
    if (!content) return
    if (content.length > 500) {
      alert('评论内容不能超过 500 字符')
      return
    }

    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post_id,
        author_id: user.user_id,
        content,
      }),
    })

    if (!res.ok) {
      alert(await res.text())
      return
    }

    setCommentDraftByPost((m) => ({ ...m, [post_id]: '' }))
    // 刷新该帖评论
    await loadComments(post_id)
  }

  const remaining = 500 - newContent.length

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="text-xl font-bold text-zinc-900">匿名树洞 / 校园表白墙（MVP）</div>
            <div className="text-sm text-zinc-500">前台匿名发布；管理员可查看学号并下架违规内容</div>
          </div>
          <div className="text-sm text-zinc-600">
            {user ? (
              <span>
                已选择身份：<span className="font-semibold">{user.student_id}</span>（role={user.role}）
              </span>
            ) : (
              <span>尚未选择身份</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="font-semibold text-zinc-900 mb-3">身份创建 / 使用</div>
            <div className="space-y-3">
              <input
                className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                placeholder="student_id（必填）"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                placeholder="password_hash（MVP 必填，暂不做真实加密校验）"
                value={passwordHash}
                onChange={(e) => setPasswordHash(e.target.value)}
              />
              <select
                className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                value={role}
                onChange={(e) => setRole(Number(e.target.value) === 1 ? 1 : 0)}
              >
                <option value={0}>普通用户（role=0）</option>
                <option value={1}>管理员（role=1）</option>
              </select>
              <button
                className="w-full bg-zinc-900 text-white rounded-lg px-3 py-2 hover:bg-zinc-800 disabled:opacity-60"
                onClick={() => void createOrUseUser()}
              >
                创建/使用用户
              </button>

              {user && (
                <div className="text-xs text-zinc-600 break-all bg-zinc-50 rounded-lg border border-zinc-200 p-2">
                  当前 user_id：{user.user_id}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="font-semibold text-zinc-900 mb-3">匿名发布</div>
            <div className="space-y-3">
              <textarea
                className="w-full min-h-[120px] rounded-lg border border-zinc-300 px-3 py-2 resize-none"
                placeholder="写点你想说的…（限500字符）"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
              <div className="text-xs text-zinc-500">剩余：{remaining}</div>

              <div className="grid grid-cols-2 gap-2">
                {TAGS.map((t) => (
                  <button
                    key={t}
                    className={`rounded-lg border px-2 py-1 text-sm ${
                      newTag === t ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 bg-white'
                    }`}
                    onClick={() => setNewTag(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <select
                className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                value={newBg}
                onChange={(e) => setNewBg(e.target.value)}
              >
                {BG_COLORS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              <button
                className="w-full bg-black text-white rounded-lg px-3 py-2 hover:opacity-90 disabled:opacity-60"
                disabled={!canPublish || publishing}
                onClick={() => void publishPost()}
              >
                {publishing ? '发布中…' : '发布（匿名）'}
              </button>
              <div className="text-xs text-zinc-500">
                提示：前台发布时会统一显示为“匿名用户”。只有管理员下架时会看到学号。
              </div>
            </div>
          </div>
        </section>

        <section className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="font-semibold text-zinc-900">发现内容</div>
              <div className="flex items-center gap-3">
                <input
                  className="w-full sm:w-64 rounded-lg border border-zinc-300 px-3 py-2"
                  placeholder="关键词搜索（content/tag）"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
                <select
                  className="rounded-lg border border-zinc-300 px-3 py-2"
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value as Tag | '全部')}
                >
                  <option value="全部">全部标签</option>
                  {TAGS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <Link
                  href="/admin"
                  className="whitespace-nowrap rounded-lg border border-zinc-300 px-3 py-2 hover:bg-zinc-50 text-sm"
                >
                  管理员后台
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {posts.map((post) => {
              const isExpanded = !!expandedComments[post.post_id]
              const comments = commentsByPost[post.post_id] ?? []
              const commentsLoading = !!loadingCommentsByPost[post.post_id]
              const draft = commentDraftByPost[post.post_id] ?? ''

              return (
                <article key={post.post_id} className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
                  <div className="p-4" style={bgColorStyle(post.bg_color)}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-zinc-800">
                        {post.tag}
                      </span>
                      <span className="text-xs text-zinc-700/90">{formatTime(post.created_at)}</span>
                    </div>
                    <div className="mt-3 text-zinc-900 font-medium whitespace-pre-wrap break-words">
                      {clampText(post.content, 240)}
                    </div>
                  </div>

                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="text-sm text-zinc-600">
                      发布者：<span className="font-semibold">匿名用户</span>
                    </div>
                    <button
                      className="rounded-lg bg-zinc-900 text-white px-3 py-1 text-sm hover:bg-zinc-800"
                      disabled={!user?.user_id}
                      onClick={() => void likePost(post)}
                    >
                      点赞（{post.likes_count}）
                    </button>
                  </div>

                  <div className="border-t border-zinc-200 px-4 py-3">
                    <button
                      className="text-sm text-zinc-700 hover:underline"
                      onClick={() => {
                        setExpandedComments((m) => ({ ...m, [post.post_id]: !isExpanded }))
                        if (!isExpanded) void loadComments(post.post_id)
                      }}
                    >
                      {isExpanded ? '收起评论' : `查看评论（${comments.length}）`}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-3">
                        <div className="text-xs text-zinc-500">
                          {commentsLoading ? '加载中…' : '评论为匿名二级评论'}
                        </div>
                        <div className="space-y-2 max-h-[240px] overflow-auto pr-1">
                          {comments.map((c) => (
                            <div key={c.comment_id} className="rounded-lg border border-zinc-200 p-2 bg-zinc-50">
                              <div className="text-xs text-zinc-600">
                                匿名用户 · {formatTime(c.created_at)}
                              </div>
                              <div className="mt-1 text-sm text-zinc-900 whitespace-pre-wrap break-words">
                                {c.content}
                              </div>
                            </div>
                          ))}
                          {comments.length === 0 && !commentsLoading && (
                            <div className="text-sm text-zinc-500">暂无评论</div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <input
                            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                            placeholder="发表评论（匿名）"
                            value={draft}
                            disabled={!user?.user_id}
                            onChange={(e) =>
                              setCommentDraftByPost((m) => ({ ...m, [post.post_id]: e.target.value }))
                            }
                          />
                          <button
                            className="rounded-lg bg-black text-white px-3 py-2 text-sm disabled:opacity-60"
                            disabled={!user?.user_id || !draft.trim()}
                            onClick={() => void createComment(post.post_id)}
                          >
                            发送
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          <div className="flex items-center justify-center">
            <button
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
              disabled={loading || posts.length < limit}
              onClick={() => void refresh(page + 1)}
            >
              {loading ? '加载中…' : '加载更多'}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}


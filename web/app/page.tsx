"use client"

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '@/src/components/Header'
import { Button } from '@/src/components/ui/Button'
import { Modal } from '@/src/components/ui/Modal'
import { Input } from '@/src/components/ui/Input'
import { Heart, MessageCircle, Plus, Search, Send, Leaf } from 'lucide-react'

const TAGS = ['全部', '表白', '吐槽', '求助', '捞人', '打听'] as const
type Tag = (typeof TAGS)[number]

const BG_COLORS = [
  { label: '纯净白', value: '#FFFFFF' },
  { label: '奶油粉', value: '#FFF0F5' },
  { label: '薄荷绿', value: '#F0FFF4' },
  { label: '天空蓝', value: '#F0F8FF' },
  { label: '薰衣紫', value: '#F8F0FF' },
  { label: '焦糖杏', value: '#FFF8F0' },
]

type PostItem = {
  post_id: string
  content: string
  tag: Tag
  bg_color: string
  likes_count: number
  comments_count: number
  is_anonymous: boolean
  anonymous_name: string | null
  anonymous_avatar: string | null
  created_at: string
}

type CommentItem = {
  comment_id: string
  post_id: string
  content: string
  is_author: boolean
  anonymous_name: string
  anonymous_avatar: string
  created_at: string
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    if (diff < 2592000000) return `${Math.floor(diff / 86400000)}天前`
    
    return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(d)
  } catch {
    return ''
  }
}

export default function Home() {
  const [posts, setPosts] = useState<PostItem[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [activeTag, setActiveTag] = useState<Tag>('全部')
  const [isAuth, setIsAuth] = useState(false)

  // 发帖状态
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newTag, setNewTag] = useState<Tag>('吐槽')
  const [newBg, setNewBg] = useState(BG_COLORS[0].value)
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [publishing, setPublishing] = useState(false)

  // 评论状态
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, CommentItem[]>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        setIsAuth(!!data.user)
      } catch {
        setIsAuth(false)
      }
    }
    checkAuth()
    window.addEventListener('auth-change', checkAuth)
    return () => window.removeEventListener('auth-change', checkAuth)
  }, [])

  const loadPosts = async (pageNum = 1, overridePosts = false) => {
    if (loading) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: '10'
      })
      if (activeTag !== '全部') params.set('tag', activeTag)
      if (keyword.trim()) params.set('keyword', keyword.trim())

      const res = await fetch(`/api/posts?${params.toString()}`)
      const data = await res.json()
      
      if (overridePosts) {
        setPosts(data.items)
      } else {
        setPosts(prev => [...prev, ...data.items])
      }
      
      setHasMore(data.items.length === 10)
      setPage(pageNum)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPosts(1, true)
  }, [activeTag])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadPosts(1, true)
  }

  const handlePublish = async () => {
    if (!newContent.trim()) return
    setPublishing(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newContent.trim(),
          tag: newTag,
          bg_color: newBg,
          is_anonymous: isAnonymous
        })
      })
      
      if (!res.ok) throw new Error('发布失败')
      
      setIsPostModalOpen(false)
      setNewContent('')
      loadPosts(1, true)
    } catch (err) {
      alert('发布失败，请检查是否已登录')
    } finally {
      setPublishing(false)
    }
  }

  const handleLike = async (postId: string) => {
    if (!isAuth) {
      alert('请先登录')
      return
    }
    
    // 乐观更新
    setPosts(prev => prev.map(p => 
      p.post_id === postId ? { ...p, likes_count: p.likes_count + 1 } : p
    ))

    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.liked) {
        // 恢复
        setPosts(prev => prev.map(p => 
          p.post_id === postId ? { ...p, likes_count: p.likes_count - 1 } : p
        ))
        if (data.reason) alert(data.reason)
      }
    } catch {
      // 恢复
      setPosts(prev => prev.map(p => 
        p.post_id === postId ? { ...p, likes_count: p.likes_count - 1 } : p
      ))
    }
  }

  const loadComments = async (postId: string) => {
    setLoadingComments(prev => ({ ...prev, [postId]: true }))
    try {
      const res = await fetch(`/api/comments?post_id=${postId}&page=1&limit=50`)
      const data = await res.json()
      setComments(prev => ({ ...prev, [postId]: data.items }))
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }))
    }
  }

  const toggleComments = (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null)
    } else {
      setExpandedPost(postId)
      if (!comments[postId]) {
        loadComments(postId)
      }
    }
  }

  const handleComment = async (postId: string) => {
    const content = commentDrafts[postId]?.trim()
    if (!content) return
    
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, content })
      })
      
      if (!res.ok) throw new Error('评论失败')
      
      setCommentDrafts(prev => ({ ...prev, [postId]: '' }))
      loadComments(postId)
      
      // 更新帖子评论数
      setPosts(prev => prev.map(p => 
        p.post_id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
      ))
    } catch (err) {
      alert('评论失败，请检查是否已登录')
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-zinc-900 font-sans selection:bg-zinc-200">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24">
        {/* 搜索与标签栏 */}
        <div className="mb-8 space-y-6">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="搜索树洞内容..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-white rounded-2xl border-none shadow-[0_2px_10px_rgb(0,0,0,0.04)] focus:ring-2 focus:ring-zinc-900/10 transition-shadow text-lg outline-none"
            />
          </form>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTag === tag 
                    ? 'bg-zinc-900 text-white shadow-md shadow-zinc-900/20' 
                    : 'bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 信息流 */}
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {posts.map(post => (
              <motion.article
                key={post.post_id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden border border-zinc-100/50"
              >
                <div className="p-6 sm:p-8 transition-colors duration-500" style={{ backgroundColor: post.bg_color === '#FFFFFF' ? 'transparent' : post.bg_color }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {post.is_anonymous ? (
                        <>
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm"
                            style={{ backgroundColor: post.anonymous_avatar || '#E5E7EB' }}
                          >
                            {post.anonymous_name?.[0] || '匿'}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900">{post.anonymous_name || '匿名用户'}</div>
                            <div className="text-xs text-zinc-500">{formatTime(post.created_at)}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 shadow-sm">
                            实
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900">实名用户</div>
                            <div className="text-xs text-zinc-500">{formatTime(post.created_at)}</div>
                          </div>
                        </>
                      )}
                    </div>
                    <span className="px-3 py-1 bg-white/60 backdrop-blur-md rounded-full text-xs font-medium text-zinc-700 shadow-sm">
                      {post.tag}
                    </span>
                  </div>

                  <p className="text-lg leading-relaxed text-zinc-800 whitespace-pre-wrap break-words">
                    {post.content}
                  </p>
                </div>

                <div className="px-6 py-4 bg-white border-t border-zinc-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleLike(post.post_id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full hover:bg-zinc-50 text-zinc-500 hover:text-red-500 transition-colors group"
                    >
                      <Heart className="w-5 h-5 group-active:scale-75 transition-transform" />
                      <span className="font-medium">{post.likes_count > 0 ? post.likes_count : '赞'}</span>
                    </button>
                    <button 
                      onClick={() => toggleComments(post.post_id)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition-colors ${
                        expandedPost === post.post_id ? 'bg-zinc-100 text-zinc-900' : 'hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="font-medium">{post.comments_count > 0 ? post.comments_count : '评论'}</span>
                    </button>
                  </div>
                </div>

                {/* 评论区 */}
                <AnimatePresence>
                  {expandedPost === post.post_id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-zinc-50/50 border-t border-zinc-100"
                    >
                      <div className="p-6 space-y-6">
                        {loadingComments[post.post_id] ? (
                          <div className="text-center text-zinc-400 py-4 text-sm">加载评论中...</div>
                        ) : (
                          <div className="space-y-5">
                            {comments[post.post_id]?.map(comment => (
                              <div key={comment.comment_id} className="flex gap-3">
                                <div 
                                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs text-white shadow-sm"
                                  style={{ backgroundColor: comment.anonymous_avatar || '#000' }}
                                >
                                  {comment.is_author ? '楼主' : (comment.anonymous_name?.[0] || '匿')}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-baseline gap-2 mb-1">
                                    <span className={`text-sm font-medium ${comment.is_author ? 'text-zinc-900' : 'text-zinc-700'}`}>
                                      {comment.is_author ? '楼主' : comment.anonymous_name}
                                    </span>
                                    <span className="text-xs text-zinc-400">{formatTime(comment.created_at)}</span>
                                  </div>
                                  <p className="text-sm text-zinc-800 whitespace-pre-wrap break-words">
                                    {comment.content}
                                  </p>
                                </div>
                              </div>
                            ))}
                            {comments[post.post_id]?.length === 0 && (
                              <div className="text-center text-zinc-400 py-4 text-sm">还没有人评论，快来抢沙发</div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-3 mt-4 pt-4 border-t border-zinc-200/50">
                          <input
                            type="text"
                            placeholder={isAuth ? "写下你的评论..." : "请先登录再评论"}
                            disabled={!isAuth}
                            value={commentDrafts[post.post_id] || ''}
                            onChange={(e) => setCommentDrafts(prev => ({ ...prev, [post.post_id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleComment(post.post_id)
                              }
                            }}
                            className="flex-1 h-10 px-4 rounded-full bg-white border border-zinc-200 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition-all text-sm disabled:bg-zinc-100"
                          />
                          <Button 
                            size="sm" 
                            className="rounded-full w-10 h-10 p-0 flex-shrink-0"
                            disabled={!isAuth || !commentDrafts[post.post_id]?.trim()}
                            onClick={() => handleComment(post.post_id)}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            ))}
          </AnimatePresence>

          {posts.length === 0 && !loading && (
            <div className="text-center py-20 text-zinc-400">
              <div className="w-16 h-16 mx-auto bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                <Leaf className="w-8 h-8 text-zinc-300" />
              </div>
              <p>这里空空如也</p>
            </div>
          )}

          {hasMore && posts.length > 0 && (
            <div className="text-center pt-4">
              <Button 
                variant="secondary" 
                className="rounded-full"
                isLoading={loading}
                onClick={() => loadPosts(page + 1)}
              >
                加载更多
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* 悬浮发帖按钮 */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (!isAuth) {
            alert('请先登录')
            return
          }
          setIsPostModalOpen(true)
        }}
        className="fixed bottom-8 right-8 w-14 h-14 bg-zinc-900 text-white rounded-full shadow-lg shadow-zinc-900/30 flex items-center justify-center z-40"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* 发帖弹窗 */}
      <Modal 
        isOpen={isPostModalOpen} 
        onClose={() => setIsPostModalOpen(false)}
        title="发布新树洞"
      >
        <div className="space-y-6">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="分享你的故事、吐槽或求助..."
            className="w-full h-40 p-4 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-zinc-900/10 resize-none outline-none text-zinc-800 placeholder:text-zinc-400"
            maxLength={500}
          />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">{newContent.length}/500</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
              />
              <span className="text-zinc-700">匿名发布</span>
            </label>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-zinc-700">选择标签</div>
            <div className="flex flex-wrap gap-2">
              {TAGS.filter(t => t !== '全部').map(tag => (
                <button
                  key={tag}
                  onClick={() => setNewTag(tag)}
                  className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                    newTag === tag ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-zinc-700">背景颜色</div>
            <div className="flex flex-wrap gap-3">
              {BG_COLORS.map(color => (
                <button
                  key={color.value}
                  onClick={() => setNewBg(color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    newBg === color.value ? 'border-zinc-900 scale-110' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: color.value, boxShadow: color.value === '#FFFFFF' ? 'inset 0 0 0 1px #E5E7EB' : 'none' }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <Button 
            className="w-full h-12 rounded-2xl text-base mt-4" 
            isLoading={publishing}
            onClick={handlePublish}
            disabled={!newContent.trim()}
          >
            发布
          </Button>
        </div>
      </Modal>
    </div>
  )
}

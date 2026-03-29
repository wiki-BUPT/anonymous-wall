import { supabaseAdmin } from '@/src/lib/supabaseAdmin'
import { generateIdentity } from '@/src/lib/identity'

const MOCK_USERS = [
  { student_id: 'test_user_1', password_hash: Buffer.from('123456').toString('base64'), role: 0 },
  { student_id: 'test_user_2', password_hash: Buffer.from('123456').toString('base64'), role: 0 },
  { student_id: 'test_user_3', password_hash: Buffer.from('123456').toString('base64'), role: 0 },
  { student_id: 'admin_test', password_hash: Buffer.from('admin123').toString('base64'), role: 1 },
]

const MOCK_POSTS = [
  {
    content: "今天在图书馆二楼靠窗的位置看到一个穿白色卫衣的男生，低头写代码的样子好认真，想认识一下，有人知道是哪个学院的吗？",
    tag: "捞人",
    bg_color: "#FFF0F5", // 奶油粉
    is_anonymous: true,
  },
  {
    content: "吐槽一下食堂一楼的黄焖鸡米饭，今天阿姨手抖，盐放得太多了，吃完喝了三瓶水还没缓过来😭",
    tag: "吐槽",
    bg_color: "#F0FFF4", // 薄荷绿
    is_anonymous: true,
  },
  {
    content: "求助万能的树洞，大三下学期想找实习，但是简历一片空白，现在开始准备还来得及吗？有没有学长学姐分享一下经验？",
    tag: "求助",
    bg_color: "#FFFFFF", // 纯净白
    is_anonymous: false, // 实名
  },
  {
    content: "有人知道高数期中考试的成绩什么时候出吗？每天都在担惊受怕中度过，感觉这次要挂科了...",
    tag: "打听",
    bg_color: "#F0F8FF", // 天空蓝
    is_anonymous: true,
  },
  {
    content: "致那个一直默默陪伴我的女孩：虽然我嘴上不说，但你每天早上给我带的豆浆我都记在心里。等考研结束，我们就在一起吧！",
    tag: "表白",
    bg_color: "#F8F0FF", // 薰衣紫
    is_anonymous: true,
  }
]

const MOCK_COMMENTS = [
  "蹲一个后续！",
  "同感同感，上次我也觉得特别咸",
  "来得及的，先从基础的八股文和算法题开始刷，多做几个项目",
  "据说下周三出成绩",
  "太甜了吧！祝福你们！"
]

async function seed() {
  console.log('🌱 开始播种初始数据...')

  // 1. 插入用户
  const userIds: string[] = []
  for (const u of MOCK_USERS) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert(u, { onConflict: 'student_id' })
      .select('user_id')
      .single()
    
    if (error) {
      console.error('插入用户失败:', error.message)
      continue
    }
    if (data) userIds.push(data.user_id)
  }

  if (userIds.length === 0) {
    console.error('❌ 没有成功创建用户，退出播种')
    return
  }

  // 2. 插入帖子
  const postIds: string[] = []
  for (let i = 0; i < MOCK_POSTS.length; i++) {
    const post = MOCK_POSTS[i]
    const author_id = userIds[i % userIds.length]
    
    let anonymous_name = null
    let anonymous_avatar = null
    
    if (post.is_anonymous) {
      const identity = generateIdentity()
      anonymous_name = identity.name
      anonymous_avatar = identity.avatar
    }

    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert({
        author_id,
        ...post,
        anonymous_name,
        anonymous_avatar,
        status: 1,
        likes_count: Math.floor(Math.random() * 20),
        comments_count: 1
      })
      .select('post_id')
      .single()

    if (error) {
      console.error('插入帖子失败:', error.message)
      continue
    }
    if (data) postIds.push(data.post_id)
  }

  // 3. 插入评论
  for (let i = 0; i < postIds.length; i++) {
    const post_id = postIds[i]
    const author_id = userIds[(i + 1) % userIds.length] // 确保不是楼主自己评论
    const content = MOCK_COMMENTS[i]

    const identity = generateIdentity()

    const { error } = await supabaseAdmin
      .from('comments')
      .insert({
        post_id,
        author_id,
        content,
        status: 1,
        is_author: false,
        anonymous_name: identity.name,
        anonymous_avatar: identity.avatar
      })

    if (error) {
      console.error('插入评论失败:', error.message)
    }
  }

  console.log('✅ 初始数据播种完成！')
}

seed()

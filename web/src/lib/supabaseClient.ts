import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in web/.env.local')
if (!anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in web/.env.local')

// 浏览器/前端与“普通读取”使用 anon key
export const supabase = createClient(
  url,
  anonKey
)


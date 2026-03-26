import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in web/.env.local')
if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in web/.env.local')

// 服务端/管理员操作使用 service_role key（只在 Server Components / Route Handlers 里导入）
export const supabaseAdmin = createClient(
  url,
  serviceRoleKey
)


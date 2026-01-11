// Supabase Edge Function: user-auth
// 处理微信小程序用户登录

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 请求参数类型
interface AuthRequest {
  action: 'login' | 'getUser' | 'updateUser'
  code?: string           // 微信 login code
  openid?: string         // 用户 openid（getUser/updateUser 使用）
  nickname?: string       // 更新昵称
  avatarUrl?: string      // 更新头像
}

// 用户信息类型
interface UserInfo {
  id: string
  openid: string
  nickname: string | null
  avatar_url: string | null
  created_at: string
}

// 微信登录响应
interface WxLoginResponse {
  openid: string
  session_key: string
  errcode?: number
  errmsg?: string
}

/**
 * 调用微信服务器获取 openid
 */
async function getWxOpenId(code: string): Promise<WxLoginResponse> {
  const appId = Deno.env.get('WX_APPID')
  const appSecret = Deno.env.get('WX_APPSECRET')

  if (!appId || !appSecret) {
    throw new Error('微信小程序配置缺失')
  }

  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`

  const response = await fetch(url)
  const data = await response.json()

  if (data.errcode) {
    console.error('微信登录失败:', data)
    throw new Error(`微信登录失败: ${data.errmsg}`)
  }

  return data as WxLoginResponse
}

/**
 * 查找或创建用户
 */
async function findOrCreateUser(supabase: any, openid: string): Promise<UserInfo> {
  // 先查找用户
  const { data: existingUser, error: findError } = await supabase
    .from('users')
    .select('*')
    .eq('openid', openid)
    .single()

  if (existingUser) {
    return existingUser
  }

  // 用户不存在，创建新用户
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      openid,
      nickname: null,
      avatar_url: null
    })
    .select()
    .single()

  if (createError) {
    console.error('创建用户失败:', createError)
    throw new Error('创建用户失败')
  }

  return newUser
}

/**
 * 更新用户信息
 */
async function updateUserInfo(
  supabase: any,
  openid: string,
  updates: { nickname?: string; avatar_url?: string }
): Promise<UserInfo> {
  const { data, error } = await supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('openid', openid)
    .select()
    .single()

  if (error) {
    console.error('更新用户失败:', error)
    throw new Error('更新用户失败')
  }

  return data
}

/**
 * 主处理函数
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const params: AuthRequest = await req.json()
    const { action } = params

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 登录操作
    if (action === 'login') {
      if (!params.code) {
        return new Response(
          JSON.stringify({ success: false, error: '缺少登录 code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('处理微信登录请求...')

      // 获取 openid
      const wxResult = await getWxOpenId(params.code)
      console.log('获取到 openid:', wxResult.openid)

      // 查找或创建用户
      const user = await findOrCreateUser(supabase, wxResult.openid)
      console.log('用户信息:', user)

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            user: {
              id: user.id,
              openid: user.openid,
              nickname: user.nickname,
              avatarUrl: user.avatar_url
            }
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 获取用户信息
    if (action === 'getUser') {
      if (!params.openid) {
        return new Response(
          JSON.stringify({ success: false, error: '缺少 openid' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('openid', params.openid)
        .single()

      if (error || !user) {
        return new Response(
          JSON.stringify({ success: false, error: '用户不存在' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            user: {
              id: user.id,
              openid: user.openid,
              nickname: user.nickname,
              avatarUrl: user.avatar_url
            }
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 更新用户信息
    if (action === 'updateUser') {
      if (!params.openid) {
        return new Response(
          JSON.stringify({ success: false, error: '缺少 openid' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const updates: { nickname?: string; avatar_url?: string } = {}
      if (params.nickname !== undefined) updates.nickname = params.nickname
      if (params.avatarUrl !== undefined) updates.avatar_url = params.avatarUrl

      const user = await updateUserInfo(supabase, params.openid, updates)

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            user: {
              id: user.id,
              openid: user.openid,
              nickname: user.nickname,
              avatarUrl: user.avatar_url
            }
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: '无效的操作' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('处理错误:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || '服务器错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

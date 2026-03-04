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
  action: 'login' | 'loginWithPhone' | 'getUser' | 'updateUser'
  code?: string           // 微信 login code
  phoneCode?: string      // 手机号授权 code（新版API）
  openid?: string         // 用户 openid（getUser/updateUser 使用）
  nickname?: string       // 更新昵称
  avatarUrl?: string      // 更新头像
}

// 用户信息类型
interface UserInfo {
  id: string
  openid: string
  phone_number: string | null
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
 * 获取微信接口调用凭证 access_token
 */
async function getAccessToken(): Promise<string> {
  const appId = Deno.env.get('WX_APPID')
  const appSecret = Deno.env.get('WX_APPSECRET')

  if (!appId || !appSecret) {
    throw new Error('微信小程序配置缺失')
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`

  const response = await fetch(url)
  const data = await response.json()

  if (data.errcode) {
    console.error('获取 access_token 失败:', data)
    throw new Error(`获取 access_token 失败: ${data.errmsg}`)
  }

  return data.access_token
}

/**
 * 使用 code 获取手机号（新版API）
 */
async function getPhoneNumber(phoneCode: string): Promise<string> {
  const accessToken = await getAccessToken()

  const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code: phoneCode })
  })

  const data = await response.json()

  if (data.errcode !== 0) {
    console.error('获取手机号失败:', data)
    throw new Error(`获取手机号失败: ${data.errmsg}`)
  }

  return data.phone_info.phoneNumber
}

/**
 * 查找或创建用户
 */
async function findOrCreateUser(supabase: any, openid: string, phoneNumber?: string): Promise<UserInfo> {
  // 先查找用户（优先用手机号查找，然后用 openid）
  let existingUser = null

  if (phoneNumber) {
    const { data: userByPhone } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single()
    existingUser = userByPhone
  }

  if (!existingUser) {
    const { data: userByOpenid } = await supabase
      .from('users')
      .select('*')
      .eq('openid', openid)
      .single()
    existingUser = userByOpenid
  }

  if (existingUser) {
    // 如果找到用户，更新 openid 和手机号（如果有变化）
    const updates: any = {}
    if (existingUser.openid !== openid) updates.openid = openid
    if (phoneNumber && existingUser.phone_number !== phoneNumber) updates.phone_number = phoneNumber

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString()
      const { data: updatedUser } = await supabase
        .from('users')
        .update(updates)
        .eq('id', existingUser.id)
        .select()
        .single()
      return updatedUser || existingUser
    }
    return existingUser
  }

  // 用户不存在，创建新用户
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      openid,
      phone_number: phoneNumber || null,
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

    // 手机号登录操作（推荐）
    if (action === 'loginWithPhone') {
      if (!params.code) {
        return new Response(
          JSON.stringify({ success: false, error: '缺少登录 code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!params.phoneCode) {
        return new Response(
          JSON.stringify({ success: false, error: '缺少手机号授权 code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('处理手机号登录请求...')

      // 获取 openid
      const wxResult = await getWxOpenId(params.code)
      console.log('获取到 openid:', wxResult.openid)

      // 获取手机号
      const phoneNumber = await getPhoneNumber(params.phoneCode)
      console.log('获取到手机号:', phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'))

      // 查找或创建用户
      const user = await findOrCreateUser(supabase, wxResult.openid, phoneNumber)
      console.log('用户信息:', user)

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            user: {
              id: user.id,
              openid: user.openid,
              phoneNumber: user.phone_number,
              nickname: user.nickname,
              avatarUrl: user.avatar_url
            }
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 静默登录操作（仅获取 openid，不推荐）
    if (action === 'login') {
      if (!params.code) {
        return new Response(
          JSON.stringify({ success: false, error: '缺少登录 code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('处理微信静默登录请求...')

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
              phoneNumber: user.phone_number,
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
              phoneNumber: user.phone_number,
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
              phoneNumber: user.phone_number,
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

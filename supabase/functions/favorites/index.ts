// Supabase Edge Function: favorites
// 负责收藏管理的核心逻辑

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 收藏请求参数
interface FavoriteParams {
  action: 'add' | 'remove' | 'list' | 'check'
  openid: string
  type?: 'naming' | 'analysis'  // 收藏类型
  content?: any  // 收藏内容
  favoriteId?: string  // 删除时使用
  page?: number
  pageSize?: number
}

/**
 * 获取 Supabase 客户端
 */
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(supabaseUrl, supabaseKey)
}

/**
 * 获取用户 ID
 */
async function getUserId(supabase: any, openid: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('openid', openid)
    .single()

  if (error || !data) {
    return null
  }
  return data.id
}

/**
 * 添加收藏
 */
async function addFavorite(supabase: any, userId: string, type: string, content: any) {
  const { data, error } = await supabase
    .from('favorites')
    .insert({
      user_id: userId,
      type,
      content
    })
    .select()
    .single()

  if (error) {
    console.error('添加收藏失败:', error)
    throw new Error('添加收藏失败')
  }

  return data
}

/**
 * 删除收藏
 */
async function removeFavorite(supabase: any, userId: string, favoriteId: string) {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('id', favoriteId)
    .eq('user_id', userId)

  if (error) {
    console.error('删除收藏失败:', error)
    throw new Error('删除收藏失败')
  }

  return true
}

/**
 * 获取收藏列表
 */
async function listFavorites(
  supabase: any,
  userId: string,
  type?: string,
  page: number = 1,
  pageSize: number = 20
) {
  let query = supabase
    .from('favorites')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (type) {
    query = query.eq('type', type)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await query.range(from, to)

  if (error) {
    console.error('获取收藏列表失败:', error)
    throw new Error('获取收藏列表失败')
  }

  return {
    records: data || [],
    total: count || 0,
    page,
    pageSize,
    hasMore: (count || 0) > page * pageSize
  }
}

/**
 * 检查是否已收藏
 */
async function checkFavorite(supabase: any, userId: string, type: string, content: any) {
  // 根据类型和内容标识查找
  const identifier = type === 'naming' ? content.fullName : content.fullName

  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .contains('content', { fullName: identifier })

  if (error) {
    console.error('检查收藏失败:', error)
    return { isFavorite: false, favoriteId: null }
  }

  return {
    isFavorite: data && data.length > 0,
    favoriteId: data && data.length > 0 ? data[0].id : null
  }
}

/**
 * 主处理函数
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const params: FavoriteParams = await req.json()

    // 参数验证
    if (!params.action || !params.openid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '参数不完整'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabase = getSupabaseClient()

    // 获取用户 ID
    const userId = await getUserId(supabase, params.openid)
    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '用户不存在'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let result: any

    switch (params.action) {
      case 'add':
        if (!params.type || !params.content) {
          throw new Error('添加收藏需要 type 和 content 参数')
        }
        result = await addFavorite(supabase, userId, params.type, params.content)
        break

      case 'remove':
        if (!params.favoriteId) {
          throw new Error('删除收藏需要 favoriteId 参数')
        }
        result = await removeFavorite(supabase, userId, params.favoriteId)
        break

      case 'list':
        result = await listFavorites(
          supabase,
          userId,
          params.type,
          params.page || 1,
          params.pageSize || 20
        )
        break

      case 'check':
        if (!params.type || !params.content) {
          throw new Error('检查收藏需要 type 和 content 参数')
        }
        result = await checkFavorite(supabase, userId, params.type, params.content)
        break

      default:
        throw new Error('不支持的操作')
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('处理错误:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || '服务器错误'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

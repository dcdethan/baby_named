// Supabase Edge Function: history
// 负责起名历史记录查询的核心逻辑

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 历史记录请求参数
interface HistoryParams {
  action: 'list' | 'detail' | 'delete'
  openid: string
  recordId?: string  // 详情或删除时使用
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
 * 格式化时间为相对时间
 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`

  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

/**
 * 获取历史记录列表
 */
async function listHistory(
  supabase: any,
  openid: string,
  page: number = 1,
  pageSize: number = 20
) {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('naming_history')
    .select('*', { count: 'exact' })
    .eq('openid', openid)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('获取历史记录失败:', error)
    throw new Error('获取历史记录失败')
  }

  // 格式化时间
  const records = (data || []).map((record: any) => ({
    ...record,
    created_at: formatRelativeTime(record.created_at)
  }))

  return {
    records,
    total: count || 0,
    page,
    pageSize,
    hasMore: (count || 0) > page * pageSize
  }
}

/**
 * 获取历史记录详情
 */
async function getHistoryDetail(supabase: any, openid: string, recordId: string) {
  const { data, error } = await supabase
    .from('naming_history')
    .select('*')
    .eq('id', recordId)
    .eq('openid', openid)
    .single()

  if (error) {
    console.error('获取历史详情失败:', error)
    throw new Error('记录不存在')
  }

  return data
}

/**
 * 删除历史记录
 */
async function deleteHistory(supabase: any, openid: string, recordId: string) {
  const { error } = await supabase
    .from('naming_history')
    .delete()
    .eq('id', recordId)
    .eq('openid', openid)

  if (error) {
    console.error('删除历史记录失败:', error)
    throw new Error('删除失败')
  }

  return true
}

/**
 * 主处理函数
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const params: HistoryParams = await req.json()

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
    let result: any

    switch (params.action) {
      case 'list':
        result = await listHistory(
          supabase,
          params.openid,
          params.page || 1,
          params.pageSize || 20
        )
        break

      case 'detail':
        if (!params.recordId) {
          throw new Error('获取详情需要 recordId 参数')
        }
        result = await getHistoryDetail(supabase, params.openid, params.recordId)
        break

      case 'delete':
        if (!params.recordId) {
          throw new Error('删除需要 recordId 参数')
        }
        result = await deleteHistory(supabase, params.openid, params.recordId)
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

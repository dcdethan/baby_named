// utils/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_CONFIG } from '../config/supabase'

let supabaseClient: SupabaseClient | null = null

/**
 * 获取 Supabase 客户端实例（单例模式）
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  }
  return supabaseClient
}

/**
 * 调用 Supabase Edge Function
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  params: any
): Promise<{ data: T | null; error: any }> {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client.functions.invoke(functionName, {
      body: params
    })

    if (error) {
      console.error('Edge Function 调用失败:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Edge Function 调用异常:', err)
    return { data: null, error: err }
  }
}

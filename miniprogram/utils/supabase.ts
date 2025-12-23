// utils/supabase.ts
import { SUPABASE_CONFIG } from '../config/supabase'

/**
 * 调用 Supabase Edge Function
 * 使用 wx.request 直接调用，无需 Supabase SDK
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  params: any
): Promise<{ data: T | null; error: any }> {
  return new Promise((resolve) => {
    wx.request({
      url: `${SUPABASE_CONFIG.url}/functions/v1/${functionName}`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'apikey': SUPABASE_CONFIG.anonKey
      },
      data: params,
      success: (res) => {
        console.log('Edge Function 响应:', res)
        if (res.statusCode === 200) {
          resolve({ data: res.data as T, error: null })
        } else {
          console.error('Edge Function 调用失败:', res)
          resolve({
            data: null,
            error: {
              message: res.data || '调用失败',
              statusCode: res.statusCode
            }
          })
        }
      },
      fail: (err) => {
        console.error('Edge Function 调用异常:', err)
        resolve({
          data: null,
          error: {
            message: err.errMsg || '网络请求失败',
            ...err
          }
        })
      }
    })
  })
}

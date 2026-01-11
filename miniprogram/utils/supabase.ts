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
  console.log('调用 Edge Function:', functionName)
  console.log('请求参数:', JSON.stringify(params))

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
        console.log('Edge Function 响应状态码:', res.statusCode)
        console.log('Edge Function 响应数据:', JSON.stringify(res.data))
        if (res.statusCode === 200) {
          resolve({ data: res.data as T, error: null })
        } else {
          console.error('Edge Function 调用失败 - 状态码:', res.statusCode)
          console.error('Edge Function 调用失败 - 响应体:', JSON.stringify(res.data))
          // 提取错误信息
          const resData = res.data as any
          let errorMessage = '调用失败'
          if (typeof resData === 'string') {
            errorMessage = resData
          } else if (resData?.message) {
            errorMessage = resData.message
          } else if (resData?.error) {
            errorMessage = typeof resData.error === 'string' ? resData.error : resData.error.message || '调用失败'
          }
          resolve({
            data: null,
            error: {
              message: errorMessage,
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

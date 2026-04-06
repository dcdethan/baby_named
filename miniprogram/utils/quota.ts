// utils/quota.ts
// Request quota helper

import { invokeEdgeFunction } from './supabase'
import { EDGE_FUNCTIONS } from '../config/supabase'
import { getOpenId } from './auth'

export type QuotaType = 'naming' | 'analysis' | 'library'

export const FREE_LIMIT = 10

const DEVELOPER_WECHAT = '15533545868'
const EXCEEDED_TEXT = '次数已用完，请添加管理员微信号：15533545868增加次数！'

export async function checkAndIncrementQuota(type: QuotaType): Promise<boolean> {
  const openid = getOpenId()
  if (!openid) {
    wx.showToast({ title: '请先登录后再使用', icon: 'none' })
    return false
  }

  try {
    const { data, error } = await invokeEdgeFunction(EDGE_FUNCTIONS.userQuota, {
      action: 'checkAndIncrement',
      openid,
      type,
    })

    if (error) return true

    const payload = (data as any)?.data || data || {}
    const result = payload.data || payload

    console.log('[quota]', result?.openid, 'total=', result?.totalCount, 'remaining=', result?.remaining, 'limit=', result?.limit, 'allowed=', result?.allowed)

    if (result?.allowed === false) {
      showQuotaExceededModal()
      return false
    }

    return true
  } catch (_e) {
    return true
  }
}

function showQuotaExceededModal() {
  wx.showModal({
    title: '请求次数已用完',
    content: EXCEEDED_TEXT,
    showCancel: false,
    confirmText: '确定',
  })
}

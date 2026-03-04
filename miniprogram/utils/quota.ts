// utils/quota.ts
// 请求次数控制工具

import { invokeEdgeFunction } from './supabase'
import { EDGE_FUNCTIONS } from '../config/supabase'
import { getOpenId } from './auth'

export type QuotaType = 'naming' | 'analysis' | 'library'

export const FREE_LIMIT = 10

const DEVELOPER_WECHAT = '15533545868'

const TYPE_NAMES: Record<QuotaType, string> = {
  naming: '智慧起名',
  analysis: '名字分析',
  library: '起名字库',
}

/**
 * 检查并增加使用次数
 * 返回 true 表示允许继续请求，false 表示已达上限（弹窗已显示）
 */
export async function checkAndIncrementQuota(type: QuotaType): Promise<boolean> {
  const openid = getOpenId()
  if (!openid) return true // 未登录用户不限制

  try {
    const { data, error } = await invokeEdgeFunction(EDGE_FUNCTIONS.userQuota, {
      action: 'checkAndIncrement',
      openid,
      type,
    })

    if (error) return true // 出错时放行，不影响正常使用

    const result = (data as any)?.data
    if (!result?.allowed) {
      showQuotaExceededModal(type)
      return false
    }
    return true
  } catch (_e) {
    return true // 异常时放行
  }
}

/**
 * 显示次数已用完弹窗，提示联系开发者
 */
function showQuotaExceededModal(type: QuotaType) {
  wx.showModal({
    title: `${TYPE_NAMES[type]}次数已用完`,
    content: `您的免费${TYPE_NAMES[type]}次数（${FREE_LIMIT}次）已全部用完。\n\n如需继续使用，请添加开发者微信联系解锁：\n${DEVELOPER_WECHAT}`,
    showCancel: true,
    cancelText: '暂不',
    confirmText: '复制微信号',
    success: (res) => {
      if (res.confirm) {
        wx.setClipboardData({
          data: DEVELOPER_WECHAT,
          success: () => {
            wx.showToast({ title: '微信号已复制', icon: 'success' })
          },
        })
      }
    },
  })
}

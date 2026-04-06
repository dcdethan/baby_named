// pages/mine/mine.ts
import { isLoggedIn, getUser, logout, login, getOpenId, UserInfo } from '../../utils/auth'
import { invokeEdgeFunction } from '../../utils/supabase'
import { EDGE_FUNCTIONS } from '../../config/supabase'
import { FREE_LIMIT } from '../../utils/quota'

function toNumber(v: any): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

Page({
  data: {
    isLoggedIn: false,
    user: null as UserInfo | null,
    defaultAvatar: '/assets/icons/default-avatar.png',
    defaultNickname: '微信用户',
    showLoginModal: false,
    loginLoading: false,
    pendingAction: '' as 'favorites' | 'history' | '',
    totalCount: 0,
    freeLimit: FREE_LIMIT,
    isWhitelisted: false,
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
    this.loadUsageData()
  },

  async loadUsageData() {
    const openid = getOpenId()
    if (!openid) return

    const fetchOnce = async () => {
      const { data } = await invokeEdgeFunction(EDGE_FUNCTIONS.userQuota, {
        action: 'getQuota',
        openid,
      })

      const payload = (data as any)?.data || data || {}
      const namingCount = toNumber(payload.namingCount)
      const analysisCount = toNumber(payload.analysisCount)
      const libraryCount = toNumber(payload.libraryCount)
      const fallbackTotal = namingCount + analysisCount + libraryCount
      const totalCount = toNumber(payload.totalCount) || fallbackTotal

      this.setData({
        totalCount,
        freeLimit: toNumber(payload.limit) || FREE_LIMIT,
        isWhitelisted: !!payload.isWhitelisted,
      })
    }

    try {
      await fetchOnce()
      // Avoid showing stale count right after a quota increment request.
      setTimeout(() => {
        fetchOnce().catch(() => {})
      }, 300)
    } catch {}
  },

  copyDeveloperWechat() {
    wx.setClipboardData({
      data: '15533545868',
      success: () => {
        wx.showToast({ title: '微信号已复制', icon: 'success' })
      },
    })
  },

  checkLoginStatus() {
    const loggedIn = isLoggedIn()
    const user = getUser()

    this.setData({
      isLoggedIn: loggedIn,
      user: user
    })
  },

  goToFavorites() {
    if (!this.data.isLoggedIn) {
      this.setData({
        showLoginModal: true,
        pendingAction: 'favorites'
      })
      return
    }
    wx.navigateTo({
      url: '/pages/favorites/favorites'
    })
  },

  goToHistory() {
    if (!this.data.isLoggedIn) {
      this.setData({
        showLoginModal: true,
        pendingAction: 'history'
      })
      return
    }
    wx.navigateTo({
      url: '/pages/history/history'
    })
  },

  closeLoginModal() {
    this.setData({
      showLoginModal: false,
      pendingAction: ''
    })
  },

  async handleLogin() {
    if (this.data.loginLoading) return

    this.setData({ loginLoading: true })

    try {
      const user = await login()

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })

      this.setData({
        isLoggedIn: true,
        user: user,
        showLoginModal: false
      })

      this.loadUsageData()

      const pendingAction = this.data.pendingAction
      this.setData({ pendingAction: '' })

      setTimeout(() => {
        if (pendingAction === 'favorites') {
          wx.navigateTo({ url: '/pages/favorites/favorites' })
        } else if (pendingAction === 'history') {
          wx.navigateTo({ url: '/pages/history/history' })
        }
      }, 500)
    } catch (error: any) {
      console.error('登录失败:', error)
      const errMsg = typeof error === 'string' ? error : (error?.message || '登录失败')
      wx.showToast({
        title: errMsg,
        icon: 'none'
      })
    } finally {
      this.setData({ loginLoading: false })
    }
  },

  onUserCardTap() {
    if (!this.data.isLoggedIn) {
      this.setData({
        showLoginModal: true,
        pendingAction: ''
      })
    }
  },

  handleFeedback() {
    wx.showModal({
      title: '意见反馈',
      content: '如有问题或建议，请通过微信联系我们',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          logout()
          this.setData({
            isLoggedIn: false,
            user: null,
            totalCount: 0,
            freeLimit: FREE_LIMIT,
            isWhitelisted: false,
          })
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  }
})

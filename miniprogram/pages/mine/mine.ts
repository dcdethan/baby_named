// pages/mine/mine.ts
import { isLoggedIn, getUser, logout, login, getOpenId, UserInfo } from '../../utils/auth'
import { invokeEdgeFunction } from '../../utils/supabase'
import { EDGE_FUNCTIONS } from '../../config/supabase'
import { FREE_LIMIT } from '../../utils/quota'

Page({
  data: {
    isLoggedIn: false,
    user: null as UserInfo | null,
    defaultAvatar: '/assets/icons/default-avatar.png',
    defaultNickname: '微信用户',
    showLoginModal: false,
    loginLoading: false,
    pendingAction: '' as 'favorites' | 'history' | '',
    usageData: {
      namingCount: 0,
      analysisCount: 0,
      libraryCount: 0,
    },
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

  /**
   * 加载使用次数数据
   */
  async loadUsageData() {
    const openid = getOpenId()
    if (!openid) return

    try {
      const { data } = await invokeEdgeFunction(EDGE_FUNCTIONS.userQuota, {
        action: 'getQuota',
        openid,
      })
      const quota = (data as any)?.data
      if (quota) {
        this.setData({
          usageData: {
            namingCount: quota.namingCount ?? 0,
            analysisCount: quota.analysisCount ?? 0,
            libraryCount: quota.libraryCount ?? 0,
          },
          isWhitelisted: quota.isWhitelisted ?? false,
        })
      }
    } catch {}
  },

  /**
   * 复制开发者微信号
   */
  copyDeveloperWechat() {
    wx.setClipboardData({
      data: '15533545868',
      success: () => {
        wx.showToast({ title: '微信号已复制', icon: 'success' })
      },
    })
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const loggedIn = isLoggedIn()
    const user = getUser()

    this.setData({
      isLoggedIn: loggedIn,
      user: user
    })
  },

  /**
   * 跳转到我的收藏
   */
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

  /**
   * 跳转到起名历史
   */
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

  /**
   * 关闭登录弹窗
   */
  closeLoginModal() {
    this.setData({
      showLoginModal: false,
      pendingAction: ''
    })
  },

  /**
   * 处理微信登录
   */
  async handleLogin() {
    if (this.data.loginLoading) return

    this.setData({ loginLoading: true })

    try {
      const user = await login()

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })

      // 更新登录状态
      this.setData({
        isLoggedIn: true,
        user: user,
        showLoginModal: false
      })

      // 执行待处理的操作
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

  /**
   * 点击用户卡片
   */
  onUserCardTap() {
    if (!this.data.isLoggedIn) {
      this.setData({
        showLoginModal: true,
        pendingAction: ''
      })
    }
  },

  /**
   * 意见反馈
   */
  handleFeedback() {
    wx.showModal({
      title: '意见反馈',
      content: '如有问题或建议，请通过微信联系我们',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  /**
   * 退出登录
   */
  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          logout()
          this.setData({
            isLoggedIn: false,
            user: null
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

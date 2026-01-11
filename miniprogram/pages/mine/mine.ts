// pages/mine/mine.ts
import { isLoggedIn, getUser, logout, UserInfo } from '../../utils/auth'

Page({
  data: {
    isLoggedIn: false,
    user: null as UserInfo | null,
    defaultAvatar: '/assets/icons/default-avatar.png',
    defaultNickname: '微信用户'
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
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
   * 跳转到登录页
   */
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  /**
   * 跳转到我的收藏
   */
  goToFavorites() {
    if (!this.data.isLoggedIn) {
      this.showLoginTip()
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
      this.showLoginTip()
      return
    }
    wx.navigateTo({
      url: '/pages/history/history'
    })
  },

  /**
   * 显示登录提示
   */
  showLoginTip() {
    wx.showModal({
      title: '提示',
      content: '请先登录后再使用此功能',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          this.goToLogin()
        }
      }
    })
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

// pages/login/login.ts
import { login, isLoggedIn } from '../../utils/auth'

Page({
  data: {
    loading: false
  },

  onLoad() {
    // 如果已登录，直接跳转到首页
    if (isLoggedIn()) {
      this.navigateToHome()
    }
  },

  /**
   * 处理登录
   */
  async handleLogin() {
    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      await login()
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })

      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        this.navigateToHome()
      }, 500)
    } catch (error: any) {
      console.error('登录失败:', error)
      const errMsg = typeof error === 'string' ? error : (error?.message || '登录失败')
      wx.showToast({
        title: errMsg,
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  /**
   * 跳转到首页
   */
  navigateToHome() {
    wx.switchTab({
      url: '/pages/home/home'
    })
  }
})

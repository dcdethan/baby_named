// pages/home/home.ts
import { isLoggedIn, checkLoginAndRedirect } from '../../utils/auth'

Page({
  data: {},

  onLoad() {
    // 检查登录状态
    if (!isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
    }
  },

  onShow() {
    // 每次显示页面时检查登录状态
    if (!isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
    }
  },

  /**
   * 跳转到 AI 智能起名
   */
  goToNaming() {
    wx.navigateTo({
      url: '/pages/naming/naming'
    })
  },

  /**
   * 跳转到名字分析
   */
  goToAnalysis() {
    wx.navigateTo({
      url: '/pages/analysis/analysis'
    })
  },

  /**
   * 跳转到起名字库
   */
  goToLibrary() {
    wx.navigateTo({
      url: '/pages/library/library'
    })
  }
})

// pages/home/home.ts

Page({
  data: {},

  onLoad() {
    // 首页无需登录即可使用
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

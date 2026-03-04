// pages/history/history.ts
import { invokeEdgeFunction } from '../../utils/supabase'
import { EDGE_FUNCTIONS } from '../../config/supabase'
import { getOpenId } from '../../utils/auth'

Page({
  data: {
    activeTab: 'naming',
    namingRecords: [] as any[],
    analysisRecords: [] as any[],
    loading: false,
    page: 1,
    hasMore: true
  },

  onLoad() {
    this.loadHistory()
  },

  onShow() {
    // 刷新数据
    this.setData({ page: 1, namingRecords: [], analysisRecords: [], hasMore: true })
    this.loadHistory()
  },

  // 切换标签
  switchTab(e: any) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  // 加载历史记录
  async loadHistory() {
    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      const { data, error } = await invokeEdgeFunction('history', {
        action: 'list',
        openid: getOpenId(),
        page: 1,
        pageSize: 100
      })

      if (error) throw error

      const records = data.data?.records || []

      // 按类型分类
      const namingRecords = records.filter((r: any) => r.type === 'naming' || !r.type)
      const analysisRecords = records.filter((r: any) => r.type === 'analysis')

      this.setData({
        namingRecords,
        analysisRecords,
        hasMore: false
      })
    } catch (e: any) {
      console.error('加载历史失败:', e)
      wx.showToast({
        title: e.message || '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ page: 1, namingRecords: [], analysisRecords: [], hasMore: true })
    this.loadHistory().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 一键清空
  handleClearAll() {
    const type = this.data.activeTab
    const typeName = type === 'naming' ? '起名记录' : '分析记录'

    wx.showModal({
      title: '确认清空',
      content: `确定要清空所有${typeName}吗？此操作不可恢复。`,
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '清空中...' })

            const { error } = await invokeEdgeFunction('history', {
              action: 'clearAll',
              openid: getOpenId(),
              type: type
            })

            if (error) throw error

            // 更新本地列表
            if (type === 'naming') {
              this.setData({ namingRecords: [] })
            } else {
              this.setData({ analysisRecords: [] })
            }

            wx.hideLoading()
            wx.showToast({ title: '已清空', icon: 'success' })
          } catch (e: any) {
            wx.hideLoading()
            wx.showToast({
              title: e.message || '清空失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 查看起名详情
  viewNamingDetail(e: any) {
    const record = e.currentTarget.dataset.record

    // 使用全局存储传递数据
    const app = getApp()
    app.globalData = app.globalData || {}
    app.globalData.namingResult = record.result || {}
    app.globalData.namingParams = record.params || {}

    wx.navigateTo({
      url: '/pages/naming-result/naming-result'
    })
  },

  // 查看分析详情
  viewAnalysisDetail(e: any) {
    const record = e.currentTarget.dataset.record

    // 使用全局存储传递数据
    const app = getApp()
    app.globalData = app.globalData || {}
    app.globalData.analysisResult = record.result || {}
    app.globalData.analysisParams = record.params || {}

    wx.navigateTo({
      url: '/pages/analysis-result/analysis-result'
    })
  },

  // 格式化时间
  formatTime(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`

    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
})

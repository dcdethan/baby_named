// pages/history/history.ts
import { invokeEdgeFunction } from '../../utils/supabase'
import { EDGE_FUNCTIONS } from '../../config/supabase'
import { getOpenId } from '../../utils/auth'

Page({
  data: {
    records: [] as any[],
    loading: false,
    page: 1,
    hasMore: true
  },

  onLoad() {
    this.loadHistory()
  },

  onShow() {
    // 刷新数据
    this.setData({ page: 1, records: [], hasMore: true })
    this.loadHistory()
  },

  // 加载历史记录
  async loadHistory() {
    if (this.data.loading || !this.data.hasMore) return

    this.setData({ loading: true })

    try {
      const { data, error } = await invokeEdgeFunction('history', {
        action: 'list',
        openid: getOpenId(),
        page: this.data.page,
        pageSize: 20
      })

      if (error) throw error

      const newRecords = data.data?.records || []

      this.setData({
        records: [...this.data.records, ...newRecords],
        page: this.data.page + 1,
        hasMore: newRecords.length === 20
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
    this.setData({ page: 1, records: [], hasMore: true })
    this.loadHistory().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadHistory()
  },

  // 查看详情
  viewDetail(e: any) {
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

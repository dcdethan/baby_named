// pages/favorites/favorites.ts
import { invokeEdgeFunction } from '../../utils/supabase'
import { EDGE_FUNCTIONS } from '../../config/supabase'
import { getOpenId } from '../../utils/auth'

Page({
  data: {
    activeTab: 'naming',
    namingFavorites: [] as any[],
    analysisFavorites: [] as any[],
    loading: false
  },

  onLoad() {
    this.loadFavorites()
  },

  onShow() {
    this.loadFavorites()
  },

  // 切换标签
  switchTab(e: any) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  // 加载收藏列表
  async loadFavorites() {
    this.setData({ loading: true })

    try {
      const { data, error } = await invokeEdgeFunction(EDGE_FUNCTIONS.favorites, {
        action: 'list',
        openid: getOpenId(),
        page: 1,
        pageSize: 50
      })

      if (error) throw error

      const favorites = data.data?.favorites || []

      this.setData({
        namingFavorites: favorites.filter((f: any) => f.type === 'naming'),
        analysisFavorites: favorites.filter((f: any) => f.type === 'analysis')
      })
    } catch (e: any) {
      console.error('加载收藏失败:', e)
      wx.showToast({
        title: e.message || '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 删除收藏
  async removeFavorite(e: any) {
    const { id, type } = e.currentTarget.dataset

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个收藏吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const { error } = await invokeEdgeFunction(EDGE_FUNCTIONS.favorites, {
              action: 'remove',
              openid: getOpenId(),
              favoriteId: id
            })

            if (error) throw error

            // 更新本地列表
            if (type === 'naming') {
              this.setData({
                namingFavorites: this.data.namingFavorites.filter(f => f.id !== id)
              })
            } else {
              this.setData({
                analysisFavorites: this.data.analysisFavorites.filter(f => f.id !== id)
              })
            }

            wx.showToast({ title: '已删除', icon: 'success' })
          } catch (e: any) {
            wx.showToast({
              title: e.message || '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  }
})

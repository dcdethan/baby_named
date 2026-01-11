// pages/naming-result/naming-result.ts
import { invokeEdgeFunction } from '../../utils/supabase'
import { EDGE_FUNCTIONS } from '../../config/supabase'
import { isLoggedIn, getOpenId } from '../../utils/auth'

// 风格选项
const STYLE_OPTIONS = [
  { value: 'classical', label: '古典' },
  { value: 'modern', label: '现代' },
  { value: 'poetic', label: '诗意' }
]

Page({
  data: {
    // 结果数据
    names: [] as any[],
    bazi: null as any,

    // 请求参数
    requestParams: null as any,

    // 收藏状态
    favorites: {} as { [key: number]: boolean },

    // 加载状态
    loading: false,
    refreshing: false,

    // 风格选择器
    showStylePicker: false,
    styleOptions: STYLE_OPTIONS
  },

  onLoad(options: any) {
    try {
      // 从全局存储获取数据
      const app = getApp()
      console.log('naming-result onLoad, globalData:', JSON.stringify(app.globalData))

      if (app.globalData?.namingResult) {
        console.log('从 globalData 获取到的 namingResult:', JSON.stringify(app.globalData.namingResult))
        console.log('names 数组长度:', app.globalData.namingResult.names?.length)

        this.setData({
          names: app.globalData.namingResult.names || [],
          bazi: app.globalData.namingResult.bazi || null
        })

        console.log('setData 后的 names:', JSON.stringify(this.data.names))
      }
      if (app.globalData?.namingParams) {
        this.setData({ requestParams: app.globalData.namingParams })
      }

      // 兼容旧的 URL 参数方式
      if (options.data) {
        const data = JSON.parse(decodeURIComponent(options.data))
        this.setData({
          names: data.data?.names || data.names || [],
          bazi: data.data?.bazi || data.bazi || null
        })
      }
      if (options.params) {
        const params = JSON.parse(decodeURIComponent(options.params))
        this.setData({ requestParams: params })
      }
    } catch (e) {
      console.error('解析数据失败:', e)
      wx.showToast({ title: '数据加载失败', icon: 'none' })
    }
  },

  /**
   * 收藏/取消收藏
   */
  async toggleFavorite(e: any) {
    const index = e.currentTarget.dataset.index
    const name = this.data.names[index]

    if (!isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再收藏',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' })
          }
        }
      })
      return
    }

    const isFavorited = this.data.favorites[index]

    try {
      const { error } = await invokeEdgeFunction(EDGE_FUNCTIONS.favorites, {
        action: isFavorited ? 'remove' : 'add',
        openid: getOpenId(),
        type: 'naming',
        content: name
      })

      if (error) throw error

      this.setData({
        [`favorites.${index}`]: !isFavorited
      })

      wx.showToast({
        title: isFavorited ? '已取消收藏' : '收藏成功',
        icon: 'success'
      })
    } catch (e: any) {
      wx.showToast({
        title: e.message || '操作失败',
        icon: 'none'
      })
    }
  },

  /**
   * 换一批
   */
  async handleRefresh() {
    if (this.data.refreshing) return

    this.setData({ refreshing: true })

    try {
      const { data, error } = await invokeEdgeFunction(
        EDGE_FUNCTIONS.namingExpert,
        this.data.requestParams
      )

      if (error) throw error

      this.setData({
        names: data.data?.names || [],
        bazi: data.data?.bazi || null,
        favorites: {}
      })

      wx.showToast({ title: '已刷新', icon: 'success' })
    } catch (e: any) {
      wx.showToast({
        title: e.message || '刷新失败',
        icon: 'none'
      })
    } finally {
      this.setData({ refreshing: false })
    }
  },

  /**
   * 显示风格选择器
   */
  showStylePicker() {
    this.setData({ showStylePicker: true })
  },

  /**
   * 隐藏风格选择器
   */
  hideStylePicker() {
    this.setData({ showStylePicker: false })
  },

  /**
   * 选择风格并重新生成
   */
  async selectStyle(e: any) {
    const style = e.currentTarget.dataset.style

    this.setData({ showStylePicker: false })

    if (this.data.refreshing) return

    this.setData({ refreshing: true })

    try {
      const newParams = {
        ...this.data.requestParams,
        style: style
      }

      const { data, error } = await invokeEdgeFunction(
        EDGE_FUNCTIONS.namingExpert,
        newParams
      )

      if (error) throw error

      this.setData({
        names: data.data?.names || [],
        bazi: data.data?.bazi || null,
        favorites: {},
        requestParams: newParams
      })

      const styleName = STYLE_OPTIONS.find(s => s.value === style)?.label || style
      wx.showToast({ title: `已切换为${styleName}风格`, icon: 'success' })
    } catch (e: any) {
      wx.showToast({
        title: e.message || '生成失败',
        icon: 'none'
      })
    } finally {
      this.setData({ refreshing: false })
    }
  },

  /**
   * 返回重新起名
   */
  goBack() {
    wx.navigateBack()
  }
})

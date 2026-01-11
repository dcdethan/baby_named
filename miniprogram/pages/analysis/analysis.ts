// pages/analysis/analysis.ts
import { invokeEdgeFunction } from '../../utils/supabase'
import { EDGE_FUNCTIONS } from '../../config/supabase'
import { isLoggedIn, getOpenId } from '../../utils/auth'

Page({
  data: {
    fullName: '',
    loading: false,
    hasResult: false,

    // 分析结果
    result: {
      basicInfo: null as any,
      pronunciation: null as any,
      structure: null as any,
      meaning: null as any,
      suggestions: [] as string[]
    },

    // 收藏状态
    isFavorited: false
  },

  // 姓名输入
  onNameInput(e: any) {
    this.setData({ fullName: e.detail.value })
  },

  // 姓名输入完成时验证
  onNameBlur(e: any) {
    const value = e.detail.value
    if (value && value.length > 4) {
      // 截取前4个字符
      this.setData({ fullName: value.slice(0, 4) })
      wx.showToast({ title: '姓名最多4个字', icon: 'none' })
    }
  },

  // 表单验证
  validateForm(): boolean {
    const { fullName } = this.data

    if (!fullName || !fullName.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return false
    }

    if (fullName.length < 2 || fullName.length > 4) {
      wx.showToast({ title: '请输入2-4个字的姓名', icon: 'none' })
      return false
    }

    return true
  },

  // 开始分析
  async handleAnalyze() {
    if (!this.validateForm()) return
    if (this.data.loading) return

    this.setData({ loading: true, hasResult: false })

    try {
      const { data, error } = await invokeEdgeFunction(
        EDGE_FUNCTIONS.nameAnalysis,
        {
          fullName: this.data.fullName.trim(),
          openid: getOpenId()
        }
      )

      if (error) throw error

      // 转换 API 响应格式以匹配 WXML 期望的结构
      const apiResult = (data as any).data
      const transformedResult = {
        basicInfo: {
          surname: apiResult.fullName?.charAt(0) || '',
          givenName: apiResult.fullName?.slice(1) || '',
          totalStrokes: apiResult.chars?.reduce((sum: number, c: any) => sum + (c.strokes || 0), 0) || 0
        },
        pronunciation: {
          pinyin: apiResult.pronunciation?.pinyin || '',
          tone: apiResult.pronunciation?.tones || '',
          harmony: apiResult.pronunciation?.harmony || ''
        },
        structure: {
          chars: apiResult.chars || []
        },
        meaning: {
          interpretation: apiResult.meaning?.overall || '',
          origin: '',
          culturalRef: apiResult.meaning?.cultural || ''
        },
        suggestions: apiResult.suggestions || []
      }

      this.setData({
        hasResult: true,
        result: transformedResult,
        isFavorited: false
      })
    } catch (e: any) {
      console.error('分析失败:', e)
      wx.showToast({
        title: e.message || '分析失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 收藏
  async handleFavorite() {
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

    try {
      const { error } = await invokeEdgeFunction(EDGE_FUNCTIONS.favorites, {
        action: this.data.isFavorited ? 'remove' : 'add',
        openid: getOpenId(),
        type: 'analysis',
        content: {
          fullName: this.data.fullName,
          result: this.data.result
        }
      })

      if (error) throw error

      this.setData({ isFavorited: !this.data.isFavorited })

      wx.showToast({
        title: this.data.isFavorited ? '收藏成功' : '已取消收藏',
        icon: 'success'
      })
    } catch (e: any) {
      wx.showToast({
        title: e.message || '操作失败',
        icon: 'none'
      })
    }
  },

  // 分享
  handleShare() {
    const { fullName, result } = this.data

    const shareText = `【${fullName}】姓名分析\n\n` +
      `读音：${result.pronunciation?.pinyin || ''}\n` +
      `笔画：${result.basicInfo?.totalStrokes || ''}画\n\n` +
      `寓意解读：\n${result.meaning?.interpretation || ''}\n\n` +
      `—— 起名宝典`

    wx.setClipboardData({
      data: shareText,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        })
      }
    })
  }
})

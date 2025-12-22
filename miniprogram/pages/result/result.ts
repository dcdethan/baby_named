// pages/result/result.ts
import { NameResult } from '../../types/index'

interface ResultData {
  names: NameResult[]
  bazi?: {
    year: string
    month: string
    day: string
    hour: string
  }
}

Page({
  data: {
    names: [] as NameResult[],
    bazi: null as ResultData['bazi'] | null
  },

  onLoad(options: any) {
    try {
      if (options.data) {
        const resultData: ResultData = JSON.parse(decodeURIComponent(options.data))
        this.setData({
          names: resultData.names || [],
          bazi: resultData.bazi || null
        })
      } else {
        wx.showToast({
          title: '数据加载失败',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (err) {
      console.error('解析结果数据失败:', err)
      wx.showToast({
        title: '数据解析失败',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  /**
   * 返回重新起名
   */
  onBack() {
    wx.navigateBack()
  },

  /**
   * 分享结果
   */
  onShare() {
    // 生成分享内容
    const shareText = this.generateShareText()

    // 设置剪贴板
    wx.setClipboardData({
      data: shareText,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        })
      }
    })
  },

  /**
   * 生成分享文本
   */
  generateShareText(): string {
    const { names, bazi } = this.data
    let text = '【AI智能起名结果】\n\n'

    if (bazi) {
      text += `八字：${bazi.year} ${bazi.month} ${bazi.day} ${bazi.hour}\n\n`
    }

    text += '推荐名字：\n'
    names.forEach((name, index) => {
      text += `\n${index + 1}. ${name.name}（${name.pinyin}）\n`
      text += `   五行：${name.wuxing}\n`
      text += `   寓意：${name.meaning}\n`
    })

    return text
  },

  /**
   * 分享配置
   */
  onShareAppMessage() {
    return {
      title: 'AI智能起名 - 基于八字五行与中华文学',
      path: '/pages/index/index'
    }
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: 'AI智能起名 - 基于八字五行与中华文学'
    }
  }
})

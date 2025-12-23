// pages/result/result.ts
import { CharResult } from '../../types/index'

interface ResultData {
  chars: CharResult[]
  bazi?: {
    year: string
    month: string
    day: string
    hour: string
  }
}

Page({
  data: {
    chars: [] as CharResult[],
    bazi: null as ResultData['bazi'] | null,
    expandedIndex: -1  // 当前展开的单字索引，-1表示都没展开
  },

  onLoad(options: any) {
    try {
      console.log('结果页接收到的 options:', options)

      if (options.data) {
        const decodedData = decodeURIComponent(options.data)
        console.log('解码后的数据:', decodedData)

        const resultData: ResultData = JSON.parse(decodedData)
        console.log('解析后的 resultData:', resultData)
        console.log('chars 数组:', resultData.chars)
        console.log('chars 数组长度:', resultData.chars?.length || 0)
        console.log('bazi 信息:', resultData.bazi)

        this.setData({
          chars: resultData.chars || [],
          bazi: resultData.bazi || null
        })

        console.log('页面 data 设置后:', this.data)
      } else {
        console.error('options.data 为空')
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
   * 点击单字卡片
   */
  onCharTap(e: any) {
    const index = e.currentTarget.dataset.index
    this.setData({
      expandedIndex: this.data.expandedIndex === index ? -1 : index
    })
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
    const shareText = this.generateShareText()
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
    const { chars, bazi } = this.data
    let text = '【AI智能起名结果】\n\n'

    if (bazi) {
      text += `八字：${bazi.year} ${bazi.month} ${bazi.day} ${bazi.hour}\n\n`
    }

    text += '候选名字：\n'
    chars.forEach((char, index) => {
      text += `\n${index + 1}. ${char.fullName}（${char.fullPinyin}）\n`
      text += `   五行：${char.wuxing}\n`
      text += `   分析：${char.analysis}\n`
    })

    return text
  },

  onShareAppMessage() {
    return {
      title: 'AI智能起名 - 基于八字五行与中华文学',
      path: '/pages/index/index'
    }
  },

  onShareTimeline() {
    return {
      title: 'AI智能起名 - 基于八字五行与中华文学'
    }
  }
})

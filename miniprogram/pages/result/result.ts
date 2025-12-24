// pages/result/result.ts
import { CharResult, BaziInfo } from '../../types/index'

interface ResultData {
  singleChars?: CharResult[]
  doubleChars?: CharResult[]
  bazi?: BaziInfo
}

Page({
  data: {
    singleChars: [] as CharResult[],
    doubleChars: [] as CharResult[],
    bazi: null as BaziInfo | null,
    expandedIndex: -1,  // 当前展开的索引，-1表示都没展开
    expandedType: ''    // 展开的类型：'single' 或 'double'
  },

  onLoad(options: any) {
    try {
      console.log('结果页接收到的 options:', options)

      if (options.data) {
        const decodedData = decodeURIComponent(options.data)
        console.log('解码后的数据:', decodedData)

        const resultData: ResultData = JSON.parse(decodedData)
        console.log('解析后的 resultData:', resultData)
        console.log('singleChars 数组长度:', resultData.singleChars?.length || 0)
        console.log('doubleChars 数组长度:', resultData.doubleChars?.length || 0)
        console.log('bazi 信息:', resultData.bazi)

        this.setData({
          singleChars: resultData.singleChars || [],
          doubleChars: resultData.doubleChars || [],
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
   * 点击名字卡片
   */
  onCharTap(e: any) {
    const index = e.currentTarget.dataset.index
    const type = e.currentTarget.dataset.type

    // 如果点击的是同一个，则收起；否则展开新的
    if (this.data.expandedType === type && this.data.expandedIndex === index) {
      this.setData({
        expandedIndex: -1,
        expandedType: ''
      })
    } else {
      this.setData({
        expandedIndex: index,
        expandedType: type
      })
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
    const { singleChars, doubleChars, bazi } = this.data
    let text = '【AI智能起名结果】\n\n'

    if (bazi) {
      text += `八字：${bazi.year} ${bazi.month} ${bazi.day} ${bazi.hour}\n`
      if (bazi.wuxingResult) {
        text += `五行：${bazi.wuxingResult}\n`
      }
      text += '\n'
    }

    if (singleChars.length > 0) {
      text += '单字候选：\n'
      singleChars.forEach((char, index) => {
        text += `\n${index + 1}. ${char.fullName}（${char.fullPinyin}）\n`
        text += `   五行：${char.wuxing}\n`
        text += `   分析：${char.analysis}\n`
      })
    }

    if (doubleChars.length > 0) {
      text += '\n双字候选：\n'
      doubleChars.forEach((char, index) => {
        text += `\n${index + 1}. ${char.fullName}（${char.fullPinyin}）\n`
        text += `   五行：${char.wuxing}\n`
        text += `   分析：${char.analysis}\n`
      })
    }

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

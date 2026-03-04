// pages/analysis/analysis.ts
import { invokeEdgeFunction } from '../../utils/supabase'
import { EDGE_FUNCTIONS } from '../../config/supabase'
import { isLoggedIn, getOpenId, login } from '../../utils/auth'
import { checkAndIncrementQuota } from '../../utils/quota'

Page({
  data: {
    fullName: '',
    gender: '',
    loading: false,
    hasResult: false,

    // 生日相关
    hasBirthday: false,
    birthday: '',
    startDate: '1990-01-01',
    endDate: '',
    hourIndex: 0,
    hourOptions: [
      '不选择',
      '子时 (23:00-01:00)',
      '丑时 (01:00-03:00)',
      '寅时 (03:00-05:00)',
      '卯时 (05:00-07:00)',
      '辰时 (07:00-09:00)',
      '巳时 (09:00-11:00)',
      '午时 (11:00-13:00)',
      '未时 (13:00-15:00)',
      '申时 (15:00-17:00)',
      '酉时 (17:00-19:00)',
      '戌时 (19:00-21:00)',
      '亥时 (21:00-23:00)'
    ],

    // 分析结果
    result: {
      basicInfo: null as any,
      charMeanings: [] as any[],
      combinedMeaning: '',
      culturalBackground: '',
      genderAnalysis: null as any,
      wuxingShuli: null as any,
      popularity: null as any,
      suggestions: null as any
    },

    // 收藏状态
    isFavorited: false,

    // 登录相关
    isLoggedIn: false,
    showLoginModal: false,
    loginLoading: false
  },

  onLoad() {
    const today = new Date()
    const endDate = today.toISOString().split('T')[0]
    this.setData({ endDate })
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
  },

  checkLoginStatus() {
    this.setData({
      isLoggedIn: isLoggedIn()
    })
  },

  // 姓名输入
  onNameInput(e: any) {
    this.setData({ fullName: e.detail.value })
  },

  // 姓名输入完成时验证（只在超出时截断）
  onNameBlur(e: any) {
    const value = this.data.fullName || ''
    // 提取汉字
    const chineseChars = value.match(/[\u4e00-\u9fa5]/g) || []
    if (chineseChars.length > 4) {
      this.setData({ fullName: chineseChars.slice(0, 4).join('') })
      wx.showToast({ title: '姓名最多4个汉字', icon: 'none' })
    } else if (chineseChars.length > 0 && chineseChars.join('') !== value) {
      // 如果有非汉字字符，清理掉
      this.setData({ fullName: chineseChars.join('') })
    }
  },

  // 性别选择 - 男
  selectGenderMale() {
    this.setData({ gender: 'male' })
  },

  // 性别选择 - 女
  selectGenderFemale() {
    this.setData({ gender: 'female' })
  },

  // 生日开关
  onBirthdayToggle(e: any) {
    this.setData({
      hasBirthday: e.detail.value,
      birthday: '',
      hourIndex: 0
    })
  },

  // 生日选择
  onBirthdayChange(e: any) {
    this.setData({ birthday: e.detail.value })
  },

  // 时辰选择
  onHourChange(e: any) {
    this.setData({ hourIndex: parseInt(e.detail.value) })
  },

  // 表单验证
  validateForm(): boolean {
    const { fullName, gender } = this.data

    if (!fullName || !fullName.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return false
    }

    // 使用正则匹配汉字数量
    const chineseChars = fullName.match(/[\u4e00-\u9fa5]/g) || []
    if (chineseChars.length < 2 || chineseChars.length > 4) {
      wx.showToast({ title: '请输入2-4个汉字的姓名', icon: 'none' })
      return false
    }

    if (!gender) {
      wx.showToast({ title: '请选择性别', icon: 'none' })
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
      // 构造请求参数
      const params: any = {
        fullName: this.data.fullName.trim(),
        gender: this.data.gender,
        openid: getOpenId()
      }

      // 生日信息（可选）
      if (this.data.hasBirthday && this.data.birthday) {
        params.birthday = this.data.birthday
        if (this.data.hourIndex > 0) {
          const hourMap = [0, 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]
          params.birthHour = hourMap[this.data.hourIndex]
        }
      }

      // 检查名字分析次数
      const allowed = await checkAndIncrementQuota('analysis')
      if (!allowed) {
        this.setData({ loading: false })
        return
      }

      const { data, error } = await invokeEdgeFunction(
        EDGE_FUNCTIONS.nameAnalysis,
        params
      )

      if (error) throw error

      // 转换 API 响应格式
      const apiResult = (data as any).data

      const transformedResult = {
        basicInfo: {
          fullPinyin: apiResult.basicInfo?.fullPinyin || apiResult.basicInfo?.pinyin || '',
          totalStrokes: apiResult.basicInfo?.totalStrokes || apiResult.structure?.totalStrokes || 0,
          structure: apiResult.basicInfo?.structure || apiResult.structure?.balance || '',
          analysis: apiResult.basicInfo?.analysis || apiResult.pronunciation?.harmony || ''
        },
        charMeanings: apiResult.charMeanings || apiResult.chars?.map((c: any) => ({
          char: c.char,
          pinyin: c.pinyin,
          meaning: c.meaning
        })) || [],
        combinedMeaning: apiResult.combinedMeaning || apiResult.meaning?.overall || '',
        culturalBackground: apiResult.culturalBackground || apiResult.meaning?.cultural || '',
        genderAnalysis: apiResult.genderAnalysis || null,
        wuxingShuli: apiResult.wuxingShuli || null,
        popularity: apiResult.popularity || null,
        suggestions: apiResult.suggestions || null
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
    if (!this.data.isLoggedIn) {
      this.setData({ showLoginModal: true })
      return
    }

    await this.doFavorite()
  },

  // 执行收藏操作
  async doFavorite() {
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

  // 关闭登录弹窗
  closeLoginModal() {
    this.setData({ showLoginModal: false })
  },

  // 处理微信登录
  async handleLogin() {
    if (this.data.loginLoading) return

    this.setData({ loginLoading: true })

    try {
      await login()

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })

      this.setData({
        isLoggedIn: true,
        showLoginModal: false
      })

      // 登录成功后自动执行收藏
      setTimeout(() => {
        this.doFavorite()
      }, 500)
    } catch (error: any) {
      console.error('登录失败:', error)
      const errMsg = typeof error === 'string' ? error : (error?.message || '登录失败')
      wx.showToast({
        title: errMsg,
        icon: 'none'
      })
    } finally {
      this.setData({ loginLoading: false })
    }
  },

  // 分享
  handleShare() {
    const { fullName, result } = this.data

    const shareText = `【${fullName}】姓名分析\n\n` +
      `读音：${result.basicInfo?.pinyin || ''}\n` +
      `笔画：${result.basicInfo?.totalStrokes || ''}画\n\n` +
      `组合寓意：\n${result.combinedMeaning || ''}\n\n` +
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

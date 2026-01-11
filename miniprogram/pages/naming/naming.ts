// pages/naming/naming.ts
import { invokeEdgeFunction } from '../../utils/supabase'
import { EDGE_FUNCTIONS } from '../../config/supabase'
import { getOpenId } from '../../utils/auth'

// 风格选项
const STYLE_OPTIONS = [
  { value: 'simple_modern', label: '简约现代' },
  { value: 'classical_elegant', label: '古风雅致' },
  { value: 'poetic_classic', label: '诗词典故' },
  { value: 'sunny_bold', label: '阳光大气' },
  { value: 'gentle_soft', label: '温婉柔美' },
  { value: 'unique_rare', label: '小众独特' }
]

// 名字类型选项
const NAME_TYPE_OPTIONS = [
  { value: 'double', label: '双字名' },
  { value: 'single', label: '单字名' }
]

Page({
  data: {
    // 表单数据
    surname: '',
    gender: 'male',

    // 生日（可选）
    hasBirthday: false,
    birthday: '',
    birthHour: '',

    // 风格
    style: 'simple_modern',
    styleOptions: STYLE_OPTIONS,
    styleIndex: 0,

    // 自定义内容（独立选项）
    useCustomContent: false,
    nameType: 'double',
    nameTypeOptions: NAME_TYPE_OPTIONS,
    nameTypeIndex: 0,
    disabledChars: '',
    preferredChars: '',
    strokeCount: '',

    // 日期选择器
    startDate: '1990-01-01',
    endDate: '',

    // 时辰选项
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
    hourIndex: 0,

    // 加载状态
    loading: false
  },

  onLoad() {
    // 设置日期范围
    const today = new Date()
    const endDate = today.toISOString().split('T')[0]
    this.setData({ endDate })
  },

  // 姓氏输入
  onSurnameInput(e: any) {
    this.setData({ surname: e.detail.value })
  },

  // 姓氏输入完成时验证
  onSurnameBlur(e: any) {
    const value = e.detail.value
    if (value && value.length > 2) {
      // 截取前2个字符
      this.setData({ surname: value.slice(0, 2) })
      wx.showToast({ title: '姓氏最多2个字', icon: 'none' })
    }
  },

  // 性别选择
  onGenderChange(e: any) {
    this.setData({ gender: e.detail.value })
  },

  // 是否填写生日
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

  // 风格选择
  onStyleChange(e: any) {
    const index = parseInt(e.detail.value)
    const style = STYLE_OPTIONS[index].value
    this.setData({
      styleIndex: index,
      style: style
    })
  },

  // 自定义内容展开/收起
  toggleCustomContent() {
    this.setData({
      useCustomContent: !this.data.useCustomContent
    })
  },

  // 名字类型选择
  onNameTypeChange(e: any) {
    const index = parseInt(e.detail.value)
    this.setData({
      nameTypeIndex: index,
      nameType: NAME_TYPE_OPTIONS[index].value
    })
  },

  // 禁用字输入
  onDisabledCharsInput(e: any) {
    this.setData({ disabledChars: e.detail.value })
  },

  // 偏好字输入
  onPreferredCharsInput(e: any) {
    this.setData({ preferredChars: e.detail.value })
  },

  // 笔画数输入
  onStrokeCountInput(e: any) {
    this.setData({ strokeCount: e.detail.value })
  },

  // 表单验证
  validateForm(): boolean {
    const { surname } = this.data

    if (!surname || !surname.trim()) {
      wx.showToast({ title: '请输入姓氏', icon: 'none' })
      return false
    }

    if (surname.length > 2) {
      wx.showToast({ title: '姓氏最多2个字', icon: 'none' })
      return false
    }

    return true
  },

  // 提交表单
  async onSubmit() {
    if (!this.validateForm()) return
    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      // 构造请求参数
      const params: any = {
        surname: this.data.surname.trim(),
        gender: this.data.gender,
        style: this.data.style,
        openid: getOpenId()
      }

      // 生日信息（可选）
      if (this.data.hasBirthday && this.data.birthday) {
        params.birthday = this.data.birthday
        if (this.data.hourIndex > 0) {
          // 转换时辰索引为小时数
          const hourMap = [0, 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]
          params.birthHour = hourMap[this.data.hourIndex]
        }
      }

      // 自定义选项
      if (this.data.useCustomContent) {
        params.customOptions = {
          nameType: this.data.nameType
        }
        if (this.data.disabledChars.trim()) {
          params.customOptions.disabledChars = this.data.disabledChars.trim().split('')
        }
        if (this.data.preferredChars.trim()) {
          params.customOptions.preferredChars = this.data.preferredChars.trim().split('')
        }
        if (this.data.strokeCount) {
          params.customOptions.strokeCount = parseInt(this.data.strokeCount)
        }
      }

      // 调用云函数
      const { data, error } = await invokeEdgeFunction(
        EDGE_FUNCTIONS.namingExpert,
        params
      )

      if (error) {
        throw new Error(error.message || '起名失败')
      }

      // 使用全局存储传递数据（避免 URL 长度限制）
      const app = getApp()
      const fullResponse = data as any
      console.log('起名 API 完整响应:', JSON.stringify(fullResponse))

      // 处理嵌套的 data 结构: { success: true, data: { names: [...], bazi: {...} } }
      const resultData = fullResponse.data || fullResponse
      console.log('提取的结果数据:', JSON.stringify(resultData))
      console.log('names 数组:', JSON.stringify(resultData.names))

      app.globalData = app.globalData || {}
      app.globalData.namingResult = {
        names: resultData.names || [],
        bazi: resultData.bazi || null
      }
      app.globalData.namingParams = params

      console.log('存入 globalData 的结果:', JSON.stringify(app.globalData.namingResult))

      // 跳转到结果页
      wx.navigateTo({
        url: '/pages/naming-result/naming-result'
      })

    } catch (error: any) {
      console.error('起名失败:', error)
      wx.showToast({
        title: error.message || '起名失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  }
})

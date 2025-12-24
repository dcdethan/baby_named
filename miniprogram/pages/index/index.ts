// pages/index/index.ts
import { invokeEdgeFunction } from '../../utils/supabase'
import { EDGE_FUNCTIONS } from '../../config/supabase'
import { NamingParams, Gender, NamingStyle, NamingResponse, UseWuxing, NameCount } from '../../types/index'

interface FormData {
  surname: string
  birthday: string
  gender: Gender
  style: NamingStyle
  useWuxing: UseWuxing
  nameCount: NameCount
}

interface OptionItem {
  label: string
  value: string
}

Page({
  data: {
    formData: {
      surname: '',
      birthday: '',
      gender: 'male',
      style: 'shijing',
      useWuxing: 'yes',
      nameCount: 'single'
    } as FormData,
    loading: false,
    today: '',
    // 五行八字选项
    wuxingOptions: [
      { label: '使用五行八字', value: 'yes' },
      { label: '不用五行八字', value: 'no' }
    ] as OptionItem[],
    wuxingIndex: 0,
    // 名字字数选项
    nameCountOptions: [
      { label: '单字名（姓+1字）', value: 'single' },
      { label: '双字名（姓+2字）', value: 'double' }
    ] as OptionItem[],
    nameCountIndex: 0
  },

  onLoad() {
    // 设置今天的日期作为 picker 的最大值
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    this.setData({
      today: `${year}-${month}-${day}`
    })
  },

  /**
   * 姓氏输入
   */
  onSurnameInput(e: any) {
    let value = e.detail.value
    // 限制最多输入2个字符
    if (value.length > 2) {
      value = value.slice(0, 2)
    }
    this.setData({
      'formData.surname': value
    })
  },

  /**
   * 生日选择
   */
  onBirthdayChange(e: any) {
    this.setData({
      'formData.birthday': e.detail.value
    })
  },

  /**
   * 性别选择
   */
  onGenderChange(e: any) {
    this.setData({
      'formData.gender': e.detail.value
    })
  },

  /**
   * 五行八字选择
   */
  onWuxingChange(e: any) {
    const index = parseInt(e.detail.value)
    this.setData({
      wuxingIndex: index,
      'formData.useWuxing': this.data.wuxingOptions[index].value as UseWuxing
    })
  },

  /**
   * 名字字数选择
   */
  onNameCountChange(e: any) {
    const index = parseInt(e.detail.value)
    this.setData({
      nameCountIndex: index,
      'formData.nameCount': this.data.nameCountOptions[index].value as NameCount
    })
  },

  /**
   * 风格选择
   */
  onStyleChange(e: any) {
    this.setData({
      'formData.style': e.detail.value
    })
  },

  /**
   * 表单验证
   */
  validateForm(): boolean {
    const { surname, birthday } = this.data.formData

    if (!surname.trim()) {
      wx.showToast({
        title: '请输入姓氏',
        icon: 'none'
      })
      return false
    }

    if (!birthday) {
      wx.showToast({
        title: '请选择出生日期',
        icon: 'none'
      })
      return false
    }

    return true
  },

  /**
   * 提交表单
   */
  async onSubmit() {
    if (!this.validateForm()) {
      return
    }

    this.setData({ loading: true })

    try {
      const params: NamingParams = {
        surname: this.data.formData.surname.trim(),
        birthday: this.data.formData.birthday,
        gender: this.data.formData.gender,
        style: this.data.formData.style,
        useWuxing: this.data.formData.useWuxing,
        nameCount: this.data.formData.nameCount
      }

      // 调用 Supabase Edge Function
      const { data, error } = await invokeEdgeFunction<NamingResponse>(
        EDGE_FUNCTIONS.namingExpert,
        params
      )

      console.log('Edge Function 返回的原始数据:', data)
      console.log('Edge Function 错误:', error)

      if (error || !data || !data.success) {
        throw new Error(data?.error || '起名失败，请重试')
      }

      console.log('data.data:', data.data)
      console.log('singleChars 长度:', data.data?.singleChars?.length || 0)
      console.log('doubleChars 长度:', data.data?.doubleChars?.length || 0)

      // 跳转到结果页面
      const resultData = JSON.stringify(data.data)
      console.log('准备传递给结果页的数据:', resultData)

      wx.navigateTo({
        url: `/pages/result/result?data=${encodeURIComponent(resultData)}`
      })

    } catch (err: any) {
      console.error('起名失败:', err)
      wx.showToast({
        title: err.message || '起名失败，请重试',
        icon: 'none',
        duration: 2000
      })
    } finally {
      this.setData({ loading: false })
    }
  }
})

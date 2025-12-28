// pages/index/index.ts
import { invokeEdgeFunction } from '../../utils/supabase'
import { EDGE_FUNCTIONS } from '../../config/supabase'
import { NamingParams, Gender, NamingStyle, NamingResponse, UseWuxing } from '../../types/index'

interface FormData {
  surname: string
  birthday: string
  gender: Gender
  style: NamingStyle
  useWuxing: UseWuxing
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
      useWuxing: 'no'  // 默认不使用五行
    } as FormData,
    loading: false,
    today: ''
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
    this.setData({
      'formData.surname': e.detail.value
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
   * 五行八字开关
   */
  onWuxingChange(e: any) {
    const checked = e.detail.value
    console.log('五行八字开关:', checked)
    this.setData({
      'formData.useWuxing': checked ? 'yes' : 'no'
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

    console.log('表单验证 - 姓氏:', surname, '长度:', surname.length)
    console.log('表单验证 - 生日:', birthday)

    if (!surname || !surname.trim()) {
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
      console.log('提交时 formData:', this.data.formData)
      console.log('提交时 useWuxing:', this.data.formData.useWuxing)

      const params: NamingParams = {
        surname: this.data.formData.surname.trim(),
        birthday: this.data.formData.birthday,
        gender: this.data.formData.gender,
        style: this.data.formData.style,
        useWuxing: this.data.formData.useWuxing
      }

      console.log('发送给后端的 params:', params)

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
      console.log('bazi 信息:', data.data?.bazi)

      // 跳转到结果页面，传递结果数据和原始请求参数
      const resultData = JSON.stringify(data.data)
      const requestParams = JSON.stringify(params)
      console.log('准备传递给结果页的数据:', resultData)
      console.log('准备传递给结果页的请求参数:', requestParams)

      wx.navigateTo({
        url: `/pages/result/result?data=${encodeURIComponent(resultData)}&params=${encodeURIComponent(requestParams)}`
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

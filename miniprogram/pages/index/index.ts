// pages/index/index.ts
import { invokeEdgeFunction } from '../../utils/supabase'
import { EDGE_FUNCTIONS } from '../../config/supabase'
import { NamingParams, Gender, NamingStyle, NamingResponse } from '../../types/index'

interface FormData {
  fatherSurname: string
  motherSurname: string
  birthday: string
  gender: Gender
  style: NamingStyle
}

Page({
  data: {
    formData: {
      fatherSurname: '',
      motherSurname: '',
      birthday: '',
      gender: 'male' as Gender,
      style: 'shijing' as NamingStyle
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
   * 父姓输入
   */
  onFatherSurnameInput(e: any) {
    this.setData({
      'formData.fatherSurname': e.detail.value
    })
  },

  /**
   * 母姓输入
   */
  onMotherSurnameInput(e: any) {
    this.setData({
      'formData.motherSurname': e.detail.value
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
    const { fatherSurname, birthday } = this.data.formData

    if (!fatherSurname.trim()) {
      wx.showToast({
        title: '请输入父亲姓氏',
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
        fatherSurname: this.data.formData.fatherSurname.trim(),
        motherSurname: this.data.formData.motherSurname.trim() || undefined,
        birthday: this.data.formData.birthday,
        gender: this.data.formData.gender,
        style: this.data.formData.style
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
      console.log('data.data.chars 长度:', data.data?.chars?.length || 0)

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

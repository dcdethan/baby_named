// pages/naming-result/naming-result.ts
import { invokeEdgeFunction } from '../../utils/supabase'
import { EDGE_FUNCTIONS } from '../../config/supabase'
import { isLoggedIn, getOpenId, login } from '../../utils/auth'
import { checkAndIncrementQuota } from '../../utils/quota'

// 风格选项（与智慧起名页面一致）
const STYLE_OPTIONS = [
  { value: 'simple_modern', label: '简约现代' },
  { value: 'classical_elegant', label: '古风雅致' },
  { value: 'poetic_classic', label: '诗词典故' },
  { value: 'sunny_bold', label: '阳光大气' },
  { value: 'gentle_soft', label: '温婉柔美' },
  { value: 'unique_rare', label: '小众独特' }
]

// 笔画数理吉凶表（简化版）
const STROKE_LUCK: { [key: number]: string } = {
  1: '大吉', 3: '大吉', 5: '大吉', 6: '大吉', 7: '吉', 8: '吉',
  11: '大吉', 13: '大吉', 15: '大吉', 16: '大吉', 17: '吉', 18: '吉',
  21: '大吉', 23: '大吉', 24: '大吉', 25: '吉', 29: '吉', 31: '大吉',
  32: '大吉', 33: '大吉', 35: '吉', 37: '吉', 39: '吉', 41: '大吉',
  45: '大吉', 47: '吉', 48: '吉', 52: '吉', 57: '吉', 63: '吉', 65: '吉', 67: '吉', 68: '吉'
}

// 五行中文转拼音类名
const WUXING_CLASS: { [key: string]: string } = {
  '金': 'jin', '木': 'mu', '水': 'shui', '火': 'huo', '土': 'tu'
}

Page({
  data: {
    // 结果数据
    names: [] as any[],
    bazi: null as any,

    // 请求参数
    requestParams: null as any,

    // 收藏状态
    favorites: {} as { [key: number]: boolean },

    // 展开的名字索引（-1表示全部收起）
    expandedIndex: -1,

    // 加载状态
    loading: false,
    refreshing: false,

    // 风格选择器
    showStylePicker: false,
    styleOptions: STYLE_OPTIONS,

    // 登录相关
    isLoggedIn: false,
    showLoginModal: false,
    loginLoading: false,
    pendingFavoriteIndex: -1
  },

  onLoad(options: any) {
    this.checkLoginStatus()
    try {
      // 从全局存储获取数据
      const app = getApp()
      console.log('naming-result onLoad, globalData:', JSON.stringify(app.globalData))

      if (app.globalData?.namingResult) {
        console.log('从 globalData 获取到的 namingResult:', JSON.stringify(app.globalData.namingResult))
        console.log('names 数组长度:', app.globalData.namingResult.names?.length)
        console.log('bazi 数据:', JSON.stringify(app.globalData.namingResult.bazi))

        const bazi = this.processBaziData(app.globalData.namingResult.bazi)
        const names = this.processNamesData(app.globalData.namingResult.names || [], bazi)

        this.setData({
          names: names,
          bazi: bazi
        })

        console.log('setData 后的 names:', JSON.stringify(this.data.names))
        console.log('setData 后的 bazi:', JSON.stringify(this.data.bazi))
      }
      if (app.globalData?.namingParams) {
        this.setData({ requestParams: app.globalData.namingParams })
      }

      // 兼容旧的 URL 参数方式
      if (options.data) {
        const data = JSON.parse(decodeURIComponent(options.data))
        const rawBazi = data.data?.bazi || data.bazi || null
        const rawNames = data.data?.names || data.names || []
        const bazi = this.processBaziData(rawBazi)
        this.setData({
          names: this.processNamesData(rawNames, bazi),
          bazi: bazi
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

  onShow() {
    this.checkLoginStatus()
  },

  checkLoginStatus() {
    this.setData({
      isLoggedIn: isLoggedIn()
    })
  },

  /**
   * 处理八字数据，确保五行字段存在
   */
  processBaziData(bazi: any): any {
    if (!bazi) return null

    // 天干对应五行
    const ganWuxing: { [key: string]: string } = {
      '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
      '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
    }
    // 地支对应五行
    const zhiWuxing: { [key: string]: string } = {
      '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
      '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
    }

    // 从干支计算五行的函数
    const calcWuxing = (ganzhi: string): string => {
      if (!ganzhi || ganzhi.length < 2) return ''
      const gan = ganzhi[0]
      const zhi = ganzhi[1]
      return (ganWuxing[gan] || '') + (zhiWuxing[zhi] || '')
    }

    // 如果没有五行字段，从干支计算
    const yearWuxing = bazi.yearWuxing || calcWuxing(bazi.year)
    const monthWuxing = bazi.monthWuxing || calcWuxing(bazi.month)
    const dayWuxing = bazi.dayWuxing || calcWuxing(bazi.day)
    const hourWuxing = bazi.hourWuxing || calcWuxing(bazi.hour)

    // 确保 lackingElements 存在
    const lackingElements = bazi.lackingElements || []

    console.log('处理后的五行数据:', { yearWuxing, monthWuxing, dayWuxing, hourWuxing, lackingElements })

    return {
      ...bazi,
      yearWuxing,
      monthWuxing,
      dayWuxing,
      hourWuxing,
      lackingElements
    }
  },

  /**
   * 处理名字数据，计算五行数理（解析数据在点击时获取）
   */
  processNamesData(names: any[], bazi: any): any[] {
    if (!names || !Array.isArray(names)) {
      return []
    }

    return names.map((name) => {
      // 为每个字添加五行类名
      const charsWithClass = (name.chars || []).map((c: any) => ({
        ...c,
        wuxingClass: WUXING_CLASS[c.wuxing] || ''
      }))

      let wuxingConfig = ''
      let wuxingMatch = false
      let wuxingMatchText = ''
      let totalStrokes = 0

      if (charsWithClass.length > 0) {
        wuxingConfig = charsWithClass.map((c: any) => c.wuxing || '').filter(Boolean).join('-')
        totalStrokes = charsWithClass.reduce((sum: number, c: any) => sum + (c.strokes || 0), 0)

        if (bazi && bazi.lackingElements && bazi.lackingElements.length > 0) {
          const nameWuxing = charsWithClass.map((c: any) => c.wuxing || '').filter(Boolean)
          const matchedElements = bazi.lackingElements.filter((el: string) => nameWuxing.includes(el))
          if (matchedElements.length > 0) {
            wuxingMatch = true
            wuxingMatchText = `补${matchedElements.join('、')}，相合`
          } else {
            wuxingMatchText = '未直接补益'
          }
        } else {
          wuxingMatchText = '五行平衡'
        }
      }

      const strokeRating = STROKE_LUCK[totalStrokes] || '平'

      return {
        ...name,
        chars: charsWithClass.length > 0 ? charsWithClass : name.chars,
        // 解析数据初始为空，点击解析按钮时获取
        analysisItems: [],
        charMeanings: [],
        overallMeaning: '',
        wuxingAnalysis: '',
        wuxingConfig,
        wuxingMatch,
        wuxingMatchText,
        totalStrokes,
        strokeRating
      }
    })
  },

  /**
   * 切换解析展开/收起（点击时请求解析）
   */
  async toggleAnalysis(e: any) {
    const index = e.currentTarget.dataset.index

    // 如果已展开，则收起
    if (this.data.expandedIndex === index) {
      this.setData({ expandedIndex: -1 })
      return
    }

    const name = this.data.names[index]

    // 如果已有解析数据，直接展开
    if (name.analysisItems && name.analysisItems.length > 0 && name.analysisItems[0] !== '加载中...') {
      this.setData({ expandedIndex: index })
      return
    }

    // 设置加载状态
    const loadingNames = [...this.data.names]
    loadingNames[index] = {
      ...loadingNames[index],
      analysisItems: ['加载中...'],
      charMeanings: ['加载中...'],
      overallMeaning: '',
      wuxingAnalysis: ''
    }
    this.setData({
      names: loadingNames,
      expandedIndex: index
    })

    try {
      // 检查起名次数
      const allowed = await checkAndIncrementQuota('naming')
      if (!allowed) {
        // 恢复原状态
        const resetNames = [...this.data.names]
        resetNames[index] = { ...resetNames[index], analysisItems: [], charMeanings: [], overallMeaning: '' }
        this.setData({ names: resetNames, expandedIndex: -1 })
        return
      }

      // 调用后端获取解析
      const nameOnly = name.fullName.replace(this.data.requestParams.surname, '')
      const { data, error } = await invokeEdgeFunction(EDGE_FUNCTIONS.namingExpert, {
        surname: this.data.requestParams.surname,
        gender: this.data.requestParams.gender,
        style: this.data.requestParams.style,
        birthday: this.data.requestParams.birthday,
        birthHour: this.data.requestParams.birthHour,
        analysisName: nameOnly
      })

      if (error) throw error

      // 处理解析结果
      const analysisItems = data.data?.analysisItems || []
      let charMeanings: string[] = []
      let overallMeaning = ''

      analysisItems.forEach((item: string) => {
        if (item.includes('整体寓意') || item.includes('取名')) {
          overallMeaning = item
        } else {
          charMeanings.push(item)
        }
      })

      // 更新名字数据
      const updatedNames = [...this.data.names]
      updatedNames[index] = {
        ...updatedNames[index],
        analysisItems: analysisItems,
        charMeanings: charMeanings.length > 0 ? charMeanings : ['暂无解析'],
        overallMeaning: overallMeaning,
        wuxingAnalysis: data.data?.wuxingAnalysis || ''
      }

      this.setData({ names: updatedNames })

    } catch (e: any) {
      console.error('获取解析失败:', e)
      // 恢复原状态
      const errorNames = [...this.data.names]
      errorNames[index] = {
        ...errorNames[index],
        analysisItems: [],
        charMeanings: ['解析加载失败，请重试'],
        overallMeaning: ''
      }
      this.setData({ names: errorNames })

      wx.showToast({
        title: '解析加载失败',
        icon: 'none'
      })
    }
  },

  /**
   * 收藏/取消收藏
   */
  async toggleFavorite(e: any) {
    const index = e.currentTarget.dataset.index

    if (!this.data.isLoggedIn) {
      this.setData({
        showLoginModal: true,
        pendingFavoriteIndex: index
      })
      return
    }

    await this.doFavorite(index)
  },

  /**
   * 执行收藏操作
   */
  async doFavorite(index: number) {
    const name = this.data.names[index]
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
   * 关闭登录弹窗
   */
  closeLoginModal() {
    this.setData({
      showLoginModal: false,
      pendingFavoriteIndex: -1
    })
  },

  /**
   * 处理微信登录
   */
  async handleLogin() {
    if (this.data.loginLoading) return

    this.setData({ loginLoading: true })

    try {
      await login()

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })

      const pendingIndex = this.data.pendingFavoriteIndex

      this.setData({
        isLoggedIn: true,
        showLoginModal: false,
        pendingFavoriteIndex: -1
      })

      // 登录成功后自动执行收藏
      if (pendingIndex >= 0) {
        setTimeout(() => {
          this.doFavorite(pendingIndex)
        }, 500)
      }
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

  /**
   * 换一批（避免与当前名字重复）
   */
  async handleRefresh() {
    if (this.data.refreshing) return

    this.setData({ refreshing: true, expandedIndex: -1 })

    try {
      // 检查起名次数
      const allowed = await checkAndIncrementQuota('naming')
      if (!allowed) {
        this.setData({ refreshing: false })
        return
      }

      // 获取当前已生成的名字列表，用于排除重复
      const excludeNames = this.data.names.map((n: any) => n.fullName)

      const { data, error } = await invokeEdgeFunction(
        EDGE_FUNCTIONS.namingExpert,
        {
          ...this.data.requestParams,
          excludeNames: excludeNames
        }
      )

      if (error) throw error

      const bazi = this.processBaziData(data.data?.bazi || null)

      this.setData({
        names: this.processNamesData(data.data?.names || [], bazi),
        bazi: bazi,
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
   * 选择风格并重新生成（避免与当前名字重复）
   */
  async selectStyle(e: any) {
    const style = e.currentTarget.dataset.style

    this.setData({ showStylePicker: false })

    if (this.data.refreshing) return

    this.setData({ refreshing: true, expandedIndex: -1 })

    try {
      // 检查起名次数
      const allowed = await checkAndIncrementQuota('naming')
      if (!allowed) {
        this.setData({ refreshing: false })
        return
      }

      // 获取当前已生成的名字列表，用于排除重复
      const excludeNames = this.data.names.map((n: any) => n.fullName)

      const newParams = {
        ...this.data.requestParams,
        style: style,
        excludeNames: excludeNames
      }

      const { data, error } = await invokeEdgeFunction(
        EDGE_FUNCTIONS.namingExpert,
        newParams
      )

      if (error) throw error

      const bazi = this.processBaziData(data.data?.bazi || null)

      this.setData({
        names: this.processNamesData(data.data?.names || [], bazi),
        bazi: bazi,
        favorites: {},
        requestParams: { ...newParams, excludeNames: undefined }  // 保存时去掉 excludeNames
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

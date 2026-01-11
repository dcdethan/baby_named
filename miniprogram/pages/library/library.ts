// pages/library/library.ts
import { invokeEdgeFunction } from '../../utils/supabase'
import { EDGE_FUNCTIONS } from '../../config/supabase'

// 分类选项
const CATEGORIES = [
  { value: 'male', label: '男宝字' },
  { value: 'female', label: '女宝字' },
  { value: 'neutral', label: '中性字' },
  { value: 'classical', label: '古风字' },
  { value: 'poetry', label: '诗词字' },
  { value: 'auspicious', label: '吉祥字' }
]

Page({
  data: {
    // 搜索关键词
    searchKeyword: '',

    // 分类
    categories: CATEGORIES,
    activeCategory: 'male', // 默认男宝字

    // 单字列表
    chars: [] as any[],
    loading: false,

    // 详情弹窗
    showDetail: false,
    selectedChar: {} as any
  },

  onLoad() {
    // 加载默认分类的数据
    this.loadCharsByCategory()
  },

  // 搜索输入
  onSearchInput(e: any) {
    this.setData({ searchKeyword: e.detail.value })
  },

  // 执行搜索
  async handleSearch() {
    const keyword = this.data.searchKeyword.trim()
    if (!keyword) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    try {
      const { data, error } = await invokeEdgeFunction(
        EDGE_FUNCTIONS.characterLibrary,
        {
          filters: { keyword },
          page: 1,
          pageSize: 30
        }
      )

      if (error) throw error

      const result = data as any
      this.setData({
        chars: this.processChars(result.data?.records || [])
      })
    } catch (e: any) {
      console.error('搜索失败:', e)
      wx.showToast({
        title: e.message || '搜索失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 选择分类
  selectCategory(e: any) {
    const category = e.currentTarget.dataset.category
    this.setData({
      activeCategory: category,
      searchKeyword: '' // 清空搜索关键词
    })
    this.loadCharsByCategory()
  },

  // 根据分类加载数据
  async loadCharsByCategory() {
    this.setData({ loading: true })

    try {
      const { data, error } = await invokeEdgeFunction(
        EDGE_FUNCTIONS.characterLibrary,
        {
          filters: { category: this.data.activeCategory },
          page: 1,
          pageSize: 30
        }
      )

      if (error) throw error

      const result = data as any
      this.setData({
        chars: this.processChars(result.data?.records || [])
      })
    } catch (e: any) {
      console.error('加载失败:', e)
      wx.showToast({
        title: e.message || '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 处理字符数据，提取寓意关键词
  processChars(chars: any[]) {
    return chars.map((char, index) => ({
      ...char,
      id: char.id || index,
      meaningKeyword: this.extractMeaningKeyword(char.meaning)
    }))
  },

  // 提取寓意关键词（取前10个字）
  extractMeaningKeyword(meaning: string) {
    if (!meaning) return '暂无'
    return meaning.length > 10 ? meaning.substring(0, 10) + '...' : meaning
  },

  // 显示单字详情
  showCharDetail(e: any) {
    const char = e.currentTarget.dataset.char
    this.setData({
      selectedChar: char,
      showDetail: true
    })
  },

  // 隐藏单字详情
  hideCharDetail() {
    this.setData({
      showDetail: false
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止点击弹窗内容时关闭
  }
})

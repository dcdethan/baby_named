// pages/library/library.ts
import { invokeEdgeFunction } from '../../utils/supabase'
import { EDGE_FUNCTIONS } from '../../config/supabase'
import { checkAndIncrementQuota } from '../../utils/quota'

const CATEGORIES = [
  { value: 'male', label: '男宝宝' },
  { value: 'female', label: '女宝宝' },
  { value: 'neutral', label: '中性字' },
  { value: 'classical', label: '古风字' },
  { value: 'poetry', label: '诗词字' },
  { value: 'auspicious', label: '吉祥字' }
]

const PAGE_SIZE = 12

type CategoryValue = 'male' | 'female' | 'neutral' | 'classical' | 'poetry' | 'auspicious'

Page({
  data: {
    searchKeyword: '',
    categories: CATEGORIES,
    activeCategory: 'male' as CategoryValue,
    chars: [] as any[],
    loading: false,
    showDetail: false,
    selectedChar: {} as any,
  },

  onLoad() {
    this.loadCharsByCategory()
  },

  onSearchInput(e: any) {
    this.setData({ searchKeyword: e.detail.value })
  },

  getCategoryParams(category: CategoryValue) {
    switch (category) {
      case 'male':
        return { gender: 'male' }
      case 'female':
        return { gender: 'female' }
      case 'neutral':
        return { gender: 'neutral' }
      case 'classical':
        return { style: 'classical' }
      case 'poetry':
        return { style: 'poetic' }
      case 'auspicious':
        return { category: 'auspicious' }
      default:
        return {}
    }
  },

  async handleSearch() {
    const keyword = this.data.searchKeyword.trim()
    if (!keyword) {
      wx.showToast({ title: '请输入搜索关键词', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    try {
      const allowed = await checkAndIncrementQuota('library')
      if (!allowed) {
        this.setData({ loading: false })
        return
      }

      const { data, error } = await invokeEdgeFunction(
        EDGE_FUNCTIONS.characterLibrary,
        {
          keyword,
          page: 1,
          pageSize: PAGE_SIZE,
        }
      )

      if (error) throw error

      const result = data as any
      this.setData({
        chars: this.processChars(result.data?.records || [])
      })
    } catch (e: any) {
      console.error('搜索失败:', e)
      wx.showToast({ title: e.message || '搜索失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  selectCategory(e: any) {
    const category = e.currentTarget.dataset.category as CategoryValue
    this.setData({
      activeCategory: category,
      searchKeyword: ''
    })
    this.loadCharsByCategory()
  },

  async refreshCategory() {
    if (this.data.loading) return
    await this.loadCharsByCategory()
  },

  async loadCharsByCategory() {
    this.setData({ loading: true })

    try {
      const allowed = await checkAndIncrementQuota('library')
      if (!allowed) {
        this.setData({ loading: false })
        return
      }

      const params = this.getCategoryParams(this.data.activeCategory as CategoryValue)

      const { data, error } = await invokeEdgeFunction(
        EDGE_FUNCTIONS.characterLibrary,
        {
          ...params,
          page: 1,
          pageSize: PAGE_SIZE,
          random: true,
        }
      )

      if (error) throw error

      const result = data as any
      this.setData({
        chars: this.processChars(result.data?.records || [])
      })
    } catch (e: any) {
      console.error('加载失败:', e)
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  processChars(chars: any[]) {
    return chars.map((char, index) => ({
      ...char,
      id: char.id || `${char.char || ''}-${index}`,
      meaningKeyword: this.extractMeaningKeyword(char.meaning)
    }))
  },

  extractMeaningKeyword(meaning: string) {
    if (!meaning) return '暂无'
    return meaning.length > 10 ? meaning.substring(0, 10) + '...' : meaning
  },

  showCharDetail(e: any) {
    const char = e.currentTarget.dataset.char
    this.setData({
      selectedChar: char,
      showDetail: true
    })
  },

  hideCharDetail() {
    this.setData({ showDetail: false })
  },

  stopPropagation() {
    // no-op
  }
})

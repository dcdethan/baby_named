// types/index.ts

/**
 * 起名风格类型
 */
export type NamingStyle = 'shijing' | 'chuci' | 'modern' | 'zodiac'

/**
 * 性别类型
 */
export type Gender = 'male' | 'female'

/**
 * 起名请求参数
 */
export interface NamingParams {
  fatherSurname: string     // 父姓
  motherSurname?: string    // 母姓（可选）
  birthday: string          // 阳历生日 (YYYY-MM-DD)
  gender: Gender            // 性别
  style: NamingStyle        // 起名风格
}

/**
 * 候选单字结果
 */
export interface CharResult {
  char: string              // 单字
  pinyin: string            // 单字拼音
  wuxing: string            // 单字五行
  fullName: string          // 完整名字（姓+字）
  fullPinyin: string        // 完整名字拼音
  analysis: string          // 名字详细分析
}

/**
 * 起名响应结果
 */
export interface NamingResponse {
  success: boolean
  data?: {
    chars: CharResult[]
    bazi?: {
      year: string
      month: string
      day: string
      hour: string
    }
  }
  error?: string
}

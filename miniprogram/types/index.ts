// types/index.ts

/**
 * 起名风格类型
 */
export type NamingStyle = 'shijing' | 'chuci' | 'modern'

/**
 * 性别类型
 */
export type Gender = 'male' | 'female'

/**
 * 是否使用五行八字
 */
export type UseWuxing = 'yes' | 'no'

/**
 * 起名请求参数
 */
export interface NamingParams {
  surname: string           // 姓氏
  birthday: string          // 阳历生日 (YYYY-MM-DD)
  gender: Gender            // 性别
  style: NamingStyle        // 起名风格
  useWuxing: UseWuxing      // 是否使用五行八字
  expandChar?: string       // 可选：要扩展的单字（用于获取三字名）
}

/**
 * 候选单字结果
 */
export interface CharResult {
  char: string              // 单字或双字
  pinyin: string            // 拼音
  wuxing: string            // 五行
  fullName: string          // 完整名字（姓+名）
  fullPinyin: string        // 完整名字拼音
  analysis: string          // 名字详细分析
}

/**
 * 八字信息
 */
export interface BaziInfo {
  year: string              // 年柱
  month: string             // 月柱
  day: string               // 日柱
  hour: string              // 时柱
  wuxingResult: string      // 五行分析结果（如"缺金、水"或"火旺"）
  wuxingExplanation: string // 五行详细解释
}

/**
 * 起名响应结果
 */
export interface NamingResponse {
  success: boolean
  data?: {
    singleChars?: CharResult[]  // 单字候选
    doubleChars?: CharResult[]  // 双字候选（三字名扩展）
    bazi?: BaziInfo
  }
  error?: string
}

/**
 * 扩展响应结果
 */
export interface ExpandResponse {
  success: boolean
  data?: {
    doubleChars: CharResult[]  // 双字候选（三字名）
  }
  error?: string
}

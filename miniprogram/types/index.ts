// types/index.ts

/**
 * 起名风格枚举
 */
export enum NamingStyle {
  SHIJING = 'shijing',      // 诗经
  CHUCI = 'chuci',          // 楚辞
  MODERN = 'modern',        // 现代
  ZODIAC = 'zodiac'         // 生肖
}

/**
 * 性别枚举
 */
export enum Gender {
  MALE = 'male',
  FEMALE = 'female'
}

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
 * 单个起名结果
 */
export interface NameResult {
  name: string              // 姓名
  pinyin: string            // 拼音
  wuxing: string            // 五行属性
  meaning: string           // 寓意说明
}

/**
 * 起名响应结果
 */
export interface NamingResponse {
  success: boolean
  data?: {
    names: NameResult[]
    bazi?: {
      year: string
      month: string
      day: string
      hour: string
    }
  }
  error?: string
}

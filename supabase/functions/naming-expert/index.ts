// Supabase Edge Function: naming-expert
// 负责 AI 起名的核心逻辑

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 类型定义
interface NamingParams {
  surname: string
  birthday?: string  // 可选：阳历生日
  birthHour?: number // 可选：出生时辰（0-23）
  gender: 'male' | 'female'
  style: 'simple_modern' | 'classical_elegant' | 'poetic_classic' | 'sunny_bold' | 'gentle_soft' | 'unique_rare'  // 6种起名风格
  // 自定义选项
  customOptions?: {
    nameType?: 'single' | 'double'   // 单字/双字
    disabledChars?: string[]         // 禁用字
    preferredChars?: string[]        // 偏好字
    maxStrokeCount?: number          // 最大笔画数
  }
  openid?: string    // 用户标识
  expandChar?: string  // 可选：要扩展的单字
  excludeNames?: string[]  // 可选：需要排除的名字列表（换一批时避免重复）
  analysisName?: string  // 可选：需要解析的名字（不含姓氏）
}

interface BaziInfo {
  year: string
  month: string
  day: string
  hour: string
  yearWuxing: string  // 年柱五行
  monthWuxing: string // 月柱五行
  dayWuxing: string   // 日柱五行
  hourWuxing: string  // 时柱五行
  wuxing: string[]
  wuxingCount: { [key: string]: number }  // 五行统计
  wuxingResult: string
  wuxingExplanation: string
  namingSuggestion: string  // 起名建议
  lackingElements: string[]
  dominantElement: string | null
}

// 候选单字结果
interface CharResult {
  char: string        // 单字
  pinyin: string      // 单字拼音
  wuxing: string      // 单字五行
  fullName: string    // 完整名字（姓+字）
  fullPinyin: string  // 完整名字拼音
  analysis: string    // 名字详细分析
}

// 双字结果（用于三字名扩展）
interface DoubleCharResult {
  char: string        // 双字组合
  pinyin: string      // 双字拼音
  wuxing: string      // 双字五行
  fullName: string    // 完整名字（姓+双字）
  fullPinyin: string  // 完整名字拼音
  analysis: string    // 名字详细分析
}

// 五行相生相克解释
const wuxingExplanations: { [key: string]: string } = {
  '金': '金主义，代表坚毅、果断、公正。金旺者性格刚正，做事有魄力，但需注意过刚易折。',
  '木': '木主仁，代表仁慈、宽厚、生长。木旺者性格温和，富有同情心，但需注意优柔寡断。',
  '水': '水主智，代表聪慧、灵活、深沉。水旺者思维敏捷，善于变通，但需注意过于多虑。',
  '火': '火主礼，代表热情、积极、开朗。火旺者性格活泼，待人热诚，但需注意急躁冲动。',
  '土': '土主信，代表诚实、稳重、包容。土旺者性格踏实，值得信赖，但需注意固执保守。'
}

const wuxingLackExplanations: { [key: string]: string } = {
  '金': '缺金者可能意志力稍弱，建议取名补金，可增强决断力和执行力。',
  '木': '缺木者可能创造力不足，建议取名补木，可增强生机活力和仁爱之心。',
  '水': '缺水者可能思维不够灵活，建议取名补水，可增强智慧和应变能力。',
  '火': '缺火者可能热情不足，建议取名补火，可增强积极性和表达能力。',
  '土': '缺土者可能稳定性不够，建议取名补土，可增强踏实感和信用度。'
}

// 姓氏拼音映射（常用姓氏）
const SURNAME_PINYIN: { [key: string]: string } = {
  '李': 'lǐ', '王': 'wáng', '张': 'zhāng', '刘': 'liú', '陈': 'chén',
  '杨': 'yáng', '黄': 'huáng', '赵': 'zhào', '周': 'zhōu', '吴': 'wú',
  '徐': 'xú', '孙': 'sūn', '马': 'mǎ', '朱': 'zhū', '胡': 'hú',
  '郭': 'guō', '何': 'hé', '高': 'gāo', '林': 'lín', '罗': 'luó',
  '郑': 'zhèng', '梁': 'liáng', '谢': 'xiè', '唐': 'táng', '许': 'xǔ',
  '韩': 'hán', '冯': 'féng', '邓': 'dèng', '曹': 'cáo', '彭': 'péng',
  '曾': 'zēng', '肖': 'xiāo', '田': 'tián', '董': 'dǒng', '袁': 'yuán',
  '潘': 'pān', '于': 'yú', '蒋': 'jiǎng', '蔡': 'cài', '余': 'yú',
  '杜': 'dù', '叶': 'yè', '程': 'chéng', '苏': 'sū', '魏': 'wèi',
  '吕': 'lǚ', '丁': 'dīng', '任': 'rèn', '沈': 'shěn', '姚': 'yáo',
  '卢': 'lú', '姜': 'jiāng', '崔': 'cuī', '钟': 'zhōng', '谭': 'tán',
  '陆': 'lù', '汪': 'wāng', '范': 'fàn', '金': 'jīn', '石': 'shí',
  '廖': 'liào', '贾': 'jiǎ', '夏': 'xià', '韦': 'wéi', '付': 'fù',
  '方': 'fāng', '白': 'bái', '邹': 'zōu', '孟': 'mèng', '熊': 'xióng',
  '秦': 'qín', '邱': 'qiū', '江': 'jiāng', '尹': 'yǐn', '薛': 'xuē',
  '闫': 'yán', '段': 'duàn', '雷': 'léi', '侯': 'hóu', '龙': 'lóng'
}

/**
 * 计算八字五行（支持时辰）
 */
function calculateBazi(birthday: string, birthHour?: number): BaziInfo {
  try {
    const date = new Date(birthday)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = birthHour ?? 12 // 默认中午12点

    const gan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
    const zhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

    const ganWuxing: { [key: string]: string } = {
      '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
      '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
    }

    const zhiWuxing: { [key: string]: string } = {
      '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
      '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
    }

    const yearGanIndex = (year - 4) % 10
    const yearZhiIndex = (year - 4) % 12
    const yearGanZhi = gan[yearGanIndex] + zhi[yearZhiIndex]

    const monthGanIndex = (year * 12 + month) % 10
    const monthZhiIndex = (month - 1) % 12
    const monthGanZhi = gan[monthGanIndex] + zhi[monthZhiIndex]

    const dayGanIndex = Math.floor((date.getTime() / 86400000)) % 10
    const dayZhiIndex = Math.floor((date.getTime() / 86400000)) % 12
    const dayGanZhi = gan[dayGanIndex] + zhi[dayZhiIndex]

    // 根据小时计算时辰（子时23-1点，丑时1-3点，依此类推）
    const hourZhiIndex = Math.floor(((hour + 1) % 24) / 2)
    // 时柱天干根据日干推算
    const hourGanIndex = (dayGanIndex * 2 + hourZhiIndex) % 10
    const hourGanZhi = gan[hourGanIndex] + zhi[hourZhiIndex]

    const wuxing: string[] = [
      ganWuxing[gan[yearGanIndex]],
      zhiWuxing[zhi[yearZhiIndex]],
      ganWuxing[gan[monthGanIndex]],
      zhiWuxing[zhi[monthZhiIndex]],
      ganWuxing[gan[dayGanIndex]],
      zhiWuxing[zhi[dayZhiIndex]],
      ganWuxing[gan[hourGanIndex]],
      zhiWuxing[zhi[hourZhiIndex]]
    ]

    // 计算每柱的五行（天干+地支组合）
    const yearWuxing = ganWuxing[gan[yearGanIndex]] + zhiWuxing[zhi[yearZhiIndex]]
    const monthWuxing = ganWuxing[gan[monthGanIndex]] + zhiWuxing[zhi[monthZhiIndex]]
    const dayWuxing = ganWuxing[gan[dayGanIndex]] + zhiWuxing[zhi[dayZhiIndex]]
    const hourWuxing = ganWuxing[gan[hourGanIndex]] + zhiWuxing[zhi[hourZhiIndex]]

    const wuxingCount: { [key: string]: number } = {}
    wuxing.forEach(wx => {
      wuxingCount[wx] = (wuxingCount[wx] || 0) + 1
    })

    const allWuxing = ['金', '木', '水', '火', '土']
    const lackingElements = allWuxing.filter(wx => !wuxingCount[wx])

    // 找出最旺的五行
    const sortedWuxing = Object.entries(wuxingCount).sort((a, b) => b[1] - a[1])
    const dominantElement = sortedWuxing.length > 0 ? sortedWuxing[0][0] : null

    let wuxingResult = ''
    let wuxingExplanation = ''
    let namingSuggestion = ''

    // 构建五行分布描述
    const wuxingDistribution = Object.entries(wuxingCount)
      .sort((a, b) => b[1] - a[1])
      .map(([element, count]) => `${element}(${count}个)`)
      .join('、')

    if (lackingElements.length > 0) {
      wuxingResult = `五行缺${lackingElements.join('、')}`
      wuxingExplanation = `八字五行分布：${wuxingDistribution}。${lackingElements.map(el => wuxingLackExplanations[el]).join(' ')}`
      if (dominantElement && wuxingCount[dominantElement] >= 3) {
        wuxingExplanation += ` 同时${dominantElement}行较旺（${wuxingCount[dominantElement]}个），${wuxingExplanations[dominantElement]}`
      }
      // 起名建议
      namingSuggestion = `建议选用五行属「${lackingElements.join('」或「')}」的字来补足先天不足。`
      if (dominantElement && wuxingCount[dominantElement] >= 3) {
        // 五行相克关系：金克木、木克土、土克水、水克火、火克金
        const counterElements: { [key: string]: string } = {
          '金': '火', '木': '金', '水': '土', '火': '水', '土': '木'
        }
        namingSuggestion += `同时可考虑用「${counterElements[dominantElement]}」属性的字来平衡过旺的${dominantElement}行。`
      }
    } else {
      wuxingResult = `五行俱全，${dominantElement}行较旺`
      wuxingExplanation = `八字五行分布：${wuxingDistribution}。五行俱全，整体较为平衡。${wuxingExplanations[dominantElement || '土']}`
      namingSuggestion = `五行俱全无明显缺失，起名时可根据喜好选字，建议选用与日主「${dayWuxing[0]}」相生或相同的五行用字，以增强命格优势。`
    }

    return {
      year: yearGanZhi,
      month: monthGanZhi,
      day: dayGanZhi,
      hour: hourGanZhi,
      yearWuxing,
      monthWuxing,
      dayWuxing,
      hourWuxing,
      wuxing,
      wuxingCount,
      wuxingResult,
      wuxingExplanation,
      namingSuggestion,
      lackingElements,
      dominantElement
    }
  } catch (error) {
    console.error('八字计算错误:', error)
    throw new Error('八字计算失败')
  }
}

// 名字方案中的字信息
interface NameChar {
  char: string
  pinyin: string
  wuxing: string
  strokes: number
}

// 单个名字方案
interface NameResult {
  fullName: string
  pinyin: string
  chars: NameChar[]
  analysis: string
  score: number
}

// AI 响应接口
interface AIResponse {
  names: NameResult[]
}

// AI 响应接口 - 双字扩展
interface AIExpandResponse {
  doubleChars: DoubleCharResult[]
}

/**
 * 构造 AI Prompt - 生成候选名字
 */
function buildPrompt(params: NamingParams, bazi: BaziInfo | null): string {
  const { surname, gender, style, customOptions, excludeNames } = params
  const genderText = gender === 'male' ? '男孩' : '女孩'

  const styleMap: { [key: string]: string } = {
    simple_modern: '简约现代：简洁好听、朗朗上口',
    classical_elegant: '古风雅致：诗经楚辞、典雅大方',
    poetic_classic: '诗词典故：唐诗宋词、意境深远',
    sunny_bold: '阳光大气：开朗大方、志向远大',
    gentle_soft: '温婉柔美：温柔优雅、清新脱俗',
    unique_rare: '小众独特：新颖别致、与众不同'
  }

  const isSingleChar = customOptions?.nameType === 'single'
  const charCount = isSingleChar ? 1 : 2

  // 构建附加条件
  let extraRules: string[] = []
  // 只有启用五行分析（有bazi）时才加入五行要求
  if (bazi && bazi.lackingElements && bazi.lackingElements.length > 0) {
    extraRules.push(`名字用字需补五行「${bazi.lackingElements.join('、')}」`)
  }
  if (excludeNames?.length) {
    extraRules.push(`禁止使用这些名字：${excludeNames.join('、')}`)
  }
  if (customOptions?.disabledChars?.length) {
    extraRules.push(`禁止使用这些字：${customOptions.disabledChars.join('、')}`)
  }
  if (customOptions?.preferredChars?.length) {
    extraRules.push(`优先使用这些字：${customOptions.preferredChars.join('、')}`)
  }
  if (customOptions?.maxStrokeCount) {
    extraRules.push(`名字总笔画不超过${customOptions.maxStrokeCount}画`)
  }

  const extraRulesText = extraRules.length > 0 ? `\n${extraRules.map((r, i) => `${i + 5}. ${r}`).join('\n')}` : ''

  // 获取姓氏拼音
  const surnamePinyin = SURNAME_PINYIN[surname] || surname

  const example = isSingleChar
    ? `[{"n":"睿","p":"${surnamePinyin} ruì","c":[["睿","ruì","金",14]],"s":92}]`
    : `[{"n":"景行","p":"${surnamePinyin} jǐng xíng","c":[["景","jǐng","木",12],["行","xíng","水",6]],"s":95}]`

  return `你是专业起名师，请为姓「${surname}」的${genderText}起5个优质的${charCount === 1 ? '单字名（姓+1个字）' : '双字名（姓+2个字）'}。

【起名要求】
1. 风格：${styleMap[style] || '诗意典雅'}
2. 名字要朗朗上口，寓意美好，适合${genderText}
3. 避开俗气的网红字：梓、轩、辰、汐、沐、涵、熙、睿、宸、昊、浩、煜、泽、瑞、萱、琪
4. 不用生僻字、谐音不雅的字${extraRulesText}

【输出格式】
JSON数组，每个对象：
- n: 名字（不含姓，${charCount}个字）
- p: 完整姓名拼音（含姓氏，带声调，如"lǐ jǐng xíng"）
- c: 字的信息数组，每个元素为[字, 拼音, 五行, 笔画]
- s: 评分(80-98)

【示例】
${example}

请直接输出JSON数组，包含5个名字，不要其他文字。`
}

/**
 * 构造 AI Prompt - 生成名字解析
 */
function buildAnalysisPrompt(surname: string, name: string, gender: string, bazi: BaziInfo | null): string {
  const genderText = gender === 'male' ? '男孩' : '女孩'
  const fullName = surname + name
  const chars = name.split('')

  let baziHint = ''
  let wuxingField = ''
  if (bazi) {
    baziHint = `八字${bazi.wuxingResult}。`
    wuxingField = ',"w":"分析名字五行与八字的配合(50字)"'
  }

  // 构建每个字的解析示例
  const charExamples = chars.map(c => `"「${c}」意为...，寓意..."`).join(',')

  return `为${genderText}名字「${fullName}」生成解析。${baziHint}

输出JSON：{"a":[${charExamples},"整体寓意：${fullName}寓意..."]${wuxingField}}

直接输出JSON。`
}

/**
 * 构造 AI Prompt - 生成单字的三字名扩展
 */
function buildExpandPrompt(params: NamingParams, bazi: BaziInfo | null, expandChar: string): string {
  const { surname, gender, style } = params
  const hasBirthday = !!params.birthday
  const genderText = gender === 'male' ? '男孩' : '女孩'

  const styleMap: { [key: string]: string } = {
    simple_modern: '简约现代',
    classical_elegant: '古风雅致',
    poetic_classic: '诗词典故',
    sunny_bold: '阳光大气',
    gentle_soft: '温婉柔美',
    unique_rare: '小众独特'
  }

  let wuxingHint = ''
  if (hasBirthday && bazi) {
    wuxingHint = `\n- 五行：${bazi.wuxingResult}，建议补${bazi.lackingElements.length > 0 ? bazi.lackingElements.join('/') : '无'}`
  }

  return `基于"${expandChar}"为${genderText}扩展3个三字名。

【信息】
- 姓氏：${surname}，已选字：${expandChar}
- 风格：${styleMap[style] || '诗意'}${wuxingHint}

【要求】
1. "${expandChar}"可作第一或第二字，双字需有内在关联
2. 寓意具体，规避网红字和生僻字
3. 音韵和谐${hasBirthday ? '，结合五行' : ''}

【JSON格式】
{"doubleChars":[{"char":"${expandChar}X","pinyin":"","wuxing":"","fullName":"${surname}${expandChar}X","fullPinyin":"","analysis":"含义解释(50字)"}]}

直接输出JSON，3个方案。`
}

/**
 * 调用阿里云通义千问 API - 获取姓名方案（紧凑格式，转换后返回）
 */
async function callQwen(prompt: string, surname: string): Promise<AIResponse> {
  const apiKey = Deno.env.get('QWEN_API_KEY')
  if (!apiKey) {
    throw new Error('QWEN_API_KEY 未配置')
  }

  const fetchStart = Date.now()
  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'qwen3-30b-a3b-instruct-2507',
      messages: [
        { role: 'system', content: '你是起名助手，只输出JSON，不要思考过程，不要解释。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    })
  })
  console.log(`[耗时] AI网络请求: ${Date.now() - fetchStart}ms`)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`AI调用失败: ${response.status} - ${error}`)
  }

  const parseStart = Date.now()
  const data = await response.json()
  let content = data.choices[0]?.message?.content
  console.log(`[耗时] 响应解析: ${Date.now() - parseStart}ms`)

  if (!content) {
    throw new Error('AI 返回内容为空')
  }

  console.log(`[信息] AI原始返回(${content.length}字符):`, content)

  // 清理返回内容
  content = content.trim()

  // 处理 qwen 的思考标签
  if (content.includes('<think>')) {
    const thinkEnd = content.indexOf('</think>')
    if (thinkEnd !== -1) {
      content = content.substring(thinkEnd + 8).trim()
    }
  }

  // 移除 markdown 代码块
  if (content.startsWith('```json')) content = content.slice(7)
  else if (content.startsWith('```')) content = content.slice(3)
  if (content.endsWith('```')) content = content.slice(0, -3)
  content = content.trim()

  // 尝试提取 JSON 数组
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (jsonMatch) {
    content = jsonMatch[0]
  }

  console.log(`[信息] 清理后内容:`, content.substring(0, 500))

  try {
    const parsed = JSON.parse(content)

    // 处理数组格式
    if (Array.isArray(parsed) && parsed.length > 0) {
      const names = parsed.map((item: any) => {
        // 简化对象格式: {n, p, c, a, s}
        if (item.n !== undefined) {
          // 处理 n 字段：如果已包含姓氏则去掉
          let nameOnly = item.n
          if (nameOnly.startsWith(surname)) {
            nameOnly = nameOnly.slice(surname.length)
          }
          return {
            fullName: surname + nameOnly,
            pinyin: item.p || '',
            chars: (item.c || []).map((c: any) => ({
              char: c[0] || '',
              pinyin: c[1] || '',
              wuxing: c[2] || '',
              strokes: c[3] || 0
            })),
            analysisItems: item.a || [],
            score: item.s || 90
          }
        }
        // 完整对象格式（兼容）
        if (item.fullName || item.name) {
          return {
            fullName: item.fullName || (surname + item.name),
            pinyin: item.pinyin || item.p || '',
            chars: (item.chars || []).map((c: any) => ({
              char: c.char || c[0] || '',
              pinyin: c.pinyin || c[1] || '',
              wuxing: c.wuxing || c[2] || '',
              strokes: c.strokes || c[3] || 0
            })),
            analysisItems: item.analysisItems || item.analysis || item.a || [],
            score: item.score || item.s || 90
          }
        }
        // 纯数组格式 [name, chars, analysis, score]
        if (Array.isArray(item)) {
          const [name, chars, analysis, score] = item
          return {
            fullName: surname + name,
            pinyin: '',
            chars: (chars || []).map((c: any) => ({
              char: c[0] || '',
              pinyin: c[1] || '',
              wuxing: c[2] || '',
              strokes: c[3] || 0
            })),
            analysisItems: analysis || [],
            score: score || 90
          }
        }
        return null
      }).filter(Boolean)

      if (names.length > 0) {
        console.log(`[成功] 解析到${names.length}个名字`)
        return { names }
      }
    }

    // 兼容旧格式 {names: [...]}
    if (parsed.names && Array.isArray(parsed.names)) {
      return parsed
    }

    console.error('[错误] 无法解析的格式:', content.substring(0, 300))
    throw new Error('AI返回格式错误')
  } catch (error: any) {
    console.error('[错误] JSON解析失败:', error.message, content.substring(0, 500))
    throw new Error('AI返回格式错误')
  }
}

/**
 * 调用阿里云通义千问 API - 获取三字名扩展
 */
async function callQwenExpand(prompt: string): Promise<AIExpandResponse> {
  const apiKey = Deno.env.get('QWEN_API_KEY')
  if (!apiKey) {
    throw new Error('QWEN_API_KEY 未配置')
  }

  const fetchStart = Date.now()
  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'qwen3-30b-a3b-instruct-2507',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 2000
    })
  })
  console.log(`[耗时] AI网络请求(扩展): ${Date.now() - fetchStart}ms`)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`AI调用失败: ${response.status} - ${error}`)
  }

  const parseStart = Date.now()
  const data = await response.json()
  let content = data.choices[0]?.message?.content
  console.log(`[耗时] 响应解析(扩展): ${Date.now() - parseStart}ms`)

  if (!content) {
    throw new Error('AI 返回内容为空')
  }

  // 清理返回内容
  content = content.trim()
  if (content.startsWith('```json')) content = content.slice(7)
  else if (content.startsWith('```')) content = content.slice(3)
  if (content.endsWith('```')) content = content.slice(0, -3)
  content = content.trim()

  try {
    const parsed = JSON.parse(content)
    if (!parsed.doubleChars || !Array.isArray(parsed.doubleChars) || parsed.doubleChars.length === 0) {
      console.error('AI返回格式错误:', content.substring(0, 200))
      throw new Error('AI返回格式错误')
    }
    return parsed
  } catch (error) {
    console.error('JSON解析失败:', content.substring(0, 500))
    throw new Error('AI返回格式错误')
  }
}

/**
 * 保存到数据库
 */
async function saveToDatabase(
  supabase: any,
  params: NamingParams,
  bazi: BaziInfo | null,
  aiResult: AIResponse
) {
  try {
    const { error } = await supabase
      .from('naming_history')
      .insert({
        openid: params.openid || null,
        type: 'naming',
        params: {
          ...params,
          bazi: bazi ? {
            year: bazi.year,
            month: bazi.month,
            day: bazi.day,
            hour: bazi.hour
          } : null
        },
        result: aiResult
      })

    if (error) {
      console.error('数据库写入错误:', error)
    }
  } catch (error) {
    console.error('数据库写入异常:', error)
  }
}

/**
 * 主处理函数
 */
serve(async (req) => {
  const totalStart = Date.now()

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const params: NamingParams = await req.json()
    console.log(`[耗时] 请求解析: ${Date.now() - totalStart}ms`)

    // 参数验证
    if (!params.surname || !params.gender || !params.style) {
      return new Response(
        JSON.stringify({ success: false, error: '参数不完整：姓氏、性别、风格为必填项' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const hasBirthday = !!params.birthday

    // === 解析请求 ===
    if (params.analysisName) {
      console.log(`[开始] 解析请求: ${params.surname}${params.analysisName}`)

      let bazi: BaziInfo | null = null
      if (hasBirthday) {
        bazi = calculateBazi(params.birthday!, params.birthHour)
      }

      const analysisPrompt = buildAnalysisPrompt(params.surname, params.analysisName, params.gender, bazi)

      // 调用 AI 获取解析
      const apiKey = Deno.env.get('QWEN_API_KEY')
      if (!apiKey) {
        throw new Error('QWEN_API_KEY 未配置')
      }

      const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'qwen3-30b-a3b-instruct-2507',
          messages: [
            { role: 'system', content: '你是起名助手，只输出JSON，不要思考过程。' },
            { role: 'user', content: analysisPrompt }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      })

      if (!response.ok) {
        throw new Error(`AI调用失败: ${response.status}`)
      }

      const data = await response.json()
      let content = data.choices[0]?.message?.content || ''
      console.log('[解析] AI原始返回:', content)

      // 清理返回内容
      content = content.trim()
      if (content.includes('<think>')) {
        const thinkEnd = content.indexOf('</think>')
        if (thinkEnd !== -1) {
          content = content.substring(thinkEnd + 8).trim()
        }
      }
      if (content.startsWith('```json')) content = content.slice(7)
      else if (content.startsWith('```')) content = content.slice(3)
      if (content.endsWith('```')) content = content.slice(0, -3)
      content = content.trim()

      // 尝试提取 JSON 对象
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        content = jsonMatch[0]
      }
      console.log('[解析] 清理后内容:', content)

      try {
        const analysisResult = JSON.parse(content)
        console.log(`[耗时] 解析请求总计: ${Date.now() - totalStart}ms`)
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              analysisItems: analysisResult.a || [],
              wuxingAnalysis: analysisResult.w || null
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (e) {
        console.error('解析结果解析失败:', content)
        throw new Error('AI返回格式错误')
      }
    }

    // === 扩展请求 ===
    if (params.expandChar) {
      console.log(`[开始] 扩展请求: ${params.expandChar}`)

      let bazi: BaziInfo | null = null
      if (hasBirthday) {
        const baziStart = Date.now()
        bazi = calculateBazi(params.birthday!, params.birthHour)
        console.log(`[耗时] 八字计算: ${Date.now() - baziStart}ms`)
      }

      const promptStart = Date.now()
      const expandPrompt = buildExpandPrompt(params, bazi, params.expandChar)
      console.log(`[耗时] Prompt构造: ${Date.now() - promptStart}ms`)

      const aiStart = Date.now()
      const expandResult = await callQwenExpand(expandPrompt)
      console.log(`[耗时] AI调用: ${Date.now() - aiStart}ms`)

      console.log(`[耗时] 总计: ${Date.now() - totalStart}ms`)
      return new Response(
        JSON.stringify({ success: true, data: { doubleChars: expandResult.doubleChars } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // === 初始请求 ===
    console.log(`[开始] 起名请求: 姓=${params.surname}, 性别=${params.gender}, 风格=${params.style}`)

    let bazi: BaziInfo | null = null
    if (hasBirthday) {
      const baziStart = Date.now()
      bazi = calculateBazi(params.birthday!, params.birthHour)
      console.log(`[耗时] 八字计算: ${Date.now() - baziStart}ms`)
    }

    const promptStart = Date.now()
    const prompt = buildPrompt(params, bazi)
    console.log(`[耗时] Prompt构造: ${Date.now() - promptStart}ms`)
    console.log(`[信息] Prompt长度: ${prompt.length}字符`)

    const aiStart = Date.now()
    const aiResult = await callQwen(prompt, params.surname)
    console.log(`[耗时] AI调用: ${Date.now() - aiStart}ms`)

    // 过滤掉 excludeNames 中的重复名字
    let filteredNames = aiResult.names
    if (params.excludeNames && params.excludeNames.length > 0) {
      const excludeSet = new Set(params.excludeNames)
      filteredNames = aiResult.names.filter((n: any) => !excludeSet.has(n.fullName))
      console.log(`[过滤] 原${aiResult.names.length}个，去重后${filteredNames.length}个`)
    }

    const dbStart = Date.now()
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    await saveToDatabase(supabase, params, bazi, { names: filteredNames })
    console.log(`[耗时] 数据库保存: ${Date.now() - dbStart}ms`)

    const responseData = {
      success: true,
      data: {
        names: filteredNames,
        bazi: bazi ? {
          year: bazi.year, month: bazi.month, day: bazi.day, hour: bazi.hour,
          yearWuxing: bazi.yearWuxing, monthWuxing: bazi.monthWuxing,
          dayWuxing: bazi.dayWuxing, hourWuxing: bazi.hourWuxing,
          wuxingResult: bazi.wuxingResult, wuxingExplanation: bazi.wuxingExplanation,
          namingSuggestion: bazi.namingSuggestion
        } : undefined
      }
    }

    console.log(`[耗时] 总计: ${Date.now() - totalStart}ms`)
    console.log(`[结果] 返回${filteredNames.length}个名字`)

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error(`[错误] ${error.message}, 耗时: ${Date.now() - totalStart}ms`)
    return new Response(
      JSON.stringify({ success: false, error: error.message || '服务器错误' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

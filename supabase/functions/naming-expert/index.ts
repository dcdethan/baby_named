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
  style: 'classical' | 'modern' | 'poetic' | 'custom'  // 古典、现代、诗意、自定义
  // 自定义选项（style === 'custom' 时使用）
  customOptions?: {
    nameType?: 'single' | 'double'   // 单字/双字
    disabledChars?: string[]         // 禁用字
    preferredChars?: string[]        // 偏好字
    strokeCount?: number             // 笔画数
  }
  openid?: string    // 用户标识
  expandChar?: string  // 可选：要扩展的单字
}

interface BaziInfo {
  year: string
  month: string
  day: string
  hour: string
  wuxing: string[]
  wuxingResult: string
  wuxingExplanation: string
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

interface DeepSeekResponse {
  chars: CharResult[]
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

    if (lackingElements.length > 0) {
      wuxingResult = `五行缺${lackingElements.join('、')}`
      wuxingExplanation = lackingElements.map(el => wuxingLackExplanations[el]).join(' ')
      if (dominantElement) {
        wuxingExplanation += ` 同时${dominantElement}行较旺，${wuxingExplanations[dominantElement]}`
      }
    } else {
      wuxingResult = `五行${dominantElement}旺`
      wuxingExplanation = wuxingExplanations[dominantElement || '土'] + ' 五行俱全，整体较为平衡。'
    }

    return {
      year: yearGanZhi,
      month: monthGanZhi,
      day: dayGanZhi,
      hour: hourGanZhi,
      wuxing,
      wuxingResult,
      wuxingExplanation,
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

// AI 响应接口 - 新版（3个完整方案）
interface AIResponse {
  names: NameResult[]
}

// AI 响应接口 - 旧版兼容（单字名）
interface AIResponseLegacy {
  singleChars: CharResult[]
}

// AI 响应接口 - 双字扩展
interface AIExpandResponse {
  doubleChars: DoubleCharResult[]
}

/**
 * 构造 AI Prompt - 生成候选名字（3个完整姓名方案）
 */
function buildPrompt(params: NamingParams, bazi: BaziInfo | null): string {
  const { surname, gender, style, customOptions } = params
  const hasBirthday = !!params.birthday

  const genderText = gender === 'male' ? '男孩' : '女孩'

  const styleMap: { [key: string]: string } = {
    classical: `古典风格。名字源自《诗经》《楚辞》等古典文学，体现草木风物与人文美德的典雅意境，气质温润端庄或飘逸深邃，用字古典而不生僻，寓意侧重品德修养与理想追求。`,
    modern: `现代风格。名字源自现代汉语审美词汇，融合自然意象或积极状态，整体简洁明快、音韵悦耳、易读易写，寓意乐观向上，突出智慧、快乐与成长潜力。`,
    poetic: `诗意风格。名字富有诗意和意境美，可融合古典与现代元素，强调意境的营造和情感的表达，用字优美灵动，整体给人以美的享受和想象空间。`,
    custom: `自定义风格。根据用户偏好进行个性化起名。`
  }

  // 根据性别给出的额外提示
  const genderHint = gender === 'male'
    ? '可使用中性词，但不得使用明显女性化的名字。'
    : '可使用中性词，但不得使用明显男性化的名字。'

  // 五行相关提示（仅在有生日时启用）
  let wuxingHint = ''
  if (hasBirthday && bazi) {
    wuxingHint = `
**八字五行信息**
- 八字：${bazi.year} ${bazi.month} ${bazi.day} ${bazi.hour}
- 五行分析：${bazi.wuxingResult}
- 五行详解：${bazi.wuxingExplanation}
- 起名建议：选字时请注意补足缺失的五行，或平衡过旺的五行。推荐的名字必须结合五行属性，帮助孩子补足先天不足。`
  }

  // 自定义选项提示
  let customHint = ''
  if (style === 'custom' && customOptions) {
    const hints: string[] = []
    if (customOptions.nameType === 'single') {
      hints.push('- 名字类型：单字名（姓+1字）')
    } else if (customOptions.nameType === 'double') {
      hints.push('- 名字类型：双字名（姓+2字）')
    }
    if (customOptions.disabledChars && customOptions.disabledChars.length > 0) {
      hints.push(`- 禁用字：${customOptions.disabledChars.join('、')}（不可使用这些字）`)
    }
    if (customOptions.preferredChars && customOptions.preferredChars.length > 0) {
      hints.push(`- 偏好字：${customOptions.preferredChars.join('、')}（优先考虑使用这些字）`)
    }
    if (customOptions.strokeCount) {
      hints.push(`- 笔画数：名字部分总笔画数约为 ${customOptions.strokeCount} 画`)
    }
    if (hints.length > 0) {
      customHint = `\n**自定义要求**\n${hints.join('\n')}`
    }
  }

  // 网红字列表
  const popularChars = '梓、轩、辰、汐、沐、涵、熙、睿、宸、昊、浩、煜、泽、瑞、萱、琪'

  // 确定名字类型
  const nameType = customOptions?.nameType === 'single' ? '单字' : '双字'
  const nameDesc = customOptions?.nameType === 'single' ? '（姓+1字）' : '（姓+2字）'

  return `你是一位精通中国传统文化和姓名学的起名专家。

请推荐3个完整的${nameType}名方案${nameDesc}。

**基本信息**
- 姓氏：${surname}
- 性别：${genderText}
${wuxingHint}${customHint}

**核心要求**

1. **明确表达指向**：每个候选名必须清晰界定表达属性，要么专门描述人，要么专门描绘景/具体意象，二者择一，不可模糊不清、模棱两可。

2. **言之有物**：
   - 若描述人：必须明确指向人的具体品性、才情、品格或未来期许（如仁慈、聪慧、沉稳、志向高远等明确特质），不可用"美好""优秀"等空洞词汇。
   - 若描绘景：必须指向具体可感知的自然景致或文化意象（如清风、明月、松竹、兰芷等具体景物，或诗词中明确的经典意境），不可用"雅致""飘逸"等抽象词汇。

3. **严格规避网红字**：${popularChars}

4. **杜绝生僻字**：避免难认、拗口的汉字。

5. **风格要求**：${styleMap[style]}

6. **性别特征**：${genderHint}

7. **字音和谐**：与姓氏${surname}搭配时音韵流畅，避免谐音不佳。
${hasBirthday ? '\n8. **五行考虑**：推荐的名字需要结合上述五行分析，帮助补足五行不足或平衡五行。' : ''}

**输出格式（严格 JSON）**
{
  "names": [
    {
      "fullName": "${surname}XX",
      "pinyin": "xìng xx",
      "chars": [
        {
          "char": "X",
          "pinyin": "x",
          "wuxing": "金",
          "strokes": 8
        }
      ],
      "analysis": "精准对应表达指向（明确说明是描述人还是描绘景），清晰阐释名字的具体含义和内涵，包括字义解释、文化内涵、寓意期许等，杜绝空洞表述。（100-150字）",
      "score": 95
    }
  ]
}

注意：
- names 数组必须包含恰好 3 个方案
- score 为综合评分（0-100），考虑音韵、寓意、${hasBirthday ? '五行匹配度、' : ''}整体协调性
- chars 数组包含名字中每个字的详细信息
- 请直接输出 JSON，不要有任何其他文字。`
}

/**
 * 构造 AI Prompt - 生成单字的三字名扩展
 */
function buildExpandPrompt(params: NamingParams, bazi: BaziInfo | null, expandChar: string): string {
  const { surname, gender, style } = params
  const hasBirthday = !!params.birthday

  const genderText = gender === 'male' ? '男孩' : '女孩'

  const styleMap: { [key: string]: string } = {
    classical: `古典风格。名字源自《诗经》《楚辞》等古典文学，体现草木风物与人文美德的典雅意境，气质温润端庄或飘逸深邃。`,
    modern: `现代风格。名字源自现代汉语审美词汇，融合自然意象或积极状态，整体简洁明快、音韵悦耳、易读易写。`,
    poetic: `诗意风格。名字富有诗意和意境美，可融合古典与现代元素，强调意境的营造和情感的表达。`,
    custom: `自定义风格。根据用户偏好进行个性化起名。`
  }

  const genderHint = gender === 'male'
    ? '可使用中性词，但不得使用明显女性化的名字。'
    : '可使用中性词，但不得使用明显男性化的名字。'

  let wuxingHint = ''
  if (hasBirthday && bazi) {
    wuxingHint = `
**八字五行信息**
- 八字：${bazi.year} ${bazi.month} ${bazi.day} ${bazi.hour}
- 五行分析：${bazi.wuxingResult}
- 五行详解：${bazi.wuxingExplanation}
- 起名建议：选字时请注意补足缺失的五行，或平衡过旺的五行。推荐的字必须结合五行属性，帮助孩子补足先天不足。`
  }

  const popularChars = '梓、轩、辰、汐、沐、涵、熙、睿、宸、昊、浩、煜、泽、瑞、萱、琪'

  return `你是一位精通中国传统文化和姓名学的起名专家。

用户已选定单字"${expandChar}"，请基于这个字推荐3个双字组合，形成三字名（姓+双字）。
注意："${expandChar}"可以作为名字的第一个字或第二个字。

**基本信息**
- 姓氏：${surname}
- 已选单字：${expandChar}
- 性别：${genderText}
${wuxingHint}

**核心要求**

1. **与单字"${expandChar}"的关联**：推荐的双字必须与"${expandChar}"形成紧密的内在关联，不可随意拼接。双字组合需围绕同一核心含义展开，形成统一、连贯的寓意。

2. **明确表达指向**：每个候选名必须清晰界定表达属性，要么专门描述人，要么专门描绘景/具体意象，二者择一，不可模糊不清、模棱两可。

3. **言之有物**：
   - 若描述人：必须明确指向人的具体品性、才情、品格或未来期许（如仁慈、聪慧、沉稳、志向高远等明确特质），不可用"美好""优秀"等空洞词汇。
   - 若描绘景：必须指向具体可感知的自然景致或文化意象（如清风、明月、松竹、兰芷等具体景物，或诗词中明确的经典意境），不可用"雅致""飘逸"等抽象词汇。

4. **严格规避网红字**：${popularChars}

5. **杜绝生僻字**：避免难认、拗口的汉字。

6. **风格要求**：${styleMap[style] || styleMap.poetic}

7. **性别特征**：${genderHint}

8. **字音和谐**：与姓氏${surname}搭配时音韵流畅，避免谐音不佳。
${hasBirthday ? '\n9. **五行考虑**：推荐的字需要结合上述五行分析，帮助补足五行不足或平衡五行。' : ''}

**输出格式（严格 JSON）**
{
  "doubleChars": [
    {
      "char": "${expandChar}瑞",
      "pinyin": "${expandChar} ruì",
      "wuxing": "金金",
      "fullName": "${surname}${expandChar}瑞",
      "fullPinyin": "xìng ${expandChar} ruì",
      "analysis": "精准对应表达指向（明确说明是描述人还是描绘景），清晰阐释名字的具体含义和双字之间的内在关联，包括字义解释、文化内涵、寓意期许等，杜绝空洞表述。注意：不要在分析中提及五行属性。（80-120字）"
    }
  ]
}

请直接输出 JSON，不要有任何其他文字。`
}

/**
 * 调用 DeepSeek API - 获取姓名方案
 */
async function callDeepSeek(prompt: string): Promise<AIResponse> {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
  console.log('DEEPSEEK_API_KEY 是否存在:', !!apiKey)

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置')
  }

  console.log('准备调用 DeepSeek API...')

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 2000
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('DeepSeek API 调用失败')
    console.error('状态码:', response.status)
    console.error('状态文本:', response.statusText)
    console.error('错误详情:', error)
    throw new Error(`AI 调用失败: ${response.status} - ${error}`)
  }

  const data = await response.json()
  let content = data.choices[0]?.message?.content

  console.log('DeepSeek 原始返回:', content)

  if (!content) {
    throw new Error('AI 返回内容为空')
  }

  // 清理 AI 返回的内容，提取纯 JSON
  content = content.trim()
  // 移除 markdown 代码块标记
  if (content.startsWith('```json')) {
    content = content.slice(7)
  } else if (content.startsWith('```')) {
    content = content.slice(3)
  }
  if (content.endsWith('```')) {
    content = content.slice(0, -3)
  }
  content = content.trim()

  console.log('清理后的内容:', content)

  try {
    const parsed = JSON.parse(content)
    console.log('解析后的数据:', parsed)

    // 验证返回的数据结构
    if (!parsed.names || !Array.isArray(parsed.names)) {
      console.error('names 字段缺失或不是数组:', parsed)
      throw new Error('AI 返回的数据格式错误：缺少 names 数组')
    }
    if (parsed.names.length === 0) {
      console.error('names 数组为空')
      throw new Error('AI 没有返回任何姓名方案')
    }
    console.log('names 数组长度:', parsed.names.length)

    return parsed
  } catch (error) {
    console.error('JSON 解析错误:', content)
    console.error('错误详情:', error)
    throw new Error('AI 返回格式错误')
  }
}

/**
 * 调用 DeepSeek API - 获取三字名扩展
 */
async function callDeepSeekExpand(prompt: string): Promise<AIExpandResponse> {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置')
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 2000
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('DeepSeek API 调用失败')
    console.error('状态码:', response.status)
    console.error('状态文本:', response.statusText)
    console.error('错误详情:', error)
    throw new Error(`AI 调用失败: ${response.status} - ${error}`)
  }

  const data = await response.json()
  let content = data.choices[0]?.message?.content

  console.log('DeepSeek 扩展 原始返回:', content)

  if (!content) {
    throw new Error('AI 返回内容为空')
  }

  // 清理 AI 返回的内容，提取纯 JSON
  content = content.trim()
  // 移除 markdown 代码块标记
  if (content.startsWith('```json')) {
    content = content.slice(7)
  } else if (content.startsWith('```')) {
    content = content.slice(3)
  }
  if (content.endsWith('```')) {
    content = content.slice(0, -3)
  }
  content = content.trim()

  console.log('清理后的扩展内容:', content)

  try {
    const parsed = JSON.parse(content)
    console.log('解析后的扩展数据:', parsed)

    // 验证返回的数据结构
    if (!parsed.doubleChars || !Array.isArray(parsed.doubleChars)) {
      console.error('doubleChars 字段缺失或不是数组:', parsed)
      throw new Error('AI 返回的数据格式错误：缺少 doubleChars 数组')
    }
    if (parsed.doubleChars.length === 0) {
      console.error('doubleChars 数组为空')
      throw new Error('AI 没有返回任何候选双字')
    }
    console.log('doubleChars 数组长度:', parsed.doubleChars.length)

    return parsed
  } catch (error) {
    console.error('JSON 解析错误:', content)
    console.error('错误详情:', error)
    throw new Error('AI 返回格式错误')
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const params: NamingParams = await req.json()

    // 参数验证：姓氏、性别、风格必填，生日可选
    if (!params.surname || !params.gender || !params.style) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '参数不完整：姓氏、性别、风格为必填项'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 判断是否启用五行分析（根据是否有生日自动判断）
    const hasBirthday = !!params.birthday

    // 判断是扩展请求还是初始请求
    if (params.expandChar) {
      // === 扩展请求：生成三字名 ===
      console.log('扩展请求：生成单字 "' + params.expandChar + '" 的三字名')

      let bazi: BaziInfo | null = null
      if (hasBirthday) {
        console.log('计算八字...')
        bazi = calculateBazi(params.birthday!, params.birthHour)
      }

      console.log('构造扩展 Prompt...')
      const expandPrompt = buildExpandPrompt(params, bazi, params.expandChar)

      console.log('调用 DeepSeek API 获取三字名扩展...')
      const expandResult = await callDeepSeekExpand(expandPrompt)

      console.log('AI 返回的 doubleChars 数量:', expandResult.doubleChars.length)
      if (expandResult.doubleChars.length > 0) {
        console.log('第一个候选双字示例:', expandResult.doubleChars[0])
      }

      const responseData = {
        success: true,
        data: {
          doubleChars: expandResult.doubleChars
        }
      }

      console.log('准备返回扩展数据:', JSON.stringify(responseData))

      return new Response(
        JSON.stringify(responseData),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // === 初始请求：生成姓名方案 ===
    console.log('初始请求：生成姓名方案')
    console.log('是否有生日（启用五行）:', hasBirthday)

    let bazi: BaziInfo | null = null
    if (hasBirthday) {
      console.log('计算八字...')
      bazi = calculateBazi(params.birthday!, params.birthHour)
      console.log('八字计算结果:', bazi)
    }

    console.log('构造 Prompt...')
    const prompt = buildPrompt(params, bazi)

    console.log('调用 DeepSeek API...')
    const aiResult = await callDeepSeek(prompt)

    // 打印调试信息
    console.log('AI 返回的 names 数量:', aiResult.names.length)
    if (aiResult.names.length > 0) {
      console.log('第一个姓名方案示例:', aiResult.names[0])
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    await saveToDatabase(supabase, params, bazi, aiResult)

    const responseData = {
      success: true,
      data: {
        names: aiResult.names,
        bazi: bazi ? {
          year: bazi.year,
          month: bazi.month,
          day: bazi.day,
          hour: bazi.hour,
          wuxingResult: bazi.wuxingResult,
          wuxingExplanation: bazi.wuxingExplanation
        } : undefined
      }
    }

    console.log('bazi 是否存在:', !!bazi)
    if (bazi) {
      console.log('bazi 详细内容:', JSON.stringify(bazi))
    }
    console.log('准备返回给前端的数据:', JSON.stringify(responseData))

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('处理错误:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || '服务器错误'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

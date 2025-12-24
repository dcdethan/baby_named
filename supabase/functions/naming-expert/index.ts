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
  birthday: string
  gender: 'male' | 'female'
  style: 'shijing' | 'chuci' | 'modern'
  useWuxing: 'yes' | 'no'
  nameCount: 'single' | 'double'
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
 * 计算八字五行（简化版本）
 */
function calculateBazi(birthday: string): BaziInfo {
  try {
    const date = new Date(birthday)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()

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

    const hourGanZhi = '甲子'

    const wuxing: string[] = [
      ganWuxing[gan[yearGanIndex]],
      zhiWuxing[zhi[yearZhiIndex]],
      ganWuxing[gan[monthGanIndex]],
      zhiWuxing[zhi[monthZhiIndex]],
      ganWuxing[gan[dayGanIndex]],
      zhiWuxing[zhi[dayZhiIndex]]
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

// 更新后的 DeepSeek 响应接口
interface DeepSeekResponseNew {
  singleChars?: CharResult[]
  doubleChars?: CharResult[]
}

/**
 * 构造 AI Prompt - 生成候选名字
 */
function buildPrompt(params: NamingParams, bazi: BaziInfo | null): string {
  const { surname, gender, style, useWuxing, nameCount } = params

  const genderText = gender === 'male' ? '男孩' : '女孩'

  const styleMap: { [key: string]: string } = {
    shijing: `诗经风格。名字源自《诗经》，体现草木风物与人文美德的典雅意境，用字古典而不生僻，整体气质温润端庄，寓意侧重品德修养与生活安宁。`,
    chuci: `楚辞风格。名字源自《楚辞》（以《离骚》《九歌》等为代表），强调香草美人、天地遨游等浪漫意象，气质飘逸深邃，用字可稍具独特性，寓意高远，突出理想追求与精神探索。`,
    modern: `现代风格。名字源自现代汉语审美词汇，融合自然意象或积极状态，整体简洁明快、音韵悦耳、易读易写，寓意乐观向上，突出智慧、快乐与成长潜力。`
  }

  // 根据性别给出的额外提示
  const genderHint = gender === 'male'
    ? '可使用中性词，但不得使用明显女性化的名字。'
    : '可使用中性词，但不得使用明显男性化的名字。'

  // 五行相关提示
  let wuxingHint = ''
  if (useWuxing === 'yes' && bazi) {
    wuxingHint = `
**八字五行信息**
- 八字：${bazi.year} ${bazi.month} ${bazi.day} ${bazi.hour}
- 五行分析：${bazi.wuxingResult}
- 选字时请注意补足缺失的五行，或平衡过旺的五行。`
  }

  // 根据名字字数生成不同的要求
  let nameRequirement = ''
  let outputFormat = ''

  if (nameCount === 'single') {
    nameRequirement = `请推荐6个候选单字，每个字将与姓氏组成两字名（姓+字）。`
    outputFormat = `{
  "singleChars": [
    {
      "char": "瑞",
      "pinyin": "ruì",
      "wuxing": "金",
      "fullName": "${surname}瑞",
      "fullPinyin": "xìng ruì",
      "analysis": "详细分析这个名字的寓意、五行补益、字义解读、文化内涵等（50-80字）"
    }
  ]
}`
  } else if (nameCount === 'double') {
    nameRequirement = `请推荐6个候选双字名，每组双字将与姓氏组成三字名（姓+双字）。`
    outputFormat = `{
  "doubleChars": [
    {
      "char": "子轩",
      "pinyin": "zǐ xuān",
      "wuxing": "水木",
      "fullName": "${surname}子轩",
      "fullPinyin": "xìng zǐ xuān",
      "analysis": "详细分析这个名字的寓意、五行补益、字义解读、文化内涵等（50-80字）"
    }
  ]
}`
  }

  return `你是一位精通中国传统文化和姓名学的起名专家。

${nameRequirement}

**基本信息**
- 姓氏：${surname}
- 性别：${genderText}
${wuxingHint}

**选字要求**
- 风格：${styleMap[style]}
- ${genderHint}
- 数量：精选 6 个候选名
- 每个名字需要：
  1. ${useWuxing === 'yes' ? '补足五行不足或平衡五行' : '寓意美好'}
  2. 与姓氏搭配字音和谐
  3. 符合性别特征
  4. 避免生僻字和谐音不佳的字

**输出格式（严格 JSON）**
${outputFormat}

请直接输出 JSON，不要有任何其他文字。`
}

/**
 * 调用 DeepSeek API
 */
async function callDeepSeek(prompt: string, nameCount: string): Promise<DeepSeekResponseNew> {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置')
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
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
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('DeepSeek API 错误:', error)
    throw new Error('AI 调用失败')
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  console.log('DeepSeek 原始返回:', content)

  if (!content) {
    throw new Error('AI 返回内容为空')
  }

  try {
    const parsed = JSON.parse(content)
    console.log('解析后的数据:', parsed)

    // 根据 nameCount 验证返回的数据结构
    if (nameCount === 'single') {
      if (!parsed.singleChars || !Array.isArray(parsed.singleChars)) {
        console.error('singleChars 字段缺失或不是数组:', parsed)
        throw new Error('AI 返回的数据格式错误：缺少 singleChars 数组')
      }
      if (parsed.singleChars.length === 0) {
        console.error('singleChars 数组为空')
        throw new Error('AI 没有返回任何候选单字')
      }
      console.log('singleChars 数组长度:', parsed.singleChars.length)
    } else if (nameCount === 'double') {
      if (!parsed.doubleChars || !Array.isArray(parsed.doubleChars)) {
        console.error('doubleChars 字段缺失或不是数组:', parsed)
        throw new Error('AI 返回的数据格式错误：缺少 doubleChars 数组')
      }
      if (parsed.doubleChars.length === 0) {
        console.error('doubleChars 数组为空')
        throw new Error('AI 没有返回任何候选双字')
      }
      console.log('doubleChars 数组长度:', parsed.doubleChars.length)
    }

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
  aiResult: DeepSeekResponseNew
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

    if (!params.surname || !params.birthday || !params.gender || !params.style) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '参数不完整'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 根据是否使用五行八字决定是否计算八字
    let bazi: BaziInfo | null = null
    if (params.useWuxing === 'yes') {
      console.log('计算八字...')
      bazi = calculateBazi(params.birthday)
    } else {
      console.log('不使用五行八字')
    }

    console.log('构造 Prompt...')
    const prompt = buildPrompt(params, bazi)

    console.log('调用 DeepSeek API...')
    const aiResult = await callDeepSeek(prompt, params.nameCount)

    // 打印调试信息
    if (params.nameCount === 'single' && aiResult.singleChars) {
      console.log('AI 返回的 singleChars 数量:', aiResult.singleChars.length)
      if (aiResult.singleChars.length > 0) {
        console.log('第一个候选字示例:', aiResult.singleChars[0])
      }
    } else if (params.nameCount === 'double' && aiResult.doubleChars) {
      console.log('AI 返回的 doubleChars 数量:', aiResult.doubleChars.length)
      if (aiResult.doubleChars.length > 0) {
        console.log('第一个候选双字示例:', aiResult.doubleChars[0])
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    await saveToDatabase(supabase, params, bazi, aiResult)

    const responseData = {
      success: true,
      data: {
        singleChars: aiResult.singleChars || undefined,
        doubleChars: aiResult.doubleChars || undefined,
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

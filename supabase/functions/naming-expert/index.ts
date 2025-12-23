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
  fatherSurname: string
  motherSurname?: string
  birthday: string
  gender: 'male' | 'female'
  style: 'shijing' | 'chuci' | 'modern' | 'zodiac'
}

interface BaziInfo {
  year: string
  month: string
  day: string
  hour: string
  wuxing: string[]
  result: string
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
      zhiWuxing[zhi[monthZhiIndex]]
    ]

    const wuxingCount: { [key: string]: number } = {}
    wuxing.forEach(wx => {
      wuxingCount[wx] = (wuxingCount[wx] || 0) + 1
    })

    const allWuxing = ['金', '木', '水', '火', '土']
    const lackingWuxing = allWuxing.filter(wx => !wuxingCount[wx])

    let wuxingResult = ''
    if (lackingWuxing.length > 0) {
      wuxingResult = `缺${lackingWuxing.join('、')}`
    } else {
      const dominant = Object.entries(wuxingCount)
        .sort((a, b) => b[1] - a[1])[0][0]
      wuxingResult = `${dominant}旺`
    }

    return {
      year: yearGanZhi,
      month: monthGanZhi,
      day: dayGanZhi,
      hour: hourGanZhi,
      wuxing,
      result: wuxingResult
    }
  } catch (error) {
    console.error('八字计算错误:', error)
    throw new Error('八字计算失败')
  }
}

/**
 * 构造 AI Prompt - 生成候选单字
 */
function buildPrompt(params: NamingParams, bazi: BaziInfo): string {
  const { fatherSurname, gender, style } = params

  const surname = fatherSurname
  const genderText = gender === 'male' ? '男孩' : '女孩'

  const styleMap: { [key: string]: string } = {
    shijing: '诗经，要求选字温婉典雅，富有诗意',
    chuci: '楚辞，要求选字浪漫豪放，气势磅礴',
    modern: '现代风格，要求选字简洁大方，符合现代审美',
    zodiac: '生肖喜忌，要求结合生肖特点选字'
  }

  return `你是一位精通中国传统文化和姓名学的起名专家。

请根据以下信息为宝宝推荐6个候选单字，每个字将与姓氏组成两字名（姓+字）。

**基本信息**
- 姓氏：${surname}
- 性别：${genderText}
- 八字：${bazi.year} ${bazi.month} ${bazi.day} ${bazi.hour}
- 五行：${bazi.result}

**选字要求**
- 风格：${styleMap[style]}
- 数量：精选 6 个单字
- 每个字需要：
  1. 补足五行不足或平衡五行
  2. 与姓氏搭配字音和谐
  3. 寓意美好，符合性别特征
  4. 避免生僻字和谐音不佳的字

**输出格式（严格 JSON）**
{
  "chars": [
    {
      "char": "瑞",
      "pinyin": "ruì",
      "wuxing": "金",
      "fullName": "${surname}瑞",
      "fullPinyin": "xìng ruì",
      "analysis": "详细分析这个名字的寓意、五行补益、字义解读、文化内涵等（50-80字）"
    }
  ]
}

请直接输出 JSON，不要有任何其他文字。`
}

/**
 * 调用 DeepSeek API
 */
async function callDeepSeek(prompt: string): Promise<DeepSeekResponse> {
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
    console.log('chars 数组长度:', parsed.chars?.length || 0)

    // 验证返回的数据结构
    if (!parsed.chars || !Array.isArray(parsed.chars)) {
      console.error('chars 字段缺失或不是数组:', parsed)
      throw new Error('AI 返回的数据格式错误：缺少 chars 数组')
    }

    if (parsed.chars.length === 0) {
      console.error('chars 数组为空')
      throw new Error('AI 没有返回任何候选单字')
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
  bazi: BaziInfo,
  chars: CharResult[]
) {
  try {
    const { error } = await supabase
      .from('naming_history')
      .insert({
        params: {
          ...params,
          bazi: {
            year: bazi.year,
            month: bazi.month,
            day: bazi.day,
            hour: bazi.hour
          }
        },
        result: { chars }
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

    if (!params.fatherSurname || !params.birthday || !params.gender || !params.style) {
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

    console.log('计算八字...')
    const bazi = calculateBazi(params.birthday)

    console.log('构造 Prompt...')
    const prompt = buildPrompt(params, bazi)

    console.log('调用 DeepSeek API...')
    const aiResult = await callDeepSeek(prompt)

    console.log('AI 返回的 chars 数量:', aiResult.chars?.length || 0)
    if (aiResult.chars && aiResult.chars.length > 0) {
      console.log('第一个候选字示例:', aiResult.chars[0])
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    await saveToDatabase(supabase, params, bazi, aiResult.chars)

    const responseData = {
      success: true,
      data: {
        chars: aiResult.chars,
        bazi: {
          year: bazi.year,
          month: bazi.month,
          day: bazi.day,
          hour: bazi.hour
        }
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

// Supabase Edge Function: name-analysis
// 负责名字分析的核心逻辑

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 名字分析请求参数
interface AnalysisParams {
  fullName: string  // 完整姓名
  openid?: string   // 用户标识
}

// 单字分析结果
interface CharAnalysis {
  char: string
  pinyin: string
  strokes: number
  wuxing: string
  radical: string
  meaning: string
}

// 名字分析结果
interface AnalysisResult {
  fullName: string
  chars: CharAnalysis[]
  pronunciation: {
    pinyin: string
    tones: string
    harmony: string
    score: number
  }
  structure: {
    totalStrokes: number
    balance: string
    score: number
  }
  meaning: {
    overall: string
    cultural: string
    score: number
  }
  wuxing: {
    elements: string[]
    analysis: string
    score: number
  }
  overallScore: number
  suggestions: string[]
}

/**
 * 调用 DeepSeek API 进行名字分析
 */
async function analyzeNameWithAI(fullName: string): Promise<AnalysisResult> {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置')
  }

  const prompt = `你是一位专业的姓名学分析专家。请对以下名字进行全面分析。

**姓名**: ${fullName}

请从以下几个维度进行分析：

1. **字音分析**：分析每个字的读音、声调搭配是否和谐，整体是否朗朗上口
2. **字形分析**：分析每个字的笔画数、结构，整体是否平衡美观
3. **字义分析**：分析每个字的含义、整体名字的寓意、文化内涵
4. **五行分析**：分析每个字的五行属性，整体五行搭配是否协调

**输出格式（严格 JSON）**
{
  "fullName": "${fullName}",
  "chars": [
    {
      "char": "字",
      "pinyin": "zì",
      "strokes": 6,
      "wuxing": "水",
      "radical": "子",
      "meaning": "该字的基本含义和在名字中的寓意"
    }
  ],
  "pronunciation": {
    "pinyin": "完整拼音",
    "tones": "声调描述（如：阳平+去声+阴平）",
    "harmony": "音韵和谐度评价（50-80字）",
    "score": 85
  },
  "structure": {
    "totalStrokes": 24,
    "balance": "结构平衡度评价（50-80字）",
    "score": 80
  },
  "meaning": {
    "overall": "整体寓意分析（80-120字）",
    "cultural": "文化内涵分析（80-120字）",
    "score": 90
  },
  "wuxing": {
    "elements": ["金", "水", "木"],
    "analysis": "五行搭配分析（50-80字）",
    "score": 85
  },
  "overallScore": 85,
  "suggestions": [
    "改进建议1",
    "改进建议2"
  ]
}

注意：
- chars 数组包含名字中每个字的详细分析
- 各项 score 为 0-100 的评分
- overallScore 为综合评分
- suggestions 提供 2-3 条具体的改进建议或使用建议
- 请直接输出 JSON，不要有任何其他文字。`

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('DeepSeek API 调用失败:', error)
    throw new Error(`AI 调用失败: ${response.status}`)
  }

  const data = await response.json()
  let content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('AI 返回内容为空')
  }

  // 清理 AI 返回的内容
  content = content.trim()
  if (content.startsWith('```json')) {
    content = content.slice(7)
  } else if (content.startsWith('```')) {
    content = content.slice(3)
  }
  if (content.endsWith('```')) {
    content = content.slice(0, -3)
  }
  content = content.trim()

  try {
    return JSON.parse(content)
  } catch (error) {
    console.error('JSON 解析错误:', content)
    throw new Error('AI 返回格式错误')
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
    const params: AnalysisParams = await req.json()

    // 参数验证
    if (!params.fullName || params.fullName.length < 2) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '请输入有效的姓名（至少2个字）'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('分析姓名:', params.fullName)

    // 调用 AI 进行分析
    const result = await analyzeNameWithAI(params.fullName)

    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
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

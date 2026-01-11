// Supabase Edge Function: character-library
// 负责常用字库查询的核心逻辑

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 字库查询参数
interface LibraryParams {
  pinyin?: string       // 拼音筛选
  radical?: string      // 偏旁筛选
  wuxing?: string       // 五行筛选
  gender?: 'male' | 'female' | 'neutral'  // 性别倾向
  style?: string        // 风格标签
  minStrokes?: number   // 最小笔画
  maxStrokes?: number   // 最大笔画
  page?: number
  pageSize?: number
}

// 字库条目
interface CharacterEntry {
  char: string
  pinyin: string
  strokes: number
  wuxing: string
  radical: string
  meaning: string
  gender: 'male' | 'female' | 'neutral'
  styles: string[]
}

// 常用起名字库（预设数据）
const characterLibrary: CharacterEntry[] = [
  // 五行: 金
  { char: '瑞', pinyin: 'ruì', strokes: 13, wuxing: '金', radical: '王', meaning: '吉祥、祥瑞', gender: 'neutral', styles: ['classical', 'modern'] },
  { char: '锦', pinyin: 'jǐn', strokes: 13, wuxing: '金', radical: '钅', meaning: '华丽、美好', gender: 'neutral', styles: ['classical', 'poetic'] },
  { char: '铭', pinyin: 'míng', strokes: 11, wuxing: '金', radical: '钅', meaning: '铭记、铭刻', gender: 'male', styles: ['classical'] },
  { char: '钧', pinyin: 'jūn', strokes: 9, wuxing: '金', radical: '钅', meaning: '权衡、均衡', gender: 'male', styles: ['classical'] },
  { char: '鑫', pinyin: 'xīn', strokes: 24, wuxing: '金', radical: '金', meaning: '兴旺、多金', gender: 'neutral', styles: ['modern'] },
  { char: '锐', pinyin: 'ruì', strokes: 12, wuxing: '金', radical: '钅', meaning: '锋利、敏锐', gender: 'male', styles: ['modern'] },
  { char: '钰', pinyin: 'yù', strokes: 10, wuxing: '金', radical: '钅', meaning: '珍宝、玉', gender: 'female', styles: ['classical', 'poetic'] },
  { char: '珊', pinyin: 'shān', strokes: 9, wuxing: '金', radical: '王', meaning: '珊瑚', gender: 'female', styles: ['poetic'] },
  { char: '珍', pinyin: 'zhēn', strokes: 9, wuxing: '金', radical: '王', meaning: '珍贵、珍惜', gender: 'female', styles: ['classical'] },
  { char: '瑾', pinyin: 'jǐn', strokes: 15, wuxing: '金', radical: '王', meaning: '美玉', gender: 'female', styles: ['classical', 'poetic'] },

  // 五行: 木
  { char: '林', pinyin: 'lín', strokes: 8, wuxing: '木', radical: '木', meaning: '树林、茂盛', gender: 'neutral', styles: ['modern'] },
  { char: '森', pinyin: 'sēn', strokes: 12, wuxing: '木', radical: '木', meaning: '森林、繁茂', gender: 'male', styles: ['modern'] },
  { char: '柏', pinyin: 'bǎi', strokes: 9, wuxing: '木', radical: '木', meaning: '柏树、坚韧', gender: 'male', styles: ['classical'] },
  { char: '桐', pinyin: 'tóng', strokes: 10, wuxing: '木', radical: '木', meaning: '梧桐、高洁', gender: 'neutral', styles: ['classical', 'poetic'] },
  { char: '松', pinyin: 'sōng', strokes: 8, wuxing: '木', radical: '木', meaning: '松树、坚强', gender: 'male', styles: ['classical'] },
  { char: '楠', pinyin: 'nán', strokes: 13, wuxing: '木', radical: '木', meaning: '楠木、珍贵', gender: 'neutral', styles: ['classical'] },
  { char: '杉', pinyin: 'shān', strokes: 7, wuxing: '木', radical: '木', meaning: '杉树、挺拔', gender: 'male', styles: ['modern'] },
  { char: '槿', pinyin: 'jǐn', strokes: 15, wuxing: '木', radical: '木', meaning: '木槿花', gender: 'female', styles: ['poetic'] },
  { char: '芷', pinyin: 'zhǐ', strokes: 7, wuxing: '木', radical: '艹', meaning: '香草、高洁', gender: 'female', styles: ['classical', 'poetic'] },
  { char: '蕊', pinyin: 'ruǐ', strokes: 15, wuxing: '木', radical: '艹', meaning: '花蕊、纯真', gender: 'female', styles: ['poetic'] },

  // 五行: 水
  { char: '泽', pinyin: 'zé', strokes: 8, wuxing: '水', radical: '氵', meaning: '润泽、恩泽', gender: 'male', styles: ['classical', 'modern'] },
  { char: '润', pinyin: 'rùn', strokes: 10, wuxing: '水', radical: '氵', meaning: '润泽、滋润', gender: 'neutral', styles: ['classical'] },
  { char: '澄', pinyin: 'chéng', strokes: 15, wuxing: '水', radical: '氵', meaning: '清澈、澄明', gender: 'neutral', styles: ['poetic'] },
  { char: '渊', pinyin: 'yuān', strokes: 11, wuxing: '水', radical: '氵', meaning: '深渊、渊博', gender: 'male', styles: ['classical'] },
  { char: '浩', pinyin: 'hào', strokes: 10, wuxing: '水', radical: '氵', meaning: '浩大、广阔', gender: 'male', styles: ['modern'] },
  { char: '溪', pinyin: 'xī', strokes: 13, wuxing: '水', radical: '氵', meaning: '小溪、清澈', gender: 'female', styles: ['poetic'] },
  { char: '漪', pinyin: 'yī', strokes: 14, wuxing: '水', radical: '氵', meaning: '水波、涟漪', gender: 'female', styles: ['poetic'] },
  { char: '澜', pinyin: 'lán', strokes: 15, wuxing: '水', radical: '氵', meaning: '波澜、壮阔', gender: 'neutral', styles: ['classical', 'poetic'] },
  { char: '清', pinyin: 'qīng', strokes: 11, wuxing: '水', radical: '氵', meaning: '清澈、纯洁', gender: 'neutral', styles: ['classical', 'poetic'] },
  { char: '霖', pinyin: 'lín', strokes: 16, wuxing: '水', radical: '雨', meaning: '甘霖、润泽', gender: 'male', styles: ['classical'] },

  // 五行: 火
  { char: '煜', pinyin: 'yù', strokes: 13, wuxing: '火', radical: '火', meaning: '照耀、光明', gender: 'male', styles: ['classical'] },
  { char: '炜', pinyin: 'wěi', strokes: 8, wuxing: '火', radical: '火', meaning: '光辉、灿烂', gender: 'male', styles: ['modern'] },
  { char: '烨', pinyin: 'yè', strokes: 10, wuxing: '火', radical: '火', meaning: '火盛、光明', gender: 'male', styles: ['classical'] },
  { char: '焕', pinyin: 'huàn', strokes: 11, wuxing: '火', radical: '火', meaning: '焕发、光彩', gender: 'neutral', styles: ['modern'] },
  { char: '晨', pinyin: 'chén', strokes: 11, wuxing: '火', radical: '日', meaning: '早晨、希望', gender: 'neutral', styles: ['modern'] },
  { char: '曦', pinyin: 'xī', strokes: 20, wuxing: '火', radical: '日', meaning: '晨光、阳光', gender: 'female', styles: ['poetic'] },
  { char: '晴', pinyin: 'qíng', strokes: 12, wuxing: '火', radical: '日', meaning: '晴朗、明亮', gender: 'female', styles: ['modern'] },
  { char: '昭', pinyin: 'zhāo', strokes: 9, wuxing: '火', radical: '日', meaning: '光明、显著', gender: 'male', styles: ['classical'] },
  { char: '旭', pinyin: 'xù', strokes: 6, wuxing: '火', radical: '日', meaning: '旭日、朝气', gender: 'male', styles: ['modern'] },
  { char: '灿', pinyin: 'càn', strokes: 7, wuxing: '火', radical: '火', meaning: '灿烂、鲜明', gender: 'neutral', styles: ['modern'] },

  // 五行: 土
  { char: '坤', pinyin: 'kūn', strokes: 8, wuxing: '土', radical: '土', meaning: '大地、坤德', gender: 'male', styles: ['classical'] },
  { char: '垚', pinyin: 'yáo', strokes: 9, wuxing: '土', radical: '土', meaning: '土高、高大', gender: 'male', styles: ['classical'] },
  { char: '培', pinyin: 'péi', strokes: 11, wuxing: '土', radical: '土', meaning: '培养、栽培', gender: 'neutral', styles: ['modern'] },
  { char: '坚', pinyin: 'jiān', strokes: 7, wuxing: '土', radical: '土', meaning: '坚强、坚定', gender: 'male', styles: ['modern'] },
  { char: '磊', pinyin: 'lěi', strokes: 15, wuxing: '土', radical: '石', meaning: '光明磊落', gender: 'male', styles: ['modern'] },
  { char: '岩', pinyin: 'yán', strokes: 8, wuxing: '土', radical: '山', meaning: '岩石、坚韧', gender: 'male', styles: ['modern'] },
  { char: '峰', pinyin: 'fēng', strokes: 10, wuxing: '土', radical: '山', meaning: '山峰、顶峰', gender: 'male', styles: ['modern'] },
  { char: '岚', pinyin: 'lán', strokes: 7, wuxing: '土', radical: '山', meaning: '山间雾气', gender: 'female', styles: ['poetic'] },
  { char: '瑛', pinyin: 'yīng', strokes: 12, wuxing: '土', radical: '王', meaning: '美玉光彩', gender: 'female', styles: ['classical'] },
  { char: '嫣', pinyin: 'yān', strokes: 14, wuxing: '土', radical: '女', meaning: '鲜艳美丽', gender: 'female', styles: ['poetic'] },

  // 更多常用字
  { char: '安', pinyin: 'ān', strokes: 6, wuxing: '土', radical: '宀', meaning: '安宁、平安', gender: 'neutral', styles: ['classical', 'modern'] },
  { char: '宁', pinyin: 'níng', strokes: 5, wuxing: '火', radical: '宀', meaning: '安宁、宁静', gender: 'neutral', styles: ['classical', 'modern'] },
  { char: '和', pinyin: 'hé', strokes: 8, wuxing: '水', radical: '禾', meaning: '和谐、平和', gender: 'neutral', styles: ['classical'] },
  { char: '逸', pinyin: 'yì', strokes: 11, wuxing: '土', radical: '辶', meaning: '安逸、飘逸', gender: 'neutral', styles: ['classical', 'poetic'] },
  { char: '远', pinyin: 'yuǎn', strokes: 7, wuxing: '土', radical: '辶', meaning: '深远、远大', gender: 'male', styles: ['classical'] },
  { char: '志', pinyin: 'zhì', strokes: 7, wuxing: '火', radical: '心', meaning: '志向、意志', gender: 'male', styles: ['classical', 'modern'] },
  { char: '思', pinyin: 'sī', strokes: 9, wuxing: '金', radical: '心', meaning: '思考、思念', gender: 'neutral', styles: ['classical', 'poetic'] },
  { char: '悦', pinyin: 'yuè', strokes: 10, wuxing: '金', radical: '忄', meaning: '喜悦、愉悦', gender: 'female', styles: ['modern'] },
  { char: '怡', pinyin: 'yí', strokes: 8, wuxing: '土', radical: '忄', meaning: '怡然、愉快', gender: 'female', styles: ['modern'] },
  { char: '雅', pinyin: 'yǎ', strokes: 12, wuxing: '木', radical: '隹', meaning: '高雅、文雅', gender: 'female', styles: ['classical', 'poetic'] },
  { char: '韵', pinyin: 'yùn', strokes: 13, wuxing: '土', radical: '音', meaning: '韵味、韵律', gender: 'female', styles: ['poetic'] },
  { char: '颜', pinyin: 'yán', strokes: 15, wuxing: '木', radical: '页', meaning: '容颜、色彩', gender: 'female', styles: ['classical'] },
  { char: '轩', pinyin: 'xuān', strokes: 7, wuxing: '土', radical: '车', meaning: '高远、气宇轩昂', gender: 'male', styles: ['classical', 'modern'] },
  { char: '辰', pinyin: 'chén', strokes: 7, wuxing: '土', radical: '辰', meaning: '时辰、星辰', gender: 'neutral', styles: ['classical', 'modern'] },
  { char: '昊', pinyin: 'hào', strokes: 8, wuxing: '火', radical: '日', meaning: '天空广大', gender: 'male', styles: ['classical'] },
]

/**
 * 筛选字库
 */
function filterCharacters(params: LibraryParams): CharacterEntry[] {
  let result = [...characterLibrary]

  // 拼音筛选
  if (params.pinyin) {
    const pinyinLower = params.pinyin.toLowerCase()
    result = result.filter(c => c.pinyin.toLowerCase().includes(pinyinLower))
  }

  // 偏旁筛选
  if (params.radical) {
    result = result.filter(c => c.radical === params.radical)
  }

  // 五行筛选
  if (params.wuxing) {
    result = result.filter(c => c.wuxing === params.wuxing)
  }

  // 性别筛选
  if (params.gender) {
    result = result.filter(c => c.gender === params.gender || c.gender === 'neutral')
  }

  // 风格筛选
  if (params.style) {
    result = result.filter(c => c.styles.includes(params.style!))
  }

  // 笔画筛选
  if (params.minStrokes) {
    result = result.filter(c => c.strokes >= params.minStrokes!)
  }
  if (params.maxStrokes) {
    result = result.filter(c => c.strokes <= params.maxStrokes!)
  }

  return result
}

/**
 * 主处理函数
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const params: LibraryParams = await req.json()

    const page = params.page || 1
    const pageSize = params.pageSize || 15

    // 筛选字库
    const filtered = filterCharacters(params)

    // 分页
    const from = (page - 1) * pageSize
    const to = from + pageSize
    const records = filtered.slice(from, to)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          records,
          total: filtered.length,
          page,
          pageSize,
          hasMore: filtered.length > to
        }
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

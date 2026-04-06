// Supabase Edge Function: character-library
// 字库查询：支持分类、关键词、筛选、分页、随机换一批

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface LibraryParams {
  keyword?: string
  category?: "auspicious"
  pinyin?: string
  radical?: string
  wuxing?: "金" | "木" | "水" | "火" | "土"
  gender?: "male" | "female" | "neutral"
  style?: "classical" | "modern" | "poetic" | "auspicious"
  minStrokes?: number
  maxStrokes?: number
  page?: number
  pageSize?: number
  random?: boolean
}

interface CharacterEntry {
  id: string
  char: string
  pinyin: string
  strokes: number
  wuxing: "金" | "木" | "水" | "火" | "土"
  radical: string
  meaning: string
  gender: "male" | "female" | "neutral"
  styles: Array<"classical" | "modern" | "poetic" | "auspicious">
  traditional?: string
  original_meaning?: string
  name_examples?: string[]
  popularity?: number
}

const characterLibrary: CharacterEntry[] = [
  { id: "c001", char: "瑞", pinyin: "rui", strokes: 13, wuxing: "金", radical: "王", meaning: "吉祥、祥瑞", gender: "neutral", styles: ["classical", "auspicious"], traditional: "瑞", original_meaning: "祥瑞之玉", name_examples: ["瑞安", "瑞宁"], popularity: 86 },
  { id: "c002", char: "铭", pinyin: "ming", strokes: 11, wuxing: "金", radical: "钅", meaning: "铭记、卓越", gender: "male", styles: ["classical", "modern"], traditional: "銘", original_meaning: "刻写记志", name_examples: ["铭远", "铭哲"], popularity: 79 },
  { id: "c003", char: "钧", pinyin: "jun", strokes: 9, wuxing: "金", radical: "钅", meaning: "均衡、庄重", gender: "male", styles: ["classical"], traditional: "鈞", original_meaning: "古代重量单位", name_examples: ["钧泽", "钧逸"], popularity: 68 },
  { id: "c004", char: "锦", pinyin: "jin", strokes: 13, wuxing: "金", radical: "钅", meaning: "锦绣、华美", gender: "neutral", styles: ["modern", "poetic"], traditional: "錦", original_meaning: "彩色丝织物", name_examples: ["锦然", "锦安"], popularity: 84 },
  { id: "c005", char: "钰", pinyin: "yu", strokes: 10, wuxing: "金", radical: "钅", meaning: "珍宝、坚美", gender: "female", styles: ["modern", "auspicious"], traditional: "鈺", original_meaning: "珍贵宝物", name_examples: ["钰宁", "钰涵"], popularity: 88 },

  { id: "c006", char: "林", pinyin: "lin", strokes: 8, wuxing: "木", radical: "木", meaning: "生机、茂盛", gender: "neutral", styles: ["modern"], traditional: "林", original_meaning: "树木成片", name_examples: ["林安", "林悦"], popularity: 73 },
  { id: "c007", char: "桐", pinyin: "tong", strokes: 10, wuxing: "木", radical: "木", meaning: "高洁、坚韧", gender: "neutral", styles: ["classical", "poetic"], traditional: "桐", original_meaning: "梧桐木", name_examples: ["桐宁", "桐言"], popularity: 76 },
  { id: "c008", char: "杉", pinyin: "shan", strokes: 7, wuxing: "木", radical: "木", meaning: "挺拔、坚强", gender: "male", styles: ["modern"], traditional: "杉", original_meaning: "杉木", name_examples: ["杉宇", "杉然"], popularity: 61 },
  { id: "c009", char: "槿", pinyin: "jin", strokes: 15, wuxing: "木", radical: "木", meaning: "温柔、朝气", gender: "female", styles: ["poetic"], traditional: "槿", original_meaning: "木槿花", name_examples: ["槿禾", "槿妍"], popularity: 69 },
  { id: "c010", char: "若", pinyin: "ruo", strokes: 8, wuxing: "木", radical: "艹", meaning: "文雅、灵动", gender: "female", styles: ["classical", "poetic"], traditional: "若", original_meaning: "如同", name_examples: ["若溪", "若彤"], popularity: 83 },

  { id: "c011", char: "泽", pinyin: "ze", strokes: 8, wuxing: "水", radical: "氵", meaning: "恩泽、润物", gender: "male", styles: ["classical", "modern"], traditional: "澤", original_meaning: "水聚之地", name_examples: ["泽宇", "泽言"], popularity: 90 },
  { id: "c012", char: "润", pinyin: "run", strokes: 10, wuxing: "水", radical: "氵", meaning: "温润、滋养", gender: "neutral", styles: ["classical"], traditional: "潤", original_meaning: "滋润", name_examples: ["润安", "润宁"], popularity: 77 },
  { id: "c013", char: "清", pinyin: "qing", strokes: 11, wuxing: "水", radical: "氵", meaning: "清澈、纯净", gender: "neutral", styles: ["classical", "poetic"], traditional: "清", original_meaning: "水纯净", name_examples: ["清远", "清妍"], popularity: 81 },
  { id: "c014", char: "涵", pinyin: "han", strokes: 11, wuxing: "水", radical: "氵", meaning: "包容、涵养", gender: "female", styles: ["modern", "poetic"], traditional: "涵", original_meaning: "包容蕴含", name_examples: ["涵月", "涵宁"], popularity: 92 },
  { id: "c015", char: "霖", pinyin: "lin", strokes: 16, wuxing: "水", radical: "雨", meaning: "甘霖、恩惠", gender: "male", styles: ["classical", "auspicious"], traditional: "霖", original_meaning: "久下不停的雨", name_examples: ["霖川", "霖安"], popularity: 74 },

  { id: "c016", char: "煜", pinyin: "yu", strokes: 13, wuxing: "火", radical: "火", meaning: "光耀、明亮", gender: "male", styles: ["classical", "modern"], traditional: "煜", original_meaning: "照耀", name_examples: ["煜辰", "煜哲"], popularity: 85 },
  { id: "c017", char: "炜", pinyin: "wei", strokes: 8, wuxing: "火", radical: "火", meaning: "光辉、出众", gender: "male", styles: ["modern"], traditional: "煒", original_meaning: "光彩鲜明", name_examples: ["炜轩", "炜然"], popularity: 71 },
  { id: "c018", char: "昕", pinyin: "xin", strokes: 8, wuxing: "火", radical: "日", meaning: "朝阳、希望", gender: "female", styles: ["modern", "poetic"], traditional: "昕", original_meaning: "太阳将出", name_examples: ["昕悦", "昕然"], popularity: 89 },
  { id: "c019", char: "昭", pinyin: "zhao", strokes: 9, wuxing: "火", radical: "日", meaning: "明朗、显著", gender: "male", styles: ["classical"], traditional: "昭", original_meaning: "明亮", name_examples: ["昭远", "昭宁"], popularity: 66 },
  { id: "c020", char: "晗", pinyin: "han", strokes: 11, wuxing: "火", radical: "日", meaning: "天将明、温暖", gender: "female", styles: ["poetic"], traditional: "晗", original_meaning: "天将明时", name_examples: ["晗月", "晗清"], popularity: 78 },

  { id: "c021", char: "坤", pinyin: "kun", strokes: 8, wuxing: "土", radical: "土", meaning: "厚重、包容", gender: "male", styles: ["classical"], traditional: "坤", original_meaning: "大地", name_examples: ["坤宇", "坤泽"], popularity: 70 },
  { id: "c022", char: "培", pinyin: "pei", strokes: 11, wuxing: "土", radical: "土", meaning: "培养、根基", gender: "neutral", styles: ["modern"], traditional: "培", original_meaning: "培育", name_examples: ["培安", "培宁"], popularity: 63 },
  { id: "c023", char: "峻", pinyin: "jun", strokes: 10, wuxing: "土", radical: "山", meaning: "高峻、坚毅", gender: "male", styles: ["modern", "classical"], traditional: "峻", original_meaning: "山高而陡", name_examples: ["峻熙", "峻哲"], popularity: 67 },
  { id: "c024", char: "岚", pinyin: "lan", strokes: 7, wuxing: "土", radical: "山", meaning: "山间雾气、清雅", gender: "female", styles: ["poetic"], traditional: "嵐", original_meaning: "山林雾气", name_examples: ["岚清", "岚月"], popularity: 80 },
  { id: "c025", char: "安", pinyin: "an", strokes: 6, wuxing: "土", radical: "宀", meaning: "平安、安定", gender: "neutral", styles: ["classical", "auspicious"], traditional: "安", original_meaning: "安宁", name_examples: ["安然", "安宁"], popularity: 95 },

  { id: "c026", char: "宁", pinyin: "ning", strokes: 5, wuxing: "火", radical: "宀", meaning: "宁静、从容", gender: "neutral", styles: ["classical", "auspicious"], traditional: "寧", original_meaning: "安宁", name_examples: ["宁远", "宁安"], popularity: 94 },
  { id: "c027", char: "和", pinyin: "he", strokes: 8, wuxing: "水", radical: "口", meaning: "和谐、温和", gender: "neutral", styles: ["classical", "auspicious"], traditional: "和", original_meaning: "协调", name_examples: ["和悦", "和安"], popularity: 75 },
  { id: "c028", char: "嘉", pinyin: "jia", strokes: 14, wuxing: "木", radical: "口", meaning: "美好、嘉许", gender: "neutral", styles: ["classical", "auspicious"], traditional: "嘉", original_meaning: "善、美", name_examples: ["嘉言", "嘉宁"], popularity: 91 },
  { id: "c029", char: "悦", pinyin: "yue", strokes: 10, wuxing: "金", radical: "忄", meaning: "喜悦、愉快", gender: "female", styles: ["modern", "auspicious"], traditional: "悅", original_meaning: "高兴", name_examples: ["悦心", "悦宁"], popularity: 93 },
  { id: "c030", char: "乐", pinyin: "le", strokes: 5, wuxing: "火", radical: "丿", meaning: "快乐、和乐", gender: "neutral", styles: ["modern", "auspicious"], traditional: "樂", original_meaning: "欢乐", name_examples: ["乐安", "乐宁"], popularity: 82 },
]

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function filterCharacters(params: LibraryParams): CharacterEntry[] {
  let result = [...characterLibrary]

  const keyword = (params.keyword || "").trim()
  if (keyword) {
    const keywordLower = keyword.toLowerCase()
    result = result.filter(c =>
      c.char.includes(keyword) ||
      c.pinyin.toLowerCase().includes(keywordLower) ||
      c.radical.includes(keyword) ||
      c.meaning.includes(keyword)
    )
  }

  if (params.category === "auspicious") {
    result = result.filter(c => c.styles.includes("auspicious"))
  }

  if (params.pinyin) {
    const p = params.pinyin.toLowerCase()
    result = result.filter(c => c.pinyin.toLowerCase().includes(p))
  }

  if (params.radical) {
    result = result.filter(c => c.radical === params.radical)
  }

  if (params.wuxing) {
    result = result.filter(c => c.wuxing === params.wuxing)
  }

  if (params.gender) {
    result = result.filter(c => c.gender === params.gender || c.gender === "neutral")
  }

  if (params.style) {
    result = result.filter(c => c.styles.includes(params.style!))
  }

  if (params.minStrokes) {
    result = result.filter(c => c.strokes >= params.minStrokes!)
  }
  if (params.maxStrokes) {
    result = result.filter(c => c.strokes <= params.maxStrokes!)
  }

  return result
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const params: LibraryParams = await req.json()

    const page = Math.max(1, Number(params.page) || 1)
    const pageSize = Math.max(6, Math.min(30, Number(params.pageSize) || 12))

    const filtered = filterCharacters(params)
    const source = params.random ? shuffleArray(filtered) : filtered

    const from = (page - 1) * pageSize
    const to = from + pageSize
    const records = source.slice(from, to)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          records,
          total: source.length,
          page,
          pageSize,
          hasMore: source.length > to,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (error: any) {
    console.error("character-library error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || "服务器错误" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }
})

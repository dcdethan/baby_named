// supabase/functions/user-quota/quota.ts
// 核心业务逻辑（与 HTTP 层解耦，便于单元测试）

export const FREE_LIMIT = 10

export type QuotaType = 'naming' | 'analysis' | 'library'

export const COUNT_FIELD: Record<QuotaType, string> = {
  naming: 'naming_count',
  analysis: 'analysis_count',
  library: 'library_count',
}

export interface QuotaCheckResult {
  allowed: boolean
  count: number
  remaining: number
  isWhitelisted?: boolean
}

export interface QuotaData {
  namingCount: number
  analysisCount: number
  libraryCount: number
  limit: number
  isWhitelisted: boolean
}

/** 判断 openid 是否在白名单中 */
export async function isUserWhitelisted(supabase: any, openid: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_whitelist')
    .select('id')
    .eq('openid', openid)
    .maybeSingle()

  if (error) return false
  return data !== null
}

/** 获取使用次数（同时返回白名单状态） */
export async function getQuota(supabase: any, openid: string): Promise<QuotaData> {
  const [usageResult, whitelistResult] = await Promise.all([
    supabase
      .from('user_usage')
      .select('naming_count, analysis_count, library_count')
      .eq('openid', openid)
      .maybeSingle(),
    supabase
      .from('user_whitelist')
      .select('id')
      .eq('openid', openid)
      .maybeSingle(),
  ])

  if (usageResult.error) throw usageResult.error

  return {
    namingCount: usageResult.data?.naming_count ?? 0,
    analysisCount: usageResult.data?.analysis_count ?? 0,
    libraryCount: usageResult.data?.library_count ?? 0,
    limit: FREE_LIMIT,
    isWhitelisted: whitelistResult.data !== null,
  }
}

/** 检查次数并自增 */
export async function checkAndIncrementUsage(
  supabase: any,
  openid: string,
  type: QuotaType,
): Promise<QuotaCheckResult> {
  // 白名单用户直接放行
  const whitelisted = await isUserWhitelisted(supabase, openid)
  if (whitelisted) {
    return { allowed: true, count: 0, remaining: -1, isWhitelisted: true }
  }

  const field = COUNT_FIELD[type]

  // 获取或创建使用记录
  let { data: usage, error: fetchError } = await supabase
    .from('user_usage')
    .select('naming_count, analysis_count, library_count')
    .eq('openid', openid)
    .maybeSingle()

  if (fetchError) throw fetchError

  if (!usage) {
    const { data: newRecord, error: insertError } = await supabase
      .from('user_usage')
      .insert({ openid, naming_count: 0, analysis_count: 0, library_count: 0 })
      .select()
      .single()

    if (insertError) throw insertError
    usage = newRecord
  }

  const currentCount: number = usage[field] ?? 0

  if (currentCount >= FREE_LIMIT) {
    return { allowed: false, count: currentCount, remaining: 0 }
  }

  // 自增
  const { error: updateError } = await supabase
    .from('user_usage')
    .update({ [field]: currentCount + 1, updated_at: new Date().toISOString() })
    .eq('openid', openid)

  if (updateError) throw updateError

  const newCount = currentCount + 1
  return { allowed: true, count: newCount, remaining: FREE_LIMIT - newCount }
}

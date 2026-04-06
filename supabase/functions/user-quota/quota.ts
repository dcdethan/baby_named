// supabase/functions/user-quota/quota.ts
// Core quota logic: total usage across naming/analysis/library by openid

export const NORMAL_LIMIT = 10
export const MEMBER_LIMIT = 10000

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
  limit?: number
  openid?: string
  totalCount?: number
  usage?: {
    namingCount: number
    analysisCount: number
    libraryCount: number
  }
}

export interface QuotaData {
  openid: string
  namingCount: number
  analysisCount: number
  libraryCount: number
  totalCount: number
  limit: number
  isWhitelisted: boolean
}

function getTotalCount(usage: any): number {
  return (usage?.naming_count ?? 0) + (usage?.analysis_count ?? 0) + (usage?.library_count ?? 0)
}

/** Check whether openid is a member (whitelist). */
export async function isUserWhitelisted(supabase: any, openid: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_whitelist')
    .select('id')
    .eq('openid', openid)
    .maybeSingle()

  if (error) return false
  return data !== null
}

/** Get current quota snapshot. */
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

  const isWhitelisted = whitelistResult.data !== null
  const limit = isWhitelisted ? MEMBER_LIMIT : NORMAL_LIMIT

  return {
    openid,
    namingCount: usageResult.data?.naming_count ?? 0,
    analysisCount: usageResult.data?.analysis_count ?? 0,
    libraryCount: usageResult.data?.library_count ?? 0,
    totalCount: getTotalCount(usageResult.data),
    limit,
    isWhitelisted,
  }
}

/** Check and increment usage by type, but enforce by total count. */
export async function checkAndIncrementUsage(
  supabase: any,
  openid: string,
  type: QuotaType,
): Promise<QuotaCheckResult> {
  const field = COUNT_FIELD[type]
  const isWhitelisted = await isUserWhitelisted(supabase, openid)
  const limit = isWhitelisted ? MEMBER_LIMIT : NORMAL_LIMIT

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

  const currentTotal = getTotalCount(usage)
  if (currentTotal >= limit) {
    return {
      allowed: false,
      count: currentTotal,
      remaining: 0,
      isWhitelisted,
      limit,
      openid,
      totalCount: currentTotal,
      usage: {
        namingCount: usage.naming_count ?? 0,
        analysisCount: usage.analysis_count ?? 0,
        libraryCount: usage.library_count ?? 0,
      },
    }
  }

  const currentTypeCount = usage[field] ?? 0
  const { error: updateError } = await supabase
    .from('user_usage')
    .update({ [field]: currentTypeCount + 1, updated_at: new Date().toISOString() })
    .eq('openid', openid)

  if (updateError) throw updateError

  const newTotal = currentTotal + 1
  const updatedUsage = {
    namingCount: field === 'naming_count' ? currentTypeCount + 1 : (usage.naming_count ?? 0),
    analysisCount: field === 'analysis_count' ? currentTypeCount + 1 : (usage.analysis_count ?? 0),
    libraryCount: field === 'library_count' ? currentTypeCount + 1 : (usage.library_count ?? 0),
  }

  return {
    allowed: true,
    count: newTotal,
    remaining: limit - newTotal,
    isWhitelisted,
    limit,
    openid,
    totalCount: newTotal,
    usage: updatedUsage,
  }
}

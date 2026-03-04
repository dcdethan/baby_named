// quota_test.mjs - Node.js 原生测试（v18+）
// 运行方式：node --test quota_test.mjs

import { test, describe } from 'node:test'
import { strict as assert } from 'node:assert'

// ─────────────────────────────────────────────────────────────────────────────
// 从 quota.ts 提取的纯逻辑（JS 版，无 Deno 依赖）
// ─────────────────────────────────────────────────────────────────────────────

const FREE_LIMIT = 10

const COUNT_FIELD = {
  naming: 'naming_count',
  analysis: 'analysis_count',
  library: 'library_count',
}

async function isUserWhitelisted(supabase, openid) {
  const { data, error } = await supabase
    .from('user_whitelist')
    .select('id')
    .eq('openid', openid)
    .maybeSingle()
  if (error) return false
  return data !== null
}

async function getQuota(supabase, openid) {
  const [usageResult, whitelistResult] = await Promise.all([
    supabase.from('user_usage').select('naming_count, analysis_count, library_count').eq('openid', openid).maybeSingle(),
    supabase.from('user_whitelist').select('id').eq('openid', openid).maybeSingle(),
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

async function checkAndIncrementUsage(supabase, openid, type) {
  const whitelisted = await isUserWhitelisted(supabase, openid)
  if (whitelisted) return { allowed: true, count: 0, remaining: -1, isWhitelisted: true }

  const field = COUNT_FIELD[type]

  let { data: usage, error: fetchError } = await supabase
    .from('user_usage').select('naming_count, analysis_count, library_count')
    .eq('openid', openid).maybeSingle()
  if (fetchError) throw fetchError

  if (!usage) {
    const { data: newRecord, error: insertError } = await supabase
      .from('user_usage')
      .insert({ openid, naming_count: 0, analysis_count: 0, library_count: 0 })
      .select().single()
    if (insertError) throw insertError
    usage = newRecord
  }

  const currentCount = usage[field] ?? 0
  if (currentCount >= FREE_LIMIT) return { allowed: false, count: currentCount, remaining: 0 }

  const { error: updateError } = await supabase
    .from('user_usage')
    .update({ [field]: currentCount + 1 })
    .eq('openid', openid)
  if (updateError) throw updateError

  const newCount = currentCount + 1
  return { allowed: true, count: newCount, remaining: FREE_LIMIT - newCount }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock 工厂
// ─────────────────────────────────────────────────────────────────────────────

function createMockSupabase({ whitelistData = null, usageData = null, updateError = null, insertError = null } = {}) {
  return {
    from(table) {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: () => Promise.resolve({
                  data: table === 'user_whitelist' ? whitelistData : usageData,
                  error: null,
                }),
                single: () => Promise.resolve({ data: usageData, error: null }),
              }
            },
          }
        },
        insert(data) {
          return {
            select() {
              return {
                single: () => insertError
                  ? Promise.resolve({ data: null, error: insertError })
                  : Promise.resolve({ data: { naming_count: 0, analysis_count: 0, library_count: 0, ...data }, error: null }),
              }
            },
          }
        },
        update() {
          return { eq: () => Promise.resolve({ error: updateError }) }
        },
      }
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 测试：isUserWhitelisted
// ─────────────────────────────────────────────────────────────────────────────

describe('isUserWhitelisted', () => {
  test('白名单中的用户返回 true', async () => {
    const db = createMockSupabase({ whitelistData: { id: 'abc-123' } })
    assert.equal(await isUserWhitelisted(db, 'openid_whitelist'), true)
  })

  test('不在白名单中返回 false', async () => {
    const db = createMockSupabase({ whitelistData: null })
    assert.equal(await isUserWhitelisted(db, 'openid_normal'), false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 测试：getQuota
// ─────────────────────────────────────────────────────────────────────────────

describe('getQuota', () => {
  test('新用户所有次数为 0', async () => {
    const db = createMockSupabase({ usageData: null, whitelistData: null })
    const r = await getQuota(db, 'new_user')
    assert.equal(r.namingCount, 0)
    assert.equal(r.analysisCount, 0)
    assert.equal(r.libraryCount, 0)
    assert.equal(r.limit, FREE_LIMIT)
    assert.equal(r.isWhitelisted, false)
  })

  test('返回正确的已使用次数', async () => {
    const db = createMockSupabase({ usageData: { naming_count: 5, analysis_count: 3, library_count: 8 } })
    const r = await getQuota(db, 'user_with_usage')
    assert.equal(r.namingCount, 5)
    assert.equal(r.analysisCount, 3)
    assert.equal(r.libraryCount, 8)
  })

  test('白名单用户 isWhitelisted 为 true', async () => {
    const db = createMockSupabase({
      usageData: { naming_count: 10, analysis_count: 10, library_count: 10 },
      whitelistData: { id: 'wl-1' },
    })
    const r = await getQuota(db, 'vip_user')
    assert.equal(r.isWhitelisted, true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 测试：checkAndIncrementUsage - 白名单
// ─────────────────────────────────────────────────────────────────────────────

describe('checkAndIncrementUsage - 白名单', () => {
  test('白名单用户即使次数已满也放行，remaining 为 -1', async () => {
    const db = createMockSupabase({
      whitelistData: { id: 'wl-1' },
      usageData: { naming_count: 10, analysis_count: 10, library_count: 10 },
    })
    const r = await checkAndIncrementUsage(db, 'vip_user', 'naming')
    assert.equal(r.allowed, true)
    assert.equal(r.isWhitelisted, true)
    assert.equal(r.remaining, -1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 测试：checkAndIncrementUsage - 次数边界
// ─────────────────────────────────────────────────────────────────────────────

describe('checkAndIncrementUsage - 次数边界', () => {
  test('新用户第 1 次请求被允许，count 变为 1', async () => {
    const db = createMockSupabase({ whitelistData: null, usageData: null })
    const r = await checkAndIncrementUsage(db, 'new_user', 'naming')
    assert.equal(r.allowed, true)
    assert.equal(r.count, 1)
    assert.equal(r.remaining, FREE_LIMIT - 1)
  })

  test('已用 5 次后被允许，count=6，remaining=4', async () => {
    const db = createMockSupabase({ usageData: { naming_count: 5, analysis_count: 0, library_count: 0 } })
    const r = await checkAndIncrementUsage(db, 'user_5', 'naming')
    assert.equal(r.allowed, true)
    assert.equal(r.count, 6)
    assert.equal(r.remaining, 4)
  })

  test('第 10 次（count=9→10）被允许，remaining=0', async () => {
    const db = createMockSupabase({ usageData: { naming_count: 9, analysis_count: 0, library_count: 0 } })
    const r = await checkAndIncrementUsage(db, 'user_9', 'naming')
    assert.equal(r.allowed, true)
    assert.equal(r.count, 10)
    assert.equal(r.remaining, 0)
  })

  test('count=10 时第 11 次请求被拒绝', async () => {
    const db = createMockSupabase({ usageData: { naming_count: 10, analysis_count: 0, library_count: 0 } })
    const r = await checkAndIncrementUsage(db, 'user_10', 'naming')
    assert.equal(r.allowed, false)
    assert.equal(r.remaining, 0)
  })

  test('count=100 时请求被拒绝', async () => {
    const db = createMockSupabase({ usageData: { naming_count: 100, analysis_count: 0, library_count: 0 } })
    const r = await checkAndIncrementUsage(db, 'user_100', 'naming')
    assert.equal(r.allowed, false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 测试：各功能类型独立计数
// ─────────────────────────────────────────────────────────────────────────────

describe('checkAndIncrementUsage - 各功能类型独立计数', () => {
  test('naming 满额不影响 analysis 和 library', async () => {
    const usage = { naming_count: 10, analysis_count: 3, library_count: 0 }

    const db1 = createMockSupabase({ usageData: usage })
    const naming = await checkAndIncrementUsage(db1, 'user', 'naming')
    assert.equal(naming.allowed, false, 'naming 应被拒绝')

    const db2 = createMockSupabase({ usageData: usage })
    const analysis = await checkAndIncrementUsage(db2, 'user', 'analysis')
    assert.equal(analysis.allowed, true, 'analysis 应被允许')
    assert.equal(analysis.count, 4)

    const db3 = createMockSupabase({ usageData: usage })
    const library = await checkAndIncrementUsage(db3, 'user', 'library')
    assert.equal(library.allowed, true, 'library 应被允许')
    assert.equal(library.count, 1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 测试：错误处理
// ─────────────────────────────────────────────────────────────────────────────

describe('checkAndIncrementUsage - 错误处理', () => {
  test('DB update 失败时抛出错误', async () => {
    const db = createMockSupabase({
      usageData: { naming_count: 5, analysis_count: 0, library_count: 0 },
      updateError: new Error('DB connection failed'),
    })
    await assert.rejects(
      () => checkAndIncrementUsage(db, 'user_db_err', 'naming'),
      /DB connection failed/,
    )
  })

  test('新用户 insert 失败时抛出错误', async () => {
    const db = createMockSupabase({
      usageData: null,
      insertError: new Error('Insert failed'),
    })
    await assert.rejects(
      () => checkAndIncrementUsage(db, 'new_user_err', 'naming'),
      /Insert failed/,
    )
  })
})

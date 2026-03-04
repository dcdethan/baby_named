// supabase/functions/user-quota/quota_test.ts
// 运行方式：deno test quota_test.ts

import { assertEquals, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import {
  checkAndIncrementUsage,
  getQuota,
  isUserWhitelisted,
  FREE_LIMIT,
} from "./quota.ts"

// ─────────────────────────────────────────────────────────────────────────────
// Mock 工厂
// ─────────────────────────────────────────────────────────────────────────────

interface MockOptions {
  whitelistData?: { id: string } | null   // null = 不在白名单
  usageData?: Record<string, number> | null // null = 记录不存在（新用户）
  updateError?: Error | null
  insertError?: Error | null
}

function createMockSupabase(opts: MockOptions = {}) {
  const { whitelistData = null, usageData = null, updateError = null, insertError = null } = opts

  // 记录 update 被调用时传入的参数，便于断言
  let lastUpdateData: any = null

  const mock = {
    _lastUpdateData: () => lastUpdateData,

    from(table: string) {
      return {
        select(_cols?: string) {
          return {
            eq(_col: string, _val: string) {
              return {
                maybeSingle() {
                  if (table === 'user_whitelist') {
                    return Promise.resolve({ data: whitelistData, error: null })
                  }
                  if (table === 'user_usage') {
                    return Promise.resolve({ data: usageData, error: null })
                  }
                  return Promise.resolve({ data: null, error: null })
                },
                single() {
                  return Promise.resolve({ data: usageData, error: null })
                },
              }
            },
          }
        },

        insert(data: any) {
          return {
            select() {
              return {
                single() {
                  if (insertError) return Promise.resolve({ data: null, error: insertError })
                  // 返回初始化的新记录
                  return Promise.resolve({
                    data: { naming_count: 0, analysis_count: 0, library_count: 0, ...data },
                    error: null,
                  })
                },
              }
            },
          }
        },

        update(data: any) {
          lastUpdateData = data
          return {
            eq(_col: string, _val: string) {
              return Promise.resolve({ error: updateError })
            },
          }
        },
      }
    },
  }

  return mock
}

// ─────────────────────────────────────────────────────────────────────────────
// isUserWhitelisted
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("isUserWhitelisted - 白名单中的用户返回 true", async () => {
  const db = createMockSupabase({ whitelistData: { id: "abc-123" } })
  const result = await isUserWhitelisted(db, "openid_whitelist")
  assertEquals(result, true)
})

Deno.test("isUserWhitelisted - 不在白名单中返回 false", async () => {
  const db = createMockSupabase({ whitelistData: null })
  const result = await isUserWhitelisted(db, "openid_normal")
  assertEquals(result, false)
})

// ─────────────────────────────────────────────────────────────────────────────
// getQuota
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("getQuota - 新用户所有次数为 0", async () => {
  const db = createMockSupabase({ usageData: null, whitelistData: null })
  const result = await getQuota(db, "new_user")
  assertEquals(result.namingCount, 0)
  assertEquals(result.analysisCount, 0)
  assertEquals(result.libraryCount, 0)
  assertEquals(result.limit, FREE_LIMIT)
  assertEquals(result.isWhitelisted, false)
})

Deno.test("getQuota - 返回正确的已使用次数", async () => {
  const db = createMockSupabase({
    usageData: { naming_count: 5, analysis_count: 3, library_count: 8 },
    whitelistData: null,
  })
  const result = await getQuota(db, "user_with_usage")
  assertEquals(result.namingCount, 5)
  assertEquals(result.analysisCount, 3)
  assertEquals(result.libraryCount, 8)
})

Deno.test("getQuota - 白名单用户 isWhitelisted 为 true", async () => {
  const db = createMockSupabase({
    usageData: { naming_count: 10, analysis_count: 10, library_count: 10 },
    whitelistData: { id: "wl-1" },
  })
  const result = await getQuota(db, "vip_user")
  assertEquals(result.isWhitelisted, true)
})

// ─────────────────────────────────────────────────────────────────────────────
// checkAndIncrementUsage - 白名单
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("checkAndIncrement - 白名单用户即使次数已满也放行", async () => {
  const db = createMockSupabase({
    whitelistData: { id: "wl-1" },
    usageData: { naming_count: 10, analysis_count: 10, library_count: 10 },
  })
  const result = await checkAndIncrementUsage(db, "vip_user", "naming")
  assertEquals(result.allowed, true)
  assertEquals(result.isWhitelisted, true)
  assertEquals(result.remaining, -1) // -1 表示无限
})

// ─────────────────────────────────────────────────────────────────────────────
// checkAndIncrementUsage - 正常流程
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("checkAndIncrement - 新用户第 1 次请求被允许，count 变为 1", async () => {
  const db = createMockSupabase({ whitelistData: null, usageData: null })
  const result = await checkAndIncrementUsage(db, "new_user", "naming")
  assertEquals(result.allowed, true)
  assertEquals(result.count, 1)
  assertEquals(result.remaining, FREE_LIMIT - 1)
})

Deno.test("checkAndIncrement - 使用 5 次后被允许，remaining 为 5", async () => {
  const db = createMockSupabase({
    whitelistData: null,
    usageData: { naming_count: 5, analysis_count: 0, library_count: 0 },
  })
  const result = await checkAndIncrementUsage(db, "user_5", "naming")
  assertEquals(result.allowed, true)
  assertEquals(result.count, 6)
  assertEquals(result.remaining, 4)
})

Deno.test("checkAndIncrement - 第 10 次请求被允许，remaining 为 0", async () => {
  const db = createMockSupabase({
    whitelistData: null,
    usageData: { naming_count: 9, analysis_count: 0, library_count: 0 },
  })
  const result = await checkAndIncrementUsage(db, "user_9", "naming")
  assertEquals(result.allowed, true)
  assertEquals(result.count, 10)
  assertEquals(result.remaining, 0)
})

Deno.test("checkAndIncrement - 超过 10 次被拒绝", async () => {
  const db = createMockSupabase({
    whitelistData: null,
    usageData: { naming_count: 10, analysis_count: 0, library_count: 0 },
  })
  const result = await checkAndIncrementUsage(db, "user_10", "naming")
  assertEquals(result.allowed, false)
  assertEquals(result.remaining, 0)
})

Deno.test("checkAndIncrement - 次数为 100 也被拒绝", async () => {
  const db = createMockSupabase({
    whitelistData: null,
    usageData: { naming_count: 100, analysis_count: 0, library_count: 0 },
  })
  const result = await checkAndIncrementUsage(db, "user_100", "naming")
  assertEquals(result.allowed, false)
})

// ─────────────────────────────────────────────────────────────────────────────
// checkAndIncrementUsage - 各功能类型独立计数
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("checkAndIncrement - naming/analysis/library 计数独立互不影响", async () => {
  // naming 已用 10 次，但 analysis 只用 3 次
  const db = createMockSupabase({
    whitelistData: null,
    usageData: { naming_count: 10, analysis_count: 3, library_count: 0 },
  })

  const namingResult = await checkAndIncrementUsage(db, "user", "naming")
  assertEquals(namingResult.allowed, false, "naming 应被拒绝")

  // 换一个只有 analysis 计数的 mock
  const db2 = createMockSupabase({
    whitelistData: null,
    usageData: { naming_count: 10, analysis_count: 3, library_count: 0 },
  })
  const analysisResult = await checkAndIncrementUsage(db2, "user", "analysis")
  assertEquals(analysisResult.allowed, true, "analysis 应被允许")
  assertEquals(analysisResult.count, 4)

  const db3 = createMockSupabase({
    whitelistData: null,
    usageData: { naming_count: 10, analysis_count: 3, library_count: 0 },
  })
  const libraryResult = await checkAndIncrementUsage(db3, "user", "library")
  assertEquals(libraryResult.allowed, true, "library 应被允许")
  assertEquals(libraryResult.count, 1)
})

// ─────────────────────────────────────────────────────────────────────────────
// checkAndIncrementUsage - 错误处理
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("checkAndIncrement - 写入数据库失败时抛出错误", async () => {
  const db = createMockSupabase({
    whitelistData: null,
    usageData: { naming_count: 5, analysis_count: 0, library_count: 0 },
    updateError: new Error("DB connection failed"),
  })
  await assertRejects(
    () => checkAndIncrementUsage(db, "user_db_err", "naming"),
    Error,
    "DB connection failed",
  )
})

Deno.test("checkAndIncrement - 新用户创建记录失败时抛出错误", async () => {
  const db = createMockSupabase({
    whitelistData: null,
    usageData: null,
    insertError: new Error("Insert failed"),
  })
  await assertRejects(
    () => checkAndIncrementUsage(db, "new_user_err", "naming"),
    Error,
    "Insert failed",
  )
})

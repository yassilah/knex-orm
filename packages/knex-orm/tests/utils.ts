import type { MySQLDB } from 'mysql-memory-server/dist/types'
import type { Instance } from '../src'
import { createDB } from 'mysql-memory-server'
import { newDb } from 'pg-mem'
import { afterAll, afterEach, beforeEach, describe, expect } from 'vitest'
import { createInstance, createInstanceWithKnex } from '../src'
import { schema } from './schema'

// ============================================================================
// Schema and Types
// ============================================================================

export type TestOrm = Instance<typeof schema>

const shouldTestMysql = process.env.TEST_MYSQL === 'true'

export const drivers = [
   'better-sqlite3',
   'sqlite3',
   'pg',
   ...(shouldTestMysql ? ['mysql2'] : []),
] as const

type TestDriver = (typeof drivers)[number]

// ============================================================================
// ORM Setup
// ============================================================================
let mysqlServer: MySQLDB | undefined

async function createInstanceForDriver(client: TestDriver) {
   if (client === 'pg') {
      return createInstanceWithKnex(schema, newDb({ autoCreateForeignKeyIndices: true }).adapters.createKnex())
   }

   if (client === 'mysql2') {
      mysqlServer ??= await createDB()
      return createInstance(schema, {
         client,
         connection: {
            host: '127.0.0.1',
            user: mysqlServer.username,
            port: mysqlServer.port,
            database: mysqlServer.dbName,
            password: '',
            charset: 'utf8',
         },
      })
   }

   return createInstance(schema, {
      client,
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
   })
}

export function setupQueryTests(testName: string, testFn: (getOrm: () => TestOrm) => void) {
   describe.each(drivers)(testName, async (driver) => {
      let orm = await createInstanceForDriver(driver)

      beforeEach(async () => {
         await orm.migrate()
      })

      afterAll(async () => {
         if (driver !== 'mysql2') return
         await mysqlServer?.stop()
      })

      afterEach(async () => {
         if (driver === 'mysql2') {
            const tables = Object.keys(schema)
            await orm.knex.raw('SET FOREIGN_KEY_CHECKS = 0')
            for (const table of tables) {
               await orm.knex.schema.dropTableIfExists(table)
            }
            await orm.knex.raw('SET FOREIGN_KEY_CHECKS = 1')
         }
         else {
            await orm.knex.destroy()
            orm = await createInstanceForDriver(driver)
         }
      })

      testFn(() => orm)
   })
}

// ============================================================================
// Data Creation Helpers
// ============================================================================

/**
 * Helper to create test users with common patterns
 */
export async function createTestUsers(orm: TestOrm, users: Array<{ email: string, status?: string | null }>) {
   return await orm.create('users', users.map(u => ({
      email: u.email,
      status: u.status !== undefined ? u.status : 'active',
   })))
}

/**
 * Helper to create a test user with relations
 */
export async function createTestUserWithRelations(orm: TestOrm, data: {
   email: string
   status?: string
   profile?: { display_name: string }
   posts?: Array<{ title: string, slug: string, tags?: Array<{ name: string }> }>
   roles?: Array<{ name: string, policies?: Array<{ name: string, permissions?: Array<{ name: string, action?: string[] }> }> }>
}) {
   return await orm.createOne('users', {
      email: data.email,
      status: data.status ?? 'active',
      ...(data.profile && { profile: data.profile }),
      ...(data.posts && { posts: data.posts }),
      ...(data.roles && { roles: data.roles }),
   })
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Helper function to create expected fields for records with default fields (id and timestamps).
 * Can be reused across all tests.
 */
export function withDefaultFields(overrides: Record<string, unknown> = {}) {
   return {
      id: expect.any(Number),
      created_at: expect.anything(),
      updated_at: expect.anything(),
      ...overrides,
   }
}

/**
 * Helper to assert user records match expected values
 */
export function expectUsersToMatch(users: Array<{ id?: number, email?: string, status?: string | null }>, expected: Array<{ email: string, status?: string | null }>) {
   expect(users).toHaveLength(expected.length)
   for (let i = 0; i < expected.length; i++) {
      expect(users[i]).toMatchObject({
         email: expected[i].email,
         ...(expected[i].status !== undefined && { status: expected[i].status }),
      })
   }
}

/**
 * Helper to assert all records have a specific status
 */
export function expectAllHaveStatus(records: Array<{ status?: string | null }>, status: string) {
   expect(records.every(r => r.status === status)).toBe(true)
}

/**
 * Helper to assert all records don't have a specific status
 */
export function expectNoneHaveStatus(records: Array<{ status?: string | null }>, status: string) {
   expect(records.every(r => r.status !== status)).toBe(true)
}

/**
 * Helper to assert all records have status in a list
 */
export function expectAllHaveStatusIn(records: Array<{ status?: string | null }>, statuses: string[]) {
   expect(records.every(r => statuses.includes(r.status!))).toBe(true)
}

/**
 * Helper to assert all records don't have null status
 */
export function expectAllHaveNonNullStatus(records: Array<{ status?: string | null }>) {
   expect(records.every(r => r.status !== null)).toBe(true)
}

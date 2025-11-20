import { newDb } from 'pg-mem'
import { describe } from 'vitest'
import { createInstance, createInstanceWithKnex, defineCollection } from '../src'

export const schema = {
   users: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      email: { type: 'varchar', unique: true, nullable: false },
      status: { type: 'varchar', nullable: true },
      posts: { type: 'has-many', target: 'posts', foreignKey: 'author' },
      profile: { type: 'has-one', target: 'profiles', foreignKey: 'user' },
      roles: {
         type: 'many-to-many',
         target: 'roles',
         foreignKey: 'id',
         through: { table: 'user_roles', sourceFk: 'user', targetFk: 'role' },
      },
   }),
   profiles: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      display_name: { type: 'varchar', nullable: false },
      user: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
   }),
   posts: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      title: { type: 'varchar', nullable: false },
      slug: { type: 'varchar', nullable: false, unique: true },
      author: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
      tags: {
         type: 'many-to-many',
         target: 'tags',
         foreignKey: 'id',
         through: {
            table: 'post_tags',
            sourceFk: 'post',
            targetFk: 'tag',
         },
      },
   }),
   tags: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      name: { type: 'varchar', nullable: false, unique: true },
   }),
   post_tags: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      post: { type: 'belongs-to', target: 'posts', foreignKey: 'id' },
      tag: { type: 'belongs-to', target: 'tags', foreignKey: 'id' },
   }),
   roles: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      name: { type: 'varchar', nullable: false, unique: true },
      policies: {
         type: 'many-to-many',
         target: 'policies',
         foreignKey: 'id',
         through: {
            table: 'role_policies',
            sourceFk: 'role',
            targetFk: 'policy',
         },
      },
   }),
   user_roles: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      user: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
      role: { type: 'belongs-to', target: 'roles', foreignKey: 'id' },
   }),
   policies: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      name: { type: 'varchar', nullable: false, unique: true },
      permissions: {
         type: 'many-to-many',
         target: 'permissions',
         foreignKey: 'id',
         through: {
            table: 'policy_permissions',
            sourceFk: 'policy',
            targetFk: 'permission',
         },
      },
   }),
   role_policies: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      role: { type: 'belongs-to', target: 'roles', foreignKey: 'id' },
      policy: { type: 'belongs-to', target: 'policies', foreignKey: 'id' },
   }),
   permissions: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      name: { type: 'varchar', nullable: false, unique: true },
      action: { type: 'enum-array', nullable: true, options: ['read', 'write', 'delete'] },
      collection: { type: 'belongs-to', nullable: true, target: 'collections', foreignKey: 'id' },
   }),
   policy_permissions: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      policy: {
         type: 'belongs-to',
         target: 'policies',
         foreignKey: 'id',
      },
      permission: {
         type: 'belongs-to',
         target: 'permissions',
         foreignKey: 'id',
      },
   }),
   collections: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      name: { type: 'varchar', nullable: false, unique: true },
   }),
} as const

export function createOrmForDriver(client: TestDriver) {
   if (client === 'pg') {
      return createInstanceWithKnex(schema, newDb({ autoCreateForeignKeyIndices: true }).adapters.createKnex())
   }

   return createInstance(schema, {
      client,
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
   })
}

export const drivers = ['better-sqlite3', 'sqlite3', 'pg'] as const

type TestDriver = (typeof drivers)[number]

export function testAllDrivers(name: string, fn: (driver: TestDriver) => void) {
   describe.each(drivers)(name, fn)
}

import { newDb } from 'pg-mem'
import { describe } from 'vitest'
import { createInstance, createInstanceWithKnex, defineCollection } from '../src'

export const schema = {
   users: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      email: { type: 'string', unique: true, nullable: false },
      status: { type: 'string', nullable: true },
      posts: { type: 'hasMany', target: 'posts', foreignKey: 'author' },
      profile: { type: 'hasOne', target: 'profiles', foreignKey: 'user' },
      roles: {
         type: 'manyToMany',
         target: 'roles',
         foreignKey: 'id',
         through: { table: 'user_roles', sourceFk: 'user', targetFk: 'role' },
      },
   }),
   profiles: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      display_name: { type: 'string', nullable: false },
      user: { type: 'belongsTo', target: 'users', foreignKey: 'id' },
   }),
   posts: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      title: { type: 'string', nullable: false },
      slug: { type: 'string', nullable: false, unique: true },
      author: { type: 'belongsTo', target: 'users', foreignKey: 'id' },
      tags: {
         type: 'manyToMany',
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
      name: { type: 'string', nullable: false, unique: true },
   }),
   post_tags: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      post: { type: 'belongsTo', target: 'posts', foreignKey: 'id' },
      tag: { type: 'belongsTo', target: 'tags', foreignKey: 'id' },
   }),
   roles: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      name: { type: 'string', nullable: false, unique: true },
      policies: {
         type: 'manyToMany',
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
      user: { type: 'belongsTo', target: 'users', foreignKey: 'id' },
      role: { type: 'belongsTo', target: 'roles', foreignKey: 'id' },
   }),
   policies: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      name: { type: 'string', nullable: false, unique: true },
      permissions: {
         type: 'manyToMany',
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
      role: { type: 'belongsTo', target: 'roles', foreignKey: 'id' },
      policy: { type: 'belongsTo', target: 'policies', foreignKey: 'id' },
   }),
   permissions: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      name: { type: 'string', nullable: false, unique: true },
   }),
   policy_permissions: defineCollection({
      id: { type: 'integer', primary: true, increments: true },
      policy: {
         type: 'belongsTo',
         target: 'policies',
         foreignKey: 'id',
      },
      permission: {
         type: 'belongsTo',
         target: 'permissions',
         foreignKey: 'id',
      },
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

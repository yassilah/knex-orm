import { newDb } from 'pg-mem'
import { describe } from 'vitest'
import { createInstance, createInstanceWithKnex, defineSchema, withDefaults } from '../src'

export const schema = defineSchema({
   users: withDefaults({
      email: { type: 'varchar', unique: true, nullable: false },
      status: { type: 'varchar' },
      posts: { type: 'has-many', foreignKey: 'author', target: 'posts' },
      profile: { type: 'has-one', target: 'profiles', foreignKey: 'user' },
      roles: { type: 'many-to-many', target: 'roles', foreignKey: 'id', through: { table: 'users_roles', sourceFk: 'user', targetFk: 'role' } },
   }),
   profiles: withDefaults({
      display_name: { type: 'varchar', nullable: false },
      user: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
   }),
   posts: withDefaults({
      title: { type: 'varchar', nullable: false },
      slug: { type: 'varchar', nullable: false, unique: true },
      author: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
      tags: { type: 'many-to-many', target: 'tags', foreignKey: 'id', through: { table: 'posts_tags', sourceFk: 'post', targetFk: 'tag' } },
   }),
   tags: withDefaults({
      name: { type: 'varchar', nullable: false, unique: true },
   }),
   posts_tags: withDefaults({
      post: { type: 'belongs-to', target: 'posts', foreignKey: 'id' },
      tag: { type: 'belongs-to', target: 'tags', foreignKey: 'id' },
   }),
   roles: withDefaults({
      name: { type: 'varchar', nullable: false, unique: true },
      policies: { type: 'many-to-many', target: 'policies', foreignKey: 'id', through: { table: 'roles_policies', sourceFk: 'role', targetFk: 'policy' } },
   }),
   users_roles: withDefaults({
      user: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
      role: { type: 'belongs-to', target: 'roles', foreignKey: 'id' },
   }),
   policies: withDefaults({
      name: { type: 'varchar', nullable: false, unique: true },
      permissions: { type: 'many-to-many', target: 'permissions', foreignKey: 'id', through: { table: 'policies_permissions', sourceFk: 'policy', targetFk: 'permission' } },
   }),
   roles_policies: withDefaults({
      role: { type: 'belongs-to', target: 'roles', foreignKey: 'id' },
      policy: { type: 'belongs-to', target: 'policies', foreignKey: 'id' },
   }),
   collections: withDefaults({
      name: { type: 'varchar', nullable: false, unique: true },
   }),
   permissions: withDefaults({
      name: { type: 'varchar', nullable: false, unique: true },
      action: { type: 'enum-array', options: ['read', 'write', 'delete'] },
      collection: { type: 'belongs-to', target: 'collections', foreignKey: 'id' },
   }),
   policies_permissions: withDefaults({
      policy: { type: 'belongs-to', target: 'policies', foreignKey: 'id' },
      permission: { type: 'belongs-to', target: 'permissions', foreignKey: 'id' },
   }),
})

export function createOrmForDriver(client: TestDriver) {
   if (client === 'pg') {
      const knexInstance = newDb({ autoCreateForeignKeyIndices: true }).adapters.createKnex()
      return createInstanceWithKnex(schema, knexInstance)
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

import { newDb } from 'pg-mem'
import { describe } from 'vitest'
import { createInstance, createInstanceWithKnex, defineCollection } from '../src'

export const schema = {
   users: defineCollection({
      columns: {
         id: { type: 'integer', primary: true, increments: true },
         email: { type: 'string', unique: true, nullable: false },
         status: { type: 'string', nullable: true },
      },
      relations: {
         posts: { type: 'hasMany', target: 'posts', foreignKey: 'author_id' },
         profile: { type: 'hasOne', target: 'profiles', foreignKey: 'user_id' },
         roles: {
            type: 'manyToMany',
            target: 'roles',
            foreignKey: 'id',
            through: { table: 'user_roles', sourceFk: 'user_id', targetFk: 'role_id' },
         },
      },
   }),
   profiles: defineCollection({
      columns: {
         id: { type: 'integer', primary: true, increments: true },
         user_id: { type: 'integer' },
         display_name: { type: 'string', nullable: false },
      },
      relations: {
         user: { type: 'belongsTo', target: 'users', foreignKey: 'user_id' },
      },
   }),
   posts: defineCollection({
      columns: {
         id: { type: 'integer', primary: true, increments: true },
         author_id: { type: 'integer' },
         title: { type: 'string', nullable: false },
         slug: { type: 'string', nullable: false, unique: true },
      },
      relations: {
         author: { type: 'belongsTo', target: 'users', foreignKey: 'author_id' },
         tags: {
            type: 'manyToMany',
            target: 'tags',
            foreignKey: 'id',
            through: {
               table: 'post_tags',
               sourceFk: 'post_id',
               targetFk: 'tag_id',
            },
         },
      },
   }),
   tags: defineCollection({
      columns: {
         id: { type: 'integer', primary: true, increments: true },
         name: { type: 'string', nullable: false, unique: true },
      },
   }),
   post_tags: defineCollection({
      columns: {
         id: { type: 'integer', primary: true, increments: true },
         post_id: { type: 'integer' },
         tag_id: { type: 'integer' },
      },
      relations: {
         post: { type: 'belongsTo', target: 'posts', foreignKey: 'post_id' },
         tag: { type: 'belongsTo', target: 'tags', foreignKey: 'tag_id' },
      },
   }),
   roles: defineCollection({
      columns: {
         id: { type: 'integer', primary: true, increments: true },
         name: { type: 'string', nullable: false, unique: true },
      },
      relations: {
         policies: {
            type: 'manyToMany',
            target: 'policies',
            foreignKey: 'id',
            through: {
               table: 'role_policies',
               sourceFk: 'role_id',
               targetFk: 'policy_id',
            },
         },
      },
   }),
   user_roles: defineCollection({
      columns: {
         id: { type: 'integer', primary: true, increments: true },
         user_id: { type: 'integer' },
         role_id: { type: 'integer' },
      },
      relations: {
         user: { type: 'belongsTo', target: 'users', foreignKey: 'user_id' },
         role: { type: 'belongsTo', target: 'roles', foreignKey: 'role_id' },
      },
   }),
   policies: defineCollection({
      columns: {
         id: { type: 'integer', primary: true, increments: true },
         name: { type: 'string', nullable: false, unique: true },
      },
      relations: {
         permissions: {
            type: 'manyToMany',
            target: 'permissions',
            foreignKey: 'id',
            through: {
               table: 'policy_permissions',
               sourceFk: 'policy_id',
               targetFk: 'permission_id',
            },
         },
      },
   }),
   role_policies: defineCollection({
      columns: {
         id: { type: 'integer', primary: true, increments: true },
         role_id: { type: 'integer' },
         policy_id: { type: 'integer' },
      },
      relations: {
         role: { type: 'belongsTo', target: 'roles', foreignKey: 'role_id' },
         policy: { type: 'belongsTo', target: 'policies', foreignKey: 'policy_id' },
      },
   }),
   permissions: defineCollection({
      columns: {
         id: { type: 'integer', primary: true, increments: true },
         name: { type: 'string', nullable: false, unique: true },
      },
   }),
   policy_permissions: defineCollection({
      columns: {
         id: { type: 'integer', primary: true, increments: true },
         policy_id: { type: 'integer' },
         permission_id: { type: 'integer' },
      },
      relations: {
         policy: {
            type: 'belongsTo',
            target: 'policies',
            foreignKey: 'policy_id',
         },
         permission: {
            type: 'belongsTo',
            target: 'permissions',
            foreignKey: 'permission_id',
         },
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

import { defineSchema, withDefaults } from '../src'

export const schema = defineSchema({
   users: withDefaults({
      email: { type: 'varchar', unique: true, nullable: false },
      status: { type: 'varchar' },
      posts: { type: 'has-many', foreignKey: 'author', table: 'posts' },
      profile: { type: 'has-one', table: 'profiles', foreignKey: 'user' },
      roles: { type: 'many-to-many', table: 'roles', foreignKey: 'id', through: { table: 'users_roles', sourceFk: 'user', tableFk: 'role' } },
   }),
   profiles: withDefaults({
      display_name: { type: 'varchar', nullable: false },
      user: { type: 'belongs-to', foreignKey: 'id', table: 'users' },
   }),
   posts: withDefaults({
      title: { type: 'varchar', nullable: false },
      slug: { type: 'varchar', nullable: false, unique: true },
      author: { type: 'belongs-to', foreignKey: 'id', table: 'users' },
      tags: { type: 'many-to-many', table: 'tags', foreignKey: 'id', through: { table: 'posts_tags', sourceFk: 'post', tableFk: 'tag' } },
   }),
   tags: withDefaults({
      name: { type: 'varchar', nullable: false, unique: true },
      posts: { type: 'many-to-many', table: 'posts', foreignKey: 'id', through: { table: 'posts_tags', sourceFk: 'tag', tableFk: 'post' } },
   }),
   posts_tags: withDefaults({
      post: { type: 'belongs-to', table: 'posts', foreignKey: 'id' },
      tag: { type: 'belongs-to', table: 'tags', foreignKey: 'id' },
   }),
   roles: withDefaults({
      name: { type: 'varchar', nullable: false, unique: true },
      policies: { type: 'many-to-many', table: 'policies', foreignKey: 'id', through: { table: 'roles_policies', sourceFk: 'role', tableFk: 'policy' } },
   }),
   users_roles: withDefaults({
      user: { type: 'belongs-to', table: 'users', foreignKey: 'id' },
      role: { type: 'belongs-to', table: 'roles', foreignKey: 'id' },
   }),
   policies: withDefaults({
      name: { type: 'varchar', nullable: false, unique: true },
      permissions: { type: 'many-to-many', table: 'permissions', foreignKey: 'id', through: { table: 'policies_permissions', sourceFk: 'policy', tableFk: 'permission' } },
   }),
   roles_policies: withDefaults({
      role: { type: 'belongs-to', table: 'roles', foreignKey: 'id' },
      policy: { type: 'belongs-to', table: 'policies', foreignKey: 'id' },
   }),
   collections: withDefaults({
      name: { type: 'varchar', nullable: false, unique: true },
   }),
   permissions: withDefaults({
      name: { type: 'varchar', nullable: false, unique: true },
      action: { type: 'enum-array', options: ['read', 'write', 'delete'] },
      collection: { type: 'belongs-to', table: 'collections', foreignKey: 'id' },
   }),
   policies_permissions: withDefaults({
      policy: { type: 'belongs-to', table: 'policies', foreignKey: 'id' },
      permission: { type: 'belongs-to', foreignKey: 'id', table: 'permissions' },
   }),
})

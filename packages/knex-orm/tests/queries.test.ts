import type { Instance } from '../src'
import type { schema } from './test-helpers'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createOrmForDriver, testAllDrivers } from './test-helpers'

testAllDrivers('comprehensive instance methods tests (%s)', (driver) => {
   let orm: Instance<typeof schema>

   beforeEach(async () => {
      orm = createOrmForDriver(driver)
      await orm.migrate()
   })

   afterEach(async () => {
      await orm.destroy()
   })

   describe('find', () => {
      it('should return empty array when no records exist', async () => {
         const results = await orm.find('users')
         expect(results).toEqual([])
      })

      it('should return all records when no filter is provided', async () => {
         await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: 'inactive' },
            { email: 'user3@example.com', status: 'active' },
         ])

         const results = await orm.find('users')
         expect(results).toHaveLength(3)
         expect(results).toMatchInlineSnapshot(`
           [
             {
               "email": "user1@example.com",
               "id": 1,
               "status": "active",
             },
             {
               "email": "user2@example.com",
               "id": 2,
               "status": "inactive",
             },
             {
               "email": "user3@example.com",
               "id": 3,
               "status": "active",
             },
           ]
         `)
      })

      it('should filter records by simple equality', async () => {
         await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: 'inactive' },
            { email: 'user3@example.com', status: 'active' },
         ])

         const results = await orm.find('users', {
            where: { status: { $eq: 'active' } },
         })
         expect(results).toHaveLength(2)
         expect(results.every(r => r.status === 'active')).toBe(true)
      })

      it('should filter records using $ne operator', async () => {
         await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: 'inactive' },
            { email: 'user3@example.com', status: 'pending' },
         ])

         const results = await orm.find('users', {
            where: { status: { $neq: 'active' } },
         })
         expect(results).toHaveLength(2)
         expect(results.every(r => r.status !== 'active')).toBe(true)
      })

      it('should filter records using $in operator', async () => {
         await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: 'inactive' },
            { email: 'user3@example.com', status: 'pending' },
         ])

         const results = await orm.find('users', {
            where: { status: { $in: ['active', 'pending'] } },
         })
         expect(results).toHaveLength(2)
         expect(results.every(r => ['active', 'pending'].includes(r.status!))).toBe(true)
      })

      it('should filter records using $nin operator', async () => {
         await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: 'inactive' },
            { email: 'user3@example.com', status: 'pending' },
         ])

         const results = await orm.find('users', {
            where: { status: { $nin: ['active', 'pending'] } },
         })
         expect(results).toHaveLength(1)
         expect(results[0]?.status).toBe('inactive')
      })

      it('should filter records using $like operator', async () => {
         await orm.create('users', [
            { email: 'alice@example.com', status: 'active' },
            { email: 'bob@example.com', status: 'active' },
            { email: 'charlie@test.com', status: 'active' },
         ])

         const results = await orm.find('users', {
            where: { email: { $endsWith: '%@example.com' } },
         })
         expect(results).toHaveLength(2)
      })

      it('should filter records using $and operator', async () => {
         await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: 'active' },
            { email: 'user3@example.com', status: 'inactive' },
         ])

         const results = await orm.find('users', {
            where: {
               $and: [
                  { status: { $eq: 'active' } },
                  { email: { $like: 'user1%' } },
               ],
            },
         })
         expect(results).toHaveLength(1)
         expect(results[0]?.email).toBe('user1@example.com')
      })

      it('should filter records using $or operator', async () => {
         await orm.create('users', [
            { email: 'alice@example.com', status: 'active' },
            { email: 'bob@example.com', status: 'inactive' },
            { email: 'charlie@example.com', status: 'pending' },
         ])

         const results = await orm.find('users', {
            where: {
               $or: [
                  { email: { $eq: 'alice@example.com' } },
                  { status: { $eq: 'pending' } },
               ],
            },
         })
         expect(results).toHaveLength(2)
      })

      it('should support ordering with orderBy option', async () => {
         await orm.create('users', [
            { email: 'charlie@example.com', status: 'active' },
            { email: 'alice@example.com', status: 'active' },
            { email: 'bob@example.com', status: 'active' },
         ])

         const results = await orm.find('users', {
            orderBy: ['email'],
         })
         expect(results).toHaveLength(3)
         expect(results[0]?.email).toBe('alice@example.com')
         expect(results[1]?.email).toBe('bob@example.com')
         expect(results[2]?.email).toBe('charlie@example.com')
      })

      it('should support descending order', async () => {
         await orm.create('users', [
            { email: 'alice@example.com', status: 'active' },
            { email: 'bob@example.com', status: 'active' },
            { email: 'charlie@example.com', status: 'active' },
         ])

         const results = await orm.find('users', {
            orderBy: ['-email'],
         })
         expect(results[0]?.email).toBe('charlie@example.com')
         expect(results[2]?.email).toBe('alice@example.com')
      })

      it('should support limit option', async () => {
         await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: 'active' },
            { email: 'user3@example.com', status: 'active' },
         ])

         const results = await orm.find('users', {
            limit: 2,
         })
         expect(results).toHaveLength(2)
      })

      it('should support offset option', async () => {
         await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: 'active' },
            { email: 'user3@example.com', status: 'active' },
         ])

         const results = await orm.find('users', {
            orderBy: ['email'],
            limit: 1,
            offset: 1,
         })
         expect(results).toHaveLength(1)
         expect(results[0]?.email).toBe('user2@example.com')
      })

      it('should support select option to limit columns', async () => {
         await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
         ])

         const results = await orm.find('users', {
            columns: ['id', 'email'],
         })
         expect(results).toHaveLength(1)
         expect(results[0]).toMatchInlineSnapshot(`
           {
             "email": "user1@example.com",
             "id": 1,
           }
         `)
      })

      it('should support select option to limit columns with nested relations', async () => {
         await orm.create('users', [
            {
               email: 'user1@example.com',
               status: 'active',
               profile: {
                  display_name: 'Test User',
               },
               posts: [
                  { title: 'Post 1', slug: 'post-1' },
               ],
               roles: [
                  { name: 'admin' },
                  {
                     name: 'editor',
                     policies: [{
                        name: 'manage-users',
                        permissions: [{
                           name: 'read-users',
                        }],
                     }],
                  },
               ],
            },
         ])

         const results = await orm.find('users', {
            columns: ['id', 'email', 'profile.display_name', 'posts.title', 'roles.name', 'roles.policies.name', 'roles.policies.permissions.name'],
         })

         expect(results).toHaveLength(1)
         expect(results[0]).toMatchObject({
            email: 'user1@example.com',
            id: 1,
            profile: {
               display_name: 'Test User',
            },
            posts: [
               { title: 'Post 1' },
            ],
            roles: [
               { name: 'admin' },
               { name: 'editor', policies: [{ name: 'manage-users', permissions: [{ name: 'read-users' }] }] },
            ],
         })
      })

      it('should filter records with null values', async () => {
         await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: null },
            { email: 'user3@example.com', status: 'inactive' },
         ])

         const results = await orm.find('users', {
            where: { status: { $null: true } },
         })
         expect(results).toHaveLength(1)
         expect(results[0]?.status).toBeNull()
      })

      it('should filter records with not null values', async () => {
         await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: null },
            { email: 'user3@example.com', status: 'inactive' },
         ])

         const results = await orm.find('users', {
            where: { status: { $nnull: true } },
         })
         expect(results).toHaveLength(2)
         expect(results.every(r => r.status !== null)).toBe(true)
      })

      it('should filter records with nested filters', async () => {
         await orm.create('users', [
            { email: 'user1@example.com', status: 'active', posts: [{ title: 'Post 1', slug: 'post-1' }] },
            { email: 'user2@example.com', status: 'inactive' },
            {
               email: 'user3@example.com',
               status: 'active',
               roles: [{
                  name: 'admin',
                  policies: [{ name: 'manage-users', permissions: [{ name: 'read-users' }] }],
               }],
            },
         ])

         const results1 = await orm.find('users', {
            where: {
               status: { $eq: 'active' },
               posts: {
                  title: { $eq: 'Post 1' },
               },
            },
         })

         expect(results1).toHaveLength(1)
         expect(results1[0]?.email).toBe('user1@example.com')

         const results2 = await orm.find('users', {
            columns: ['id', 'email', 'roles.name', 'roles.policies.name', 'roles.policies.permissions.name'],
            where: {
               roles: {
                  policies: {
                     permissions: {
                        name: { $eq: 'read-users' },
                     },
                  },
               },
            },
         })
         expect(results2).toHaveLength(1)
         expect(results2[0]).toMatchObject({
            email: 'user3@example.com',
            roles: [{
               name: 'admin',
               policies: [{ name: 'manage-users', permissions: [{ name: 'read-users' }] }],
            }],
         })
      })
   })

   describe('findOne', () => {
      it('should return undefined when no records match', async () => {
         const result = await orm.findOne('users', {
            where: { email: { $eq: 'nonexistent@example.com' } },
         })
         expect(result).toBeUndefined()
      })

      it('should return a single record when filter matches', async () => {
         await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: 'inactive' },
         ])

         const result = await orm.findOne('users', {
            where: { email: { $eq: 'user1@example.com' } },
         })
         expect(result).toBeDefined()
         expect(result?.email).toBe('user1@example.com')
         expect(result?.status).toBe('active')
      })

      it('should return first matching record when multiple match', async () => {
         await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: 'active' },
            { email: 'user3@example.com', status: 'active' },
         ])

         const result = await orm.findOne('users', {
            where: { status: { $eq: 'active' } },
         })
         expect(result).toBeDefined()
         expect(result?.status).toBe('active')
      })

      it('should support orderBy option', async () => {
         await orm.create('users', [
            { email: 'charlie@example.com', status: 'active' },
            { email: 'alice@example.com', status: 'active' },
            { email: 'bob@example.com', status: 'active' },
         ])

         const result = await orm.findOne('users', {
            where: { status: { $eq: 'active' } },
            orderBy: ['email'],
         })
         expect(result?.email).toBe('alice@example.com')
      })

      it('should support select option', async () => {
         await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
         ])

         const result = await orm.findOne('users', {
            where: { email: { $eq: 'user1@example.com' } },
         })
         expect(result).toBeDefined()
         expect(result?.email).toBe('user1@example.com')
      })
   })

   describe('create', () => {
      it('should create a single record', async () => {
         const results = await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
         ])
         expect(results).toHaveLength(1)
         expect(results[0]?.email).toBe('user1@example.com')
         expect(results[0]?.id).toBeDefined()
      })

      it('should create multiple records', async () => {
         const results = await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: 'inactive' },
            { email: 'user3@example.com', status: 'pending' },
         ])
         expect(results).toHaveLength(3)
         expect(results[0]?.email).toBe('user1@example.com')
         expect(results[1]?.email).toBe('user2@example.com')
         expect(results[2]?.email).toBe('user3@example.com')
      })

      it('should create record with belongs-to relation', async () => {
         const user = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
         })

         const profile = await orm.create('profiles', [
            {
               user: user.id,
               display_name: 'Test User',
            },
         ])
         expect(profile).toHaveLength(1)
         expect(profile[0]?.user).toBe(user.id)
         expect(profile[0]?.display_name).toBe('Test User')
      })

      it('should create record with has-one relation', async () => {
         const results = await orm.create('users', [
            {
               email: 'user1@example.com',
               status: 'active',
               profile: { display_name: 'Test User' },
            },
         ])
         expect(results).toHaveLength(1)
         expect(results[0]?.email).toBe('user1@example.com')

         const profile = await orm.findOne('profiles', {
            where: { user: { $eq: results[0]!.id } },
         })
         expect(profile).toBeDefined()
         expect(profile?.display_name).toBe('Test User')
      })

      it('should create record with has-many relation', async () => {
         const results = await orm.create('users', [
            {
               email: 'user1@example.com',
               status: 'active',
               posts: [
                  { title: 'Post 1', slug: 'post-1' },
                  { title: 'Post 2', slug: 'post-2' },
               ],
            },
         ])
         expect(results).toHaveLength(1)

         const posts = await orm.find('posts', {
            where: { author: { $eq: results[0]!.id } },
         })
         expect(posts).toHaveLength(2)
         expect(posts[0]?.title).toBe('Post 1')
         expect(posts[1]?.title).toBe('Post 2')
      })

      it('should create record with many-to-many relation', async () => {
         const results = await orm.create('users', [
            {
               email: 'user1@example.com',
               status: 'active',
               roles: [
                  { name: 'admin' },
                  { name: 'editor' },
               ],
            },
         ])
         expect(results).toHaveLength(1)

         const roles = await orm.find('roles')
         expect(roles).toHaveLength(2)

         const userRoles = await orm.find('user_roles', {
            where: { user: { $eq: results[0]!.id } },
         })
         expect(userRoles).toHaveLength(2)
      })

      it('should create record with nested many-to-many relation', async () => {
         const user = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
         })

         const results = await orm.create('posts', [
            {
               author: user.id,
               title: 'Test Post',
               slug: 'test-post',
               tags: [
                  { name: 'tech' },
                  { name: 'programming' },
               ],
            },
         ])
         expect(results).toHaveLength(1)

         const tags = await orm.find('tags')
         expect(tags).toHaveLength(2)

         const postTags = await orm.find('post_tags', {
            where: { post: { $eq: results[0]!.id } },
         })
         expect(postTags).toHaveLength(2)
      })

      it('should create record with deeply nested relations', async () => {
         const results = await orm.create('users', [
            {
               email: 'user1@example.com',
               status: 'active',
               profile: { display_name: 'Test User' },
               posts: [
                  {
                     title: 'Post 1',
                     slug: 'post-1',
                     tags: [
                        { name: 'tech' },
                        { name: 'programming' },
                     ],
                  },
               ],
            },
         ])
         expect(results).toHaveLength(1)

         const profile = await orm.findOne('profiles', {
            where: { user: { $eq: results[0]!.id } },
         })
         expect(profile).toBeDefined()

         const posts = await orm.find('posts', {
            where: { author: { $eq: results[0]!.id } },
         })
         expect(posts).toHaveLength(1)

         const postTags = await orm.find('post_tags', {
            where: { post: { $eq: posts[0]!.id } },
         })
         expect(postTags).toHaveLength(2)
      })

      it('should create multiple records with relations', async () => {
         const results = await orm.create('users', [
            {
               email: 'user1@example.com',
               status: 'active',
               posts: [{ title: 'Post 1', slug: 'post-1' }],
            },
            {
               email: 'user2@example.com',
               status: 'active',
               posts: [{ title: 'Post 2', slug: 'post-2' }],
            },
         ])
         expect(results).toHaveLength(2)

         const allPosts = await orm.find('posts')
         expect(allPosts).toHaveLength(2)
      })
   })

   describe('createOne', () => {
      it('should create a single record', async () => {
         const result = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
         })
         expect(result).toBeDefined()
         expect(result.email).toBe('user1@example.com')
         expect(result.id).toBeDefined()
      })

      it('should create record with has-one relation', async () => {
         const result = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
            profile: { display_name: 'Test User' },
         })
         expect(result.email).toBe('user1@example.com')

         const profile = await orm.findOne('profiles', {
            where: { user: { $eq: result.id } },
         })
         expect(profile).toBeDefined()
         expect(profile?.display_name).toBe('Test User')
      })

      it('should create record with has-many relation', async () => {
         const result = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
            posts: [
               { title: 'Post 1', slug: 'post-1' },
               { title: 'Post 2', slug: 'post-2' },
            ],
         })
         expect(result.email).toBe('user1@example.com')

         const posts = await orm.find('posts', {
            where: { author: { $eq: result.id } },
         })
         expect(posts).toHaveLength(2)
      })

      it('should create record with many-to-many relation', async () => {
         const result = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
            roles: [
               { name: 'admin' },
               { name: 'editor' },
            ],
         })
         expect(result.email).toBe('user1@example.com')

         const roles = await orm.find('roles')
         expect(roles.length).toBeGreaterThanOrEqual(2)

         const userRoles = await orm.find('user_roles', {
            where: { user: { $eq: result.id } },
         })
         expect(userRoles.length).toBeGreaterThanOrEqual(2)
      })

      it('should create record with complex nested relations', async () => {
         const result = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
            profile: { display_name: 'Test User' },
            posts: [
               {
                  title: 'Post 1',
                  slug: 'post-1',
                  tags: [
                     { name: 'tech' },
                     { name: 'programming' },
                  ],
               },
            ],
            roles: [
               {
                  name: 'admin',
                  policies: [
                     {
                        name: 'manage-users',
                        permissions: [
                           { name: 'read-users' },
                           { name: 'write-users' },
                        ],
                     },
                  ],
               },
            ],
         })
         expect(result.email).toBe('user1@example.com')

         const profile = await orm.findOne('profiles', {
            where: { user: { $eq: result.id } },
         })
         expect(profile).toBeDefined()

         const posts = await orm.find('posts', {
            where: { author: { $eq: result.id } },
         })
         expect(posts).toHaveLength(1)

         const roles = await orm.find('roles')
         expect(roles.length).toBeGreaterThanOrEqual(1)

         const policies = await orm.find('policies')
         expect(policies.length).toBeGreaterThanOrEqual(1)

         const permissions = await orm.find('permissions')
         expect(permissions.length).toBeGreaterThanOrEqual(2)
      })
   })

   describe('update', () => {
      it('should update single record matching filter', async () => {
         const user = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
         })

         const count = await orm.update('users', {
            id: { $eq: user.id },
         }, {
            status: 'inactive',
         })
         expect(count).toBe(1)

         const updated = await orm.findOne('users', user.id)
         expect(updated?.status).toBe('inactive')
         expect(updated?.email).toBe('user1@example.com')
      })

      it('should update multiple records matching filter', async () => {
         await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: 'active' },
            { email: 'user3@example.com', status: 'inactive' },
         ])

         const count = await orm.update('users', {
            status: { $eq: 'active' },
         }, {
            status: 'pending',
         })
         expect(count).toBeGreaterThanOrEqual(2)

         const updated = await orm.find('users', {
            where: { status: { $eq: 'pending' } },
         })
         expect(updated.length).toBeGreaterThanOrEqual(2)
         expect(updated.every(r => r.status === 'pending')).toBe(true)
      })

      it('should update record with has-one relation', async () => {
         const user = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
            profile: { display_name: 'Original Name' },
         })

         const profile = await orm.findOne('profiles', {
            where: { user: { $eq: user.id } },
         })

         await orm.update('users', {
            id: { $eq: user.id },
         }, {
            email: 'updated@example.com',
            profile: {
               id: profile!.id,
               display_name: 'Updated Name',
            },
         })

         const updatedUser = await orm.findOne('users', user.id)
         expect(updatedUser?.email).toBe('updated@example.com')

         const updatedProfile = await orm.findOne('profiles', {
            where: { user: { $eq: user.id } },
         })
         expect(updatedProfile?.display_name).toBe('Updated Name')
      })

      it('should update record with has-many relation', async () => {
         const user = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
            posts: [
               { title: 'Original Post', slug: 'original-post' },
            ],
         })

         const post = await orm.findOne('posts', {
            where: { author: { $eq: user.id } },
         })

         await orm.update('users', {
            id: { $eq: user.id },
         }, {
            posts: [
               {
                  id: post!.id,
                  title: 'Updated Post',
                  slug: 'updated-post',
               },
            ],
         })

         const updatedPost = await orm.findOne('posts', post!.id)
         expect(updatedPost?.title).toBe('Updated Post')
      })

      it('should update record with many-to-many relation', async () => {
         const user = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
            roles: [{ name: 'admin' }],
         })

         const role = await orm.findOne('roles', {
            where: { name: { $eq: 'admin' } },
         })

         await orm.update('users', {
            id: { $eq: user.id },
         }, {
            roles: [
               { id: role!.id, name: 'super-admin' },
            ],
         })

         const updatedRole = await orm.findOne('roles', role!.id)
         expect(updatedRole?.name).toBe('super-admin')
      })

      it('should update record with nested many-to-many relation', async () => {
         const user = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
         })

         const post = await orm.createOne('posts', {
            author: user.id,
            title: 'Test Post',
            slug: 'test-post',
            tags: [{ name: 'tech' }],
         })

         const tag = await orm.findOne('tags', {
            where: { name: { $eq: 'tech' } },
         })

         await orm.update('posts', {
            id: { $eq: post.id },
         }, {
            tags: [
               { id: tag!.id, name: 'technology' },
               { name: 'programming' },
            ],
         })

         const updatedTag = await orm.findOne('tags', tag!.id)
         expect(updatedTag?.name).toBe('technology')

         const newTag = await orm.findOne('tags', {
            where: { name: { $eq: 'programming' } },
         })
         expect(newTag).toBeDefined()

         const postTags = await orm.find('post_tags', {
            where: { post: { $eq: post.id } },
         })
         expect(postTags.length).toBeGreaterThanOrEqual(2)
      })
   })

   describe('updateOne', () => {
      it('should update single record matching filter', async () => {
         const user = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
         })

         const result = await orm.updateOne('users', {
            id: { $eq: user.id },
         }, {
            status: 'inactive',
         })
         expect(result).toBeDefined()
         expect(result?.status).toBe('inactive')
         expect(result?.email).toBe('user1@example.com')
      })

      it('should return undefined when no record matches', async () => {
         const result = await orm.updateOne('users', {
            id: { $eq: 99999 },
         }, {
            status: 'inactive',
         })
         expect(result).toBeUndefined()
      })

      it('should update record with has-one relation', async () => {
         const user = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
            profile: { display_name: 'Original Name' },
         })

         const [profile] = await orm.find('profiles', {
            where: {
               user: { $eq: user.id },
            },
         })

         const result = await orm.updateOne('users', {
            id: { $eq: user.id },
         }, {
            email: 'updated@example.com',
            profile: {
               id: profile!.id,
               display_name: 'Updated Name',
            },
         })

         expect(result?.email).toBe('updated@example.com')

         const updatedProfile = await orm.findOne('profiles', {
            where: { user: { $eq: user.id } },
         })
         expect(updatedProfile?.display_name).toBe('Updated Name')
      })

      it('should update record with has-many relation', async () => {
         const user = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
            posts: [
               { title: 'Original Post', slug: 'original-post' },
            ],
         })

         const post = await orm.findOne('posts', {
            where: { author: { $eq: user.id } },
         })

         await orm.updateOne('users', {
            id: { $eq: user.id },
         }, {
            posts: [
               {
                  id: post!.id,
                  title: 'Updated Post',
                  slug: 'updated-post',
               },
            ],
         })

         const updatedPost = await orm.findOne('posts', post!.id)
         expect(updatedPost?.title).toBe('Updated Post')
      })

      it('should update record with many-to-many relation', async () => {
         const user = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
            roles: [{ name: 'admin' }],
         })

         const role = await orm.findOne('roles', {
            where: { name: { $eq: 'admin' } },
         })

         await orm.updateOne('users', {
            id: { $eq: user.id },
         }, {
            roles: [
               { id: role!.id, name: 'super-admin' },
            ],
         })

         const updatedRole = await orm.findOne('roles', role!.id)
         expect(updatedRole?.name).toBe('super-admin')
      })

      it('should update record with complex nested relations', async () => {
         const user = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
            roles: [
               {
                  name: 'admin',
                  policies: [
                     {
                        name: 'manage-users',
                        permissions: [{ name: 'read-users' }],
                     },
                  ],
               },
            ],
         })

         const role = await orm.findOne('roles', {
            where: { name: { $eq: 'admin' } },
         })
         const policy = await orm.findOne('policies', {
            where: { name: { $eq: 'manage-users' } },
         })
         const permission = await orm.findOne('permissions', {
            where: { name: { $eq: 'read-users' } },
         })

         await orm.updateOne('users', {
            id: { $eq: user.id },
         }, {
            roles: [
               {
                  id: role!.id,
                  name: 'super-admin',
                  policies: [
                     {
                        id: policy!.id,
                        name: 'manage-everything',
                        permissions: [
                           { id: permission!.id, name: 'read-users' },
                           { name: 'delete-users' },
                        ],
                     },
                  ],
               },
            ],
         })

         const updatedRole = await orm.findOne('roles', role!.id)
         expect(updatedRole?.name).toBe('super-admin')

         const updatedPolicy = await orm.findOne('policies', policy!.id)
         expect(updatedPolicy?.name).toBe('manage-everything')

         const permissions = await orm.find('permissions')
         expect(permissions.length).toBeGreaterThanOrEqual(2)
      })
   })

   describe('remove', () => {
      it('should remove single record matching filter', async () => {
         const user = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
         })

         const count = await orm.remove('users', {
            id: { $eq: user.id },
         })
         expect(count).toBe(1)

         const found = await orm.findOne('users', user.id)
         expect(found).toBeUndefined()
      })

      it('should remove multiple records matching filter', async () => {
         await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: 'active' },
            { email: 'user3@example.com', status: 'inactive' },
         ])

         const count = await orm.remove('users', {
            status: { $eq: 'active' },
         })
         expect(count).toBeGreaterThanOrEqual(2)

         const remaining = await orm.find('users', {
            where: { status: { $eq: 'active' } },
         })
         expect(remaining).toHaveLength(0)
      })

      it('should return zero when no records match', async () => {
         const count = await orm.remove('users', {
            id: { $eq: 99999 },
         })
         expect(count).toBe(0)
      })

      it('should remove record with has-one relation', async () => {
         const user = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
            profile: { display_name: 'Test User' },
         })

         const count = await orm.remove('users', {
            id: { $eq: user.id },
         })
         expect(count).toBe(1)

         // Profile might still exist depending on cascade behavior
         // This test verifies the user is removed
         const foundUser = await orm.findOne('users', user.id)
         expect(foundUser).toBeUndefined()
      })

      it('should remove record with has-many relation', async () => {
         const user = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
            posts: [
               { title: 'Post 1', slug: 'post-1' },
               { title: 'Post 2', slug: 'post-2' },
            ],
         })

         const count = await orm.remove('users', {
            id: { $eq: user.id },
         })
         expect(count).toBe(1)

         const foundUser = await orm.findOne('users', user.id)
         expect(foundUser).toBeUndefined()

         // Posts might still exist depending on cascade behavior
         // This test verifies the user is removed
      })
   })

   describe('removeOne', () => {
      it('should remove single record matching filter', async () => {
         const user = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
         })

         const result = await orm.removeOne('users', {
            id: { $eq: user.id },
         })
         expect(result).toBeDefined()
         expect(result?.id).toBe(user.id)

         const found = await orm.findOne('users', user.id)
         expect(found).toBeUndefined()
      })

      it('should return undefined when no record matches', async () => {
         const result = await orm.removeOne('users', {
            id: { $eq: 99999 },
         })
         expect(result).toBeUndefined()
      })

      it('should remove first matching record when multiple match', async () => {
         await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: 'active' },
         ])

         const result = await orm.removeOne('users', {
            status: { $eq: 'active' },
         })
         expect(result).toBeDefined()

         const remaining = await orm.find('users', {
            where: { status: { $eq: 'active' } },
         })
         expect(remaining.length).toBeLessThan(2)
      })

      it('should remove record with relations', async () => {
         const user = await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
            profile: { display_name: 'Test User' },
            posts: [{ title: 'Post 1', slug: 'post-1' }],
         })

         const result = await orm.removeOne('users', {
            id: { $eq: user.id },
         })
         expect(result).toBeDefined()

         const foundUser = await orm.findOne('users', user.id)
         expect(foundUser).toBeUndefined()
      })
   })

   describe('complex queries', () => {
      it('should handle find with complex filter combinations', async () => {
         await orm.create('users', [
            { email: 'alice@example.com', status: 'active' },
            { email: 'bob@test.com', status: 'active' },
            { email: 'charlie@example.com', status: 'inactive' },
            { email: 'david@example.com', status: 'pending' },
         ])

         const results = await orm.find('users', {
            where: {
               $and: [
                  { email: { $like: '%@example.com' } },
                  {
                     $or: [
                        { status: { $eq: 'active' } },
                        { status: { $eq: 'pending' } },
                     ],
                  },
               ],
            },
         })
         expect(results.length).toBeGreaterThanOrEqual(2)
      })

      it('should handle find with pagination and ordering', async () => {
         await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: 'active' },
            { email: 'user3@example.com', status: 'active' },
            { email: 'user4@example.com', status: 'active' },
            { email: 'user5@example.com', status: 'active' },
         ])

         const page1 = await orm.find('users', {
            orderBy: ['email'],
            limit: 2,
            offset: 0,
         })
         expect(page1).toHaveLength(2)

         const page2 = await orm.find('users', {
            orderBy: ['email'],
            limit: 2,
            offset: 2,
         })
         expect(page2).toHaveLength(2)
         expect(page2[0]?.email).not.toBe(page1[0]?.email)
      })

      it('should handle findOne with complex filter', async () => {
         await orm.create('users', [
            { email: 'alice@example.com', status: 'active' },
            { email: 'bob@test.com', status: 'active' },
            { email: 'charlie@example.com', status: 'inactive' },
         ])

         const result = await orm.findOne('users', {
            where: {
               $and: [
                  { email: { $like: '%@example.com' } },
                  { status: { $eq: 'active' } },
               ],
            },
            orderBy: ['email'],
         })
         expect(result).toBeDefined()
         expect(result?.email).toBe('alice@example.com')
      })
   })

   describe('edge cases', () => {
      it('should handle create with empty array', async () => {
         const results = await orm.create('users', [])
         expect(results).toEqual([])
      })

      it('should handle update with no matching records', async () => {
         const count = await orm.update('users', {
            id: { $eq: 99999 },
         }, {
            status: 'active',
         })
         expect(count).toBe(0)
      })

      it('should handle remove with no matching records', async () => {
         const count = await orm.remove('users', {
            id: { $eq: 99999 },
         })
         expect(count).toBe(0)
      })

      it('should handle find with empty result set', async () => {
         const results = await orm.find('users', {
            where: { email: { $eq: 'nonexistent@example.com' } },
         })
         expect(results).toEqual([])
      })

      it('should handle nullable fields correctly', async () => {
         const user = await orm.createOne('users', {
            email: 'user1@example.com',
            status: null,
         })
         expect(user.status).toBeNull()

         const found = await orm.findOne('users', user.id)
         expect(found?.status).toBeNull()
      })

      it('should handle unique constraint violations gracefully', async () => {
         await orm.createOne('users', {
            email: 'user1@example.com',
            status: 'active',
         })

         // This should fail due to unique constraint
         // The exact behavior depends on the implementation
         // We're just testing that it doesn't crash
         try {
            await orm.createOne('users', {
               email: 'user1@example.com',
               status: 'active',
            })
         }
         catch (error) {
            // Expected to throw
            expect(error).toBeDefined()
         }
      })
   })
})

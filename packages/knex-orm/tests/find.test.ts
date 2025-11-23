import type { schema } from './schema'
import type { FieldName } from '@/types/fields'
import { describe, expect, it } from 'vitest'
import { createTestUsers, createTestUserWithRelations, expectAllHaveNonNullStatus, expectAllHaveStatus, expectAllHaveStatusIn, setupQueryTests, withDefaultFields } from './utils'

setupQueryTests('find query tests (%s)', (getOrm) => {
   describe('basic queries', () => {
      it('should return empty array when no records exist', async () => {
         const orm = getOrm()
         const results = await orm.find('users', {
            columns: ['id', 'email'],
         })

         expect(results).toEqual([])
      })

      it('should return all records when no filter is provided', async () => {
         const orm = getOrm()
         await createTestUsers(orm, [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: 'inactive' },
            { email: 'user3@example.com', status: 'active' },
         ])

         const results = await orm.find('users')
         expect(results).toHaveLength(3)

         expect(results).toMatchObject(expect.arrayContaining([
            { id: 1, email: 'user1@example.com', status: 'active', created_at: expect.anything(), updated_at: expect.anything() },
            { id: 2, email: 'user2@example.com', status: 'inactive', created_at: expect.anything(), updated_at: expect.anything() },
            { id: 3, email: 'user3@example.com', status: 'active', created_at: expect.anything(), updated_at: expect.anything() },
         ]))
      })
   })

   describe('filtering', () => {
      it('should filter records by simple equality', async () => {
         const orm = getOrm()
         await createTestUsers(orm, [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: 'inactive' },
            { email: 'user3@example.com', status: 'active' },
         ])

         const results = await orm.find('users', {
            where: { status: { $eq: 'active' } },
         })
         expect(results).toHaveLength(2)
         expectAllHaveStatus(results, 'active')
      })

      it('should filter records using $ne operator', async () => {
         const orm = getOrm()
         await createTestUsers(orm, [
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
         const orm = getOrm()
         await createTestUsers(orm, [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: 'inactive' },
            { email: 'user3@example.com', status: 'pending' },
         ])

         const results = await orm.find('users', {
            where: { status: { $in: ['active', 'pending'] } },
         })
         expect(results).toHaveLength(2)
         expectAllHaveStatusIn(results, ['active', 'pending'])
      })

      it('should filter records using $nin operator', async () => {
         const orm = getOrm()
         await createTestUsers(orm, [
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
         const orm = getOrm()
         await createTestUsers(orm, [
            { email: 'alice@example.com', status: 'active' },
            { email: 'bob@example.com', status: 'active' },
            { email: 'charlie@test.com', status: 'active' },
         ])

         const results = await orm.find('users', {
            where: { email: { $endsWith: '%@example.com' } },
         })
         expect(results).toHaveLength(2)
      })

      it('should filter records with null values', async () => {
         const orm = getOrm()
         await createTestUsers(orm, [
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
         const orm = getOrm()
         await createTestUsers(orm, [
            { email: 'user1@example.com', status: 'active' },
            { email: 'user2@example.com', status: null },
            { email: 'user3@example.com', status: 'inactive' },
         ])

         const results = await orm.find('users', {
            where: { status: { $nnull: true } },
         })
         expect(results).toHaveLength(2)
         expectAllHaveNonNullStatus(results)
      })
   })

   describe('logical operators', () => {
      it('should filter records using $and operator', async () => {
         const orm = getOrm()
         await createTestUsers(orm, [
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
         const orm = getOrm()
         await createTestUsers(orm, [
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
   })

   describe('ordering and pagination', () => {
      it('should support ordering with orderBy option', async () => {
         const orm = getOrm()
         await createTestUsers(orm, [
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
         const orm = getOrm()
         await createTestUsers(orm, [
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
         const orm = getOrm()
         await createTestUsers(orm, [
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
         const orm = getOrm()
         await createTestUsers(orm, [
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
   })

   describe('column selection', () => {
      it('should support select option to limit columns', async () => {
         const orm = getOrm()
         await createTestUsers(orm, [
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
         const orm = getOrm()
         await createTestUserWithRelations(orm, {
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
                        action: ['read', 'write'],
                     }],
                  }],
               },
            ],
         })

         const results = await orm.find('users', {
            columns: ['id', 'email', 'profile.display_name', 'posts.title', 'roles.name', 'roles.policies.name', 'roles.policies.permissions.name', 'roles.policies.permissions.action'],
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
               { name: 'editor', policies: [{ name: 'manage-users', permissions: [{ name: 'read-users', action: ['read', 'write'] }] }] },
            ],
         })
      })
   })

   describe('nested filters', () => {
      it('should filter records with nested filters on posts', async () => {
         const orm = getOrm()
         await createTestUserWithRelations(orm, {
            email: 'user1@example.com',
            status: 'active',
            posts: [{ title: 'Post 1', slug: 'post-1' }],
         })
         await createTestUsers(orm, [
            { email: 'user2@example.com', status: 'inactive' },
         ])

         const results = await orm.find('users', {
            where: {
               status: { $eq: 'active' },
               posts: {
                  title: { $eq: 'Post 1' },
               },
            },
         })

         expect(results).toHaveLength(1)
         expect(results[0]?.email).toBe('user1@example.com')
      })

      it('should filter records with deeply nested filters', async () => {
         const orm = getOrm()
         await createTestUserWithRelations(orm, {
            email: 'user3@example.com',
            status: 'active',
            roles: [{
               name: 'admin',
               policies: [{ name: 'manage-users', permissions: [{ name: 'read-users' }] }],
            }],
         })

         const results = await orm.find('users', {
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
         expect(results).toHaveLength(1)
         expect(results[0]).toMatchObject({
            email: 'user3@example.com',
            roles: [{
               name: 'admin',
               policies: [{ name: 'manage-users', permissions: [{ name: 'read-users' }] }],
            }],
         })
      })
   })

   describe('wildcard column selections', () => {
      it('should support wildcards at different depths', async () => {
         const orm = getOrm()
         const tag = { name: 'Tag 1' }
         const post = {
            title: 'Post 1',
            slug: 'post-1',
            tags: [tag],
         }
         const collection = { name: 'users' }
         const permission = {
            name: 'read-users',
            collection,
         }
         const policy = {
            name: 'manage-users',
            permissions: [permission],
         }
         const role = {
            name: 'admin',
            policies: [policy],
         }
         const user = {
            email: 'user@example.com',
            status: 'active',
            posts: [post],
            roles: [role],
         }

         await orm.createOne('users', user)

         const expectedOutputs = [
            withDefaultFields({
               email: 'user@example.com',
               status: 'active',
            }),
            withDefaultFields({
               email: 'user@example.com',
               status: 'active',
               posts: [withDefaultFields({
                  title: post.title,
                  slug: post.slug,
                  author: expect.any(Number),
               })],
               roles: [withDefaultFields({
                  name: role.name,
               })],
            }),
            withDefaultFields({
               email: 'user@example.com',
               status: 'active',
               posts: [withDefaultFields({
                  title: post.title,
                  slug: post.slug,
                  author: expect.any(Number),
                  tags: [withDefaultFields({
                     name: tag.name,
                  })],
               })],
               roles: [withDefaultFields({
                  name: role.name,
                  policies: [withDefaultFields({
                     name: policy.name,
                  })],
               })],
            }),
            withDefaultFields({
               email: 'user@example.com',
               status: 'active',
               posts: [withDefaultFields({
                  title: post.title,
                  slug: post.slug,
                  author: expect.any(Number),
                  tags: [withDefaultFields({
                     name: tag.name,
                  })],
               })],
               roles: [withDefaultFields({
                  name: role.name,
                  policies: [withDefaultFields({
                     name: policy.name,
                     permissions: [withDefaultFields({
                        name: permission.name,
                        action: null,
                        collection: expect.any(Number),
                     })],
                  })],
               })],
            }),
            withDefaultFields({
               email: 'user@example.com',
               status: 'active',
               posts: [withDefaultFields({
                  title: post.title,
                  slug: post.slug,
                  author: expect.any(Number),
                  tags: [withDefaultFields({
                     name: tag.name,
                  })],
               })],
               roles: [withDefaultFields({
                  name: role.name,
                  policies: [withDefaultFields({
                     name: policy.name,
                     permissions: [withDefaultFields({
                        name: permission.name,
                        action: null,
                        collection: withDefaultFields({
                           name: collection.name,
                        }),
                     })],
                  })],
               })],
            }),
         ]

         for (let depth = 1; depth <= 5; depth++) {
            const columns = Array.from({ length: depth }, () => '*').join('.') as unknown as FieldName<typeof schema, 'users'>

            const result = await orm.findOne('users', 1, {
               columns: [columns],
            })

            expect(result).toStrictEqual(expectedOutputs[depth - 1])
         }
      })

      it('should support nested wildcards for posts relation', async () => {
         const orm = getOrm()
         const tag = { name: 'Tag 1' }
         const post = {
            title: 'Post 1',
            slug: 'post-1',
            tags: [tag],
         }
         const user = {
            email: 'user@example.com',
            status: 'active',
            posts: [post],
         }

         await orm.createOne('users', user)

         const expectedOutputs = [
            withDefaultFields({
               email: 'user@example.com',
               status: 'active',
               posts: [withDefaultFields({
                  title: post.title,
                  slug: post.slug,
                  author: expect.any(Number),
               })],
            }),
            withDefaultFields({
               email: 'user@example.com',
               status: 'active',
               posts: [withDefaultFields({
                  title: post.title,
                  slug: post.slug,
                  author: expect.any(Number),
                  tags: [withDefaultFields({
                     name: tag.name,
                  })],
               })],
            }),
            withDefaultFields({
               email: 'user@example.com',
               status: 'active',
               posts: [withDefaultFields({
                  title: post.title,
                  slug: post.slug,
                  author: expect.any(Number),
                  tags: [withDefaultFields({
                     name: tag.name,
                  })],
               })],
            }),
         ]

         for (let depth = 1; depth <= 3; depth++) {
            const columns = Array.from({ length: depth }, () => '*').join('.')

            const result = await orm.findOne('users', 1, {
               columns: [`posts.${columns}`] as FieldName<typeof schema, 'users'>[],
            })

            const expected = expectedOutputs[depth - 1]
            if (!('posts' in expected)) throw new Error('Posts not found in expected outputs')
            expect(result).toStrictEqual({ posts: expected.posts as object })
         }
      })

      it('should support nested wildcards for roles relation', async () => {
         const orm = getOrm()
         const collection = { name: 'users' }
         const permission = {
            name: 'read-users',
            collection,
         }
         const policy = {
            name: 'manage-users',
            permissions: [permission],
         }
         const role = {
            name: 'admin',
            policies: [policy],
         }
         const user = {
            email: 'user@example.com',
            status: 'active',
            roles: [role],
         }

         await orm.createOne('users', user)

         const expectedOutputs = [
            withDefaultFields({
               email: 'user@example.com',
               status: 'active',
               roles: [withDefaultFields({
                  name: role.name,
               })],
            }),
            withDefaultFields({
               email: 'user@example.com',
               status: 'active',
               roles: [withDefaultFields({
                  name: role.name,
                  policies: [withDefaultFields({
                     name: policy.name,
                  })],
               })],
            }),
            withDefaultFields({
               email: 'user@example.com',
               status: 'active',
               roles: [withDefaultFields({
                  name: role.name,
                  policies: [withDefaultFields({
                     name: policy.name,
                     permissions: [withDefaultFields({
                        name: permission.name,
                        action: null,
                        collection: expect.any(Number),
                     })],
                  })],
               })],
            }),
            withDefaultFields({
               email: 'user@example.com',
               status: 'active',
               roles: [withDefaultFields({
                  name: role.name,
                  policies: [withDefaultFields({
                     name: policy.name,
                     permissions: [withDefaultFields({
                        name: permission.name,
                        action: null,
                        collection: withDefaultFields({
                           name: collection.name,
                        }),
                     })],
                  })],
               })],
            }),
         ]

         for (let depth = 1; depth <= 4; depth++) {
            const columns = Array.from({ length: depth }, () => '*').join('.')

            const result = await orm.findOne('users', 1, {
               columns: [`roles.${columns}`] as FieldName<typeof schema, 'users'>[],
            })

            const expected = expectedOutputs[depth - 1]
            if (!('roles' in expected)) throw new Error('Roles not found in expected outputs')
            expect(result).toStrictEqual({ roles: expected.roles as object })
         }
      })
   })
})

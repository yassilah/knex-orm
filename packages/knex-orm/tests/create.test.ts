import { describe, expect, it } from 'vitest'
import { setupQueryTests } from './utils'

setupQueryTests('create query tests (%s)', (getOrm) => {
   describe('basic creation', () => {
      it('should create a single record', async () => {
         const orm = getOrm()
         const results = await orm.create('users', [
            { email: 'user1@example.com', status: 'active' },
         ])
         expect(results).toHaveLength(1)
         expect(results[0]?.email).toBe('user1@example.com')
         expect(results[0]?.id).toBeDefined()
      })

      it('should create multiple records', async () => {
         const orm = getOrm()
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
   })

   describe('relations', () => {
      it('should create record with belongs-to relation', async () => {
         const orm = getOrm()
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
         const orm = getOrm()
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
            where: {
               user: { $eq: results[0]!.id },
            },
         })

         expect(profile?.display_name).toBe('Test User')
      })

      it('should create record with has-many relation', async () => {
         const orm = getOrm()
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
         const orm = getOrm()
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

         const userRoles = await orm.find('users_roles', {
            where: { user: { $eq: results[0]!.id } },
         })
         expect(userRoles).toHaveLength(2)
      })

      it('should create record with nested many-to-many relation', async () => {
         const orm = getOrm()
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

         const postTags = await orm.find('posts_tags', {
            where: { post: { $eq: results[0]!.id } },
         })
         expect(postTags).toHaveLength(2)
      })

      it('should create record with deeply nested relations', async () => {
         const orm = getOrm()
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

         const postTags = await orm.find('posts_tags', {
            where: { post: { $eq: posts[0]!.id } },
         })
         expect(postTags).toHaveLength(2)
      })

      it('should create multiple records with relations', async () => {
         const orm = getOrm()
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

   describe('relation filtering by id', () => {
      it('should be able to filter a relation by id in various ways', async () => {
         const orm = getOrm()
         const [result] = await orm.create('users', [
            {
               email: 'user1@example.com',
               status: 'active',
               profile: { display_name: 'Test User' },
               posts: [{ title: 'Post 1', slug: 'post-1', tags: [{ name: 'Tag 1' }] }],
            },
         ])

         // Filter by direct id
         const post = await orm.findOne('posts', {
            where: {
               author: { $eq: result!.id },
            },
         })

         // Filter by id in object
         const post2 = await orm.findOne('posts', {
            where: {
               author: { id: { $eq: result!.id } },
            },
         })

         // Filter by id as value
         const post3 = await orm.findOne('posts', {
            where: {
               author: result!.id,
            },
         })

         // Filter by id as array value
         const post4 = await orm.findOne('posts', {
            where: {
               author: [result!.id],
            },
         })

         expect(post?.title).toBe('Post 1')
         expect(post2).toMatchObject(post!)
         expect(post3).toMatchObject(post!)
         expect(post4).toMatchObject(post!)

         const tags = await orm.find('tags', {
            where: {
               posts: { $eq: post!.id },
            },
         })

         const tags2 = await orm.find('tags', {
            where: {
               posts: { id: { $eq: post2!.id } },
            },
         })

         const tags3 = await orm.find('tags', {
            where: {
               posts: result!.id,
            },
         })

         const tags4 = await orm.find('tags', {
            where: {
               posts: [post!.id],
            },
         })

         expect(tags).toHaveLength(1)
         expect(tags[0]?.name).toBe('Tag 1')
         expect(tags2).toMatchObject(tags!)
         expect(tags3).toMatchObject(tags!)
         expect(tags4).toMatchObject(tags!)
      })
   })
})

import { describe, expect, it } from 'vitest'
import { createTestUsers, setupQueryTests } from './utils'

setupQueryTests('update query tests (%s)', (getOrm) => {
   describe('basic updates', () => {
      it('should update single record matching filter', async () => {
         const orm = getOrm()
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
         const orm = getOrm()
         await createTestUsers(orm, [
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
   })

   describe('updating relations', () => {
      it('should update record with has-one relation', async () => {
         const orm = getOrm()
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
         const orm = getOrm()
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
         const orm = getOrm()
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
         const orm = getOrm()
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

         const postTags = await orm.find('posts_tags', {
            where: { post: { $eq: post.id } },
         })
         expect(postTags.length).toBeGreaterThanOrEqual(2)
      })
   })
})

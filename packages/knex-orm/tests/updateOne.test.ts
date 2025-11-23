import { expect, it } from 'vitest'
import { setupQueryTests } from './utils'

setupQueryTests('updateOne query tests (%s)', (getOrm) => {
   it('should update single record matching filter', async () => {
      const orm = getOrm()
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
      const orm = getOrm()
      const result = await orm.updateOne('users', {
         id: { $eq: 99999 },
      }, {
         status: 'inactive',
      })
      expect(result).toBeUndefined()
   })

   it('should update record with has-one relation', async () => {
      const orm = getOrm()
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
      const orm = getOrm()
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
      const orm = getOrm()
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

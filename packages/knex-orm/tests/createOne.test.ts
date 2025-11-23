import { expect, it } from 'vitest'
import { setupQueryTests } from './utils'

setupQueryTests('createOne query tests (%s)', (getOrm) => {
   it('should create a single record', async () => {
      const orm = getOrm()
      const result = await orm.createOne('users', {
         email: 'user1@example.com',
         status: 'active',
      })
      expect(result).toBeDefined()
      expect(result.email).toBe('user1@example.com')
      expect(result.id).toBeDefined()
   })

   it('should create record with has-one relation', async () => {
      const orm = getOrm()
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
      const orm = getOrm()
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
      const orm = getOrm()
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

      const userRoles = await orm.find('users_roles', {
         where: { user: { $eq: result.id } },
      })
      expect(userRoles.length).toBeGreaterThanOrEqual(2)
   })

   it('should create record with complex nested relations', async () => {
      const orm = getOrm()
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

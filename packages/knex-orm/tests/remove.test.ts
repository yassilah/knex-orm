import { expect, it } from 'vitest'
import { createTestUsers, setupQueryTests } from './utils'

setupQueryTests('remove query tests (%s)', (getOrm) => {
   it('should remove single record matching filter', async () => {
      const orm = getOrm()
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
      const orm = getOrm()
      await createTestUsers(orm, [
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
      const orm = getOrm()
      const count = await orm.remove('users', {
         id: { $eq: 99999 },
      })
      expect(count).toBe(0)
   })

   it('should remove record with has-one relation', async () => {
      const orm = getOrm()
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
      const orm = getOrm()
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

import { expect, it } from 'vitest'
import { createTestUsers, setupQueryTests } from './utils'

setupQueryTests('removeOne query tests (%s)', (getOrm) => {
   it('should remove single record matching filter', async () => {
      const orm = getOrm()
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
      const orm = getOrm()
      const result = await orm.removeOne('users', {
         id: { $eq: 99999 },
      })
      expect(result).toBeUndefined()
   })

   it('should remove first matching record when multiple match', async () => {
      const orm = getOrm()
      await createTestUsers(orm, [
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
      const orm = getOrm()
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

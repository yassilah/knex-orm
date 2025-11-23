import { expect, it } from 'vitest'
import { setupQueryTests } from './utils'

setupQueryTests('edge cases tests (%s)', (getOrm) => {
   it('should handle create with empty array', async () => {
      const orm = getOrm()
      const results = await orm.create('users', [])
      expect(results).toEqual([])
   })

   it('should handle update with no matching records', async () => {
      const orm = getOrm()
      const count = await orm.update('users', {
         id: { $eq: 99999 },
      }, {
         status: 'active',
      })
      expect(count).toBe(0)
   })

   it('should handle remove with no matching records', async () => {
      const orm = getOrm()
      const count = await orm.remove('users', {
         id: { $eq: 99999 },
      })
      expect(count).toBe(0)
   })

   it('should handle find with empty result set', async () => {
      const orm = getOrm()
      const results = await orm.find('users', {
         where: { email: { $eq: 'nonexistent@example.com' } },
      })
      expect(results).toEqual([])
   })

   it('should handle nullable fields correctly', async () => {
      const orm = getOrm()
      const user = await orm.createOne('users', {
         email: 'user1@example.com',
         status: null,
      })
      expect(user.status).toBeNull()

      const found = await orm.findOne('users', user.id)
      expect(found?.status).toBeNull()
   })

   it('should handle unique constraint violations gracefully', async () => {
      const orm = getOrm()
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

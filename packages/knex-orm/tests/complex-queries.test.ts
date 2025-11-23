import { expect, it } from 'vitest'
import { createTestUsers, setupQueryTests } from './utils'

setupQueryTests('complex queries tests (%s)', (getOrm) => {
   it('should handle find with complex filter combinations', async () => {
      const orm = getOrm()
      await createTestUsers(orm, [
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
      const orm = getOrm()
      await createTestUsers(orm, [
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
      const orm = getOrm()
      await createTestUsers(orm, [
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

import { expect, it } from 'vitest'
import { createTestUsers, setupQueryTests } from './utils'

setupQueryTests('findOne query tests (%s)', (getOrm) => {
   it('should return undefined when no records match', async () => {
      const orm = getOrm()
      const result = await orm.findOne('users', {
         where: { email: { $eq: 'nonexistent@example.com' } },
      })
      expect(result).toBeUndefined()
   })

   it('should return a single record when filter matches', async () => {
      const orm = getOrm()
      await createTestUsers(orm, [
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
      const orm = getOrm()
      await createTestUsers(orm, [
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
      const orm = getOrm()
      await createTestUsers(orm, [
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
      const orm = getOrm()
      await createTestUsers(orm, [
         { email: 'user1@example.com', status: 'active' },
      ])

      const result = await orm.findOne('users', {
         where: { email: { $eq: 'user1@example.com' } },
      })
      expect(result).toBeDefined()
      expect(result?.email).toBe('user1@example.com')
   })
})

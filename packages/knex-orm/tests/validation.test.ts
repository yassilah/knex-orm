import { beforeAll, describe, expect, it } from 'vitest'
import { installDefaultExtensions, validateCollectionName, validatePayload, validateQueryParams } from '../src'
import { schema } from './schema'

describe('validation utils', () => {
   beforeAll(installDefaultExtensions)

   describe('validateCollectionName', () => {
      it('accepts valid collection names', () => {
         expect(validateCollectionName(schema, 'users')).toBe('users')
      })

      it('rejects unknown collection names', () => {
         expect(() => validateCollectionName(schema, 'unknown')).toThrow()
      })
   })

   describe('validateQueryParams', () => {
      it('validates query params with nested where clauses', () => {
         const params = validateQueryParams(schema, 'users', {
            columns: ['id', 'email', 'profile.display_name', 'posts.title'],
            where: {
               status: { $eq: 'active' },
               posts: {
                  slug: { $eq: 'post-1' },
               },
            },
            orderBy: ['-email'],
            limit: 10,
            offset: 0,
         })

         expect(params.limit).toBe(10)
         expect(params.orderBy).toEqual(['-email'])
      })

      it('rejects invalid column selections', () => {
         expect(() => validateQueryParams(schema, 'users', {
            columns: ['id', 'unknown'],
         })).toThrow(/Unknown column selection/)
      })

      it('rejects invalid filters', () => {
         expect(() => validateQueryParams(schema, 'users', {
            where: {
               unknown: { $eq: 'value' },
            },
         })).toThrow()
      })
   })

   describe('validatePayload', () => {
      it('validates scalar columns and nested relations', () => {
         const payload = {
            email: 'user@example.com',
            status: 'active',
            profile: {
               display_name: 'Test User',
            },
            roles: [
               {
                  name: 'admin',
                  policies: [{
                     name: 'manage-users',
                     permissions: [{ name: 'read-users' }],
                  }],
               },
            ],
         }

         expect(() => validatePayload(schema, 'users', payload)).not.toThrow()
      })

      it('rejects invalid column values', () => {
         expect(() => validatePayload(schema, 'users', {
            email: 123,
         })).toThrow()
      })

      it('enforces required columns in strict mode', () => {
         expect(() => validatePayload(schema, 'users', { status: 'active' }, { partial: false })).toThrow()
      })
   })
})

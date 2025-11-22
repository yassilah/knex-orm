import type { Instance } from '../src'
import type { schema } from './test-helpers'
import type { FieldName } from '@/types/fields'
import type { QueryResultItem } from '@/types/query'
import type { TableItem } from '@/types/schema'
import { describe, expectTypeOf, it } from 'vitest'

// eslint-disable-next-line unused-imports/no-unused-vars
declare const { find }: Instance<typeof schema>

describe('type tests', () => {
   describe('tableItem type', () => {
      it('should have the right type', () => {
         expectTypeOf<TableItem<typeof schema, 'users'>>().toEqualTypeOf<{
            id: number
            email: string
            status: string | null
            created_at: string | Date
            updated_at: string | Date
            posts: number[] | TableItem<typeof schema, 'posts'>[]
            profile: number | null | TableItem<typeof schema, 'profiles'>
            roles: number[] | TableItem<typeof schema, 'roles'>[]
         }>()
      })
   })

   describe('find method return types', () => {
      it('should have the right top-level columns', () => {
         expectTypeOf<FieldName<typeof schema, 'users', false>>().toEqualTypeOf<
            | '*'
            | 'id'
            | 'email'
            | 'status'
            | 'created_at'
            | 'updated_at'
         >()

         expectTypeOf<FieldName<typeof schema, 'posts', false>>().toEqualTypeOf<
            | '*'
            | 'id'
            | 'title'
            | 'slug'
            | 'author'
            | 'created_at'
            | 'updated_at'
         >()

         expectTypeOf<FieldName<typeof schema, 'roles', false>>().toEqualTypeOf<
            | '*'
            | 'id'
            | 'name'
            | 'created_at'
            | 'updated_at'
         >()

         expectTypeOf<FieldName<typeof schema, 'profiles', false>>().toEqualTypeOf<
            | '*'
            | 'id'
            | 'display_name'
            | 'user'
            | 'created_at'
            | 'updated_at'
         >()
      })

      it('should have the right nested columns', () => {
         expectTypeOf<FieldName<typeof schema, 'users'>>().toEqualTypeOf<
            | '*'
            | 'id'
            | 'email'
            | 'status'
            | 'created_at'
            | 'updated_at'
            | 'profile'
            | `posts.${FieldName<typeof schema, 'posts'>}`
            | `roles.${FieldName<typeof schema, 'roles'>}`
            | `profile.${FieldName<typeof schema, 'profiles'>}`
         >()
      })

      it('should return record type without relations when no columns specified', () => {
         expectTypeOf<QueryResultItem<typeof schema, 'users'>>().toEqualTypeOf<{
            id: number
            email: string
            status: string | null
            created_at: string | Date
            updated_at: string | Date
         } | undefined>()

         expectTypeOf<QueryResultItem<typeof schema, 'profiles'>>().toEqualTypeOf<{
            id: number
            display_name: string
            user: number | null
            created_at: string | Date
            updated_at: string | Date
         } | undefined>()
      })

      it('should return only specified columns when columns are provided', () => {
         expectTypeOf<QueryResultItem<typeof schema, 'users', ['id', 'email']>>().toEqualTypeOf<{
            id: number
            email: string
         } | undefined>()
      })

      it('should include relations when specified in columns', () => {
         expectTypeOf<QueryResultItem<typeof schema, 'users', ['id', 'email', 'posts.id']>>().toEqualTypeOf<{
            id: number
            email: string
            posts: { id: number }[]
         } | undefined>()

         expectTypeOf<QueryResultItem<typeof schema, 'users', ['id', 'email', 'posts.*']>>().toEqualTypeOf<{
            id: number
            email: string
            posts: {
               id: number
               title: string
               author: number | null
               slug: string
               created_at: string | Date
               updated_at: string | Date
            }[]
         } | undefined>()

         expectTypeOf<QueryResultItem<typeof schema, 'posts', ['id', 'title', 'author']>>().toEqualTypeOf<{
            id: number
            title: string
            author: number | null
         } | undefined>()
      })

      it('should return the correct type for nested relations', () => {
         expectTypeOf<QueryResultItem<typeof schema, 'posts', ['id', 'title', 'author.email']>>().toEqualTypeOf<{
            id: number
            title: string
            author: { email: string } | null
         } | undefined>()
      })

      it('should return the correct type for nested relations with *', () => {
         expectTypeOf<QueryResultItem<typeof schema, 'posts', ['id', 'title', 'author.*']>>().toEqualTypeOf<{
            id: number
            title: string
            author: {
               id: number
               email: string
               status: string | null
               created_at: string | Date
               updated_at: string | Date
            } | null
         } | undefined>()
      })
   })
})

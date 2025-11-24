import type { Instance } from '../src'
import type { schema } from './schema'
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
            | '*.*'
            | '*.*.*'
            | '*.*.*.*'
            | '*.*.*.*.*'
            | 'id'
            | 'email'
            | 'status'
            | 'created_at'
            | 'updated_at'
            | 'posts.*'
            | 'posts.*.*'
            | 'posts.id'
            | 'posts.title'
            | 'posts.slug'
            | 'posts.author'
            | 'posts.created_at'
            | 'posts.updated_at'
            | 'posts.tags.*'
            | 'posts.tags.id'
            | 'posts.tags.name'
            | 'posts.tags.created_at'
            | 'posts.tags.updated_at'
            | 'roles.*'
            | 'roles.*.*'
            | 'roles.*.*.*'
            | 'roles.*.*.*.*'
            | 'roles.id'
            | 'roles.name'
            | 'roles.created_at'
            | 'roles.updated_at'
            | 'roles.policies.*'
            | 'roles.policies.*.*'
            | 'roles.policies.*.*.*'
            | 'roles.policies.id'
            | 'roles.policies.name'
            | 'roles.policies.created_at'
            | 'roles.policies.updated_at'
            | 'roles.policies.permissions.*'
            | 'roles.policies.permissions.*.*'
            | 'roles.policies.permissions.action'
            | 'roles.policies.permissions.collection'
            | 'roles.policies.permissions.collection.*'
            | 'roles.policies.permissions.collection.id'
            | 'roles.policies.permissions.collection.name'
            | 'roles.policies.permissions.collection.created_at'
            | 'roles.policies.permissions.collection.updated_at'
            | 'roles.policies.permissions.id'
            | 'roles.policies.permissions.name'
            | 'roles.policies.permissions.created_at'
            | 'roles.policies.permissions.updated_at'
            | 'profile'
            | 'profile.*'
            | 'profile.id'
            | 'profile.display_name'
            | 'profile.user'
            | 'profile.created_at'
            | 'profile.updated_at'
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

      it('should return the correct type for nested relations with wildcards', () => {
         expectTypeOf<QueryResultItem<typeof schema, 'users', ['*']>>().toEqualTypeOf<{
            id: number
            email: string
            status: string | null
            created_at: string | Date
            updated_at: string | Date
         } | undefined>()

         expectTypeOf<QueryResultItem<typeof schema, 'users', ['*.*']>>().toEqualTypeOf<{
            id: number
            email: string
            status: string | null
            created_at: string | Date
            updated_at: string | Date
            profile: {
               id: number
               display_name: string
               user: number | null
               created_at: string | Date
               updated_at: string | Date
            } | null
            roles: {
               id: number
               name: string
               created_at: string | Date
               updated_at: string | Date
            }[]
            posts: {
               id: number
               title: string
               slug: string
               author: number | null
               created_at: string | Date
               updated_at: string | Date
            }[]
         } | undefined>()

         expectTypeOf<QueryResultItem<typeof schema, 'users', ['*.*.*']>>().toEqualTypeOf<{
            id: number
            email: string
            status: string | null
            created_at: string | Date
            updated_at: string | Date
            profile: {
               id: number
               display_name: string
               user: number | null
               created_at: string | Date
               updated_at: string | Date
            } | null
            roles: {
               id: number
               name: string
               policies: {
                  id: number
                  name: string
                  created_at: string | Date
                  updated_at: string | Date
               }[]
               created_at: string | Date
               updated_at: string | Date
            }[]
            posts: {
               id: number
               title: string
               slug: string
               author: number | null
               tags: {
                  id: number
                  name: string
                  created_at: string | Date
                  updated_at: string | Date
               }[]
               created_at: string | Date
               updated_at: string | Date
            }[]
         } | undefined>()

         expectTypeOf<QueryResultItem<typeof schema, 'users', ['*.*.*.*']>>().toEqualTypeOf<{
            id: number
            email: string
            status: string | null
            created_at: string | Date
            updated_at: string | Date
            profile: {
               id: number
               display_name: string
               user: number | null
               created_at: string | Date
               updated_at: string | Date
            } | null
            roles: {
               id: number
               name: string
               policies: {
                  id: number
                  name: string
                  created_at: string | Date
                  updated_at: string | Date
                  permissions: {
                     id: number
                     name: string
                     action: ('read' | 'write' | 'delete')[] | null
                     collection: number | null
                     created_at: string | Date
                     updated_at: string | Date
                  }[]
               }[]
               created_at: string | Date
               updated_at: string | Date
            }[]
            posts: {
               id: number
               title: string
               slug: string
               author: number | null
               tags: {
                  id: number
                  name: string
                  created_at: string | Date
                  updated_at: string | Date
               }[]
               created_at: string | Date
               updated_at: string | Date
            }[]
         } | undefined>()

         expectTypeOf<QueryResultItem<typeof schema, 'users', ['*.*.*.*.*']>>().toEqualTypeOf<{
            id: number
            email: string
            status: string | null
            created_at: string | Date
            updated_at: string | Date
            profile: {
               id: number
               display_name: string
               user: number | null
               created_at: string | Date
               updated_at: string | Date
            } | null
            roles: {
               id: number
               name: string
               policies: {
                  id: number
                  name: string
                  created_at: string | Date
                  updated_at: string | Date
                  permissions: {
                     id: number
                     name: string
                     action: ('read' | 'write' | 'delete')[] | null
                     collection: {
                        id: number
                        name: string
                        created_at: string | Date
                        updated_at: string | Date
                     } | null
                     created_at: string | Date
                     updated_at: string | Date
                  }[]
               }[]
               created_at: string | Date
               updated_at: string | Date
            }[]
            posts: {
               id: number
               title: string
               slug: string
               author: number | null
               tags: {
                  id: number
                  name: string
                  created_at: string | Date
                  updated_at: string | Date
               }[]
               created_at: string | Date
               updated_at: string | Date
            }[]
         } | undefined>()
      })
   })
})

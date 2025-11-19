import type { Knex } from 'knex'
import type { FindQueryParams } from '../types/query'

type QueryOptionsSlice<TRecord extends Record<string, unknown>> = Pick<FindQueryParams<TRecord>, 'orderBy' | 'limit' | 'offset'>

export function applyQueryOptions<TRecord extends Record<string, unknown>>(qb: Knex.QueryBuilder<TRecord, TRecord[]>, options?: QueryOptionsSlice<TRecord>): Knex.QueryBuilder<TRecord, TRecord[]> {
   if (!options) {
      return qb
   }

   const { orderBy, limit, offset } = options

   if (orderBy?.length) {
      orderBy.forEach((entry) => {
         const direction = entry.startsWith('-') ? 'desc' : 'asc'
         const path = direction === 'desc' ? entry.slice(1) : entry
         const column = path.split('.')[0]
         if (!column) return
         qb.orderBy(column, direction)
      })
   }

   if (typeof limit === 'number') {
      qb.limit(limit)
   }

   if (typeof offset === 'number') {
      qb.offset(offset)
   }

   return qb
}

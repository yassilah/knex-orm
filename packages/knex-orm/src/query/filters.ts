import type { Knex } from 'knex'
import type { FieldFilter, FilterQuery } from '../types/query'
import type { Schema, TableNames } from '../types/schema'
import type { Operator } from '../utils/operators'
import { OPERATORS } from '../utils/operators'

export type { FieldFilter, FilterQuery } from '../types/query'

function applyFieldFilter(builder: Knex.QueryBuilder, column: string, value: FieldFilter) {
   if (typeof value !== 'object' || value === null || value instanceof Date) {
      return builder.where(column, value)
   }

   Object.entries(value).forEach(([operator, operand]) => {
      const operatorFn = OPERATORS[operator as Operator]

      if (!operatorFn) {
         throw new Error(`Invalid operator: ${operator}`)
      }

      operatorFn(builder, column, operand)
   })
}

export function applyFilters<S extends Schema, N extends TableNames<S>>(qb: Knex.QueryBuilder, query?: FilterQuery<S, N>): Knex.QueryBuilder {
   if (!query) return qb

   const $and = '$and' in query ? query.$and : undefined
   const $or = '$or' in query ? query.$or : undefined

   const fields = Object.fromEntries(Object.entries(query).filter(([k]) => k !== '$and' && k !== '$or')) as Record<string, FieldFilter>

   Object.entries(fields).forEach(([column, value]) => {
      if (value === undefined) return
      applyFieldFilter(qb, column, value)
   })

   if (Array.isArray($and) && $and.length) {
      qb.andWhere((builder) => {
         $and.forEach(nested => applyFilters(builder, nested))
      })
   }

   if (Array.isArray($or) && $or.length) {
      qb.andWhere((builder) => {
         builder.where((sub) => {
            $or.forEach(nested => sub.orWhere(inner => applyFilters(inner, nested)))
         })
      })
   }

   return qb
}

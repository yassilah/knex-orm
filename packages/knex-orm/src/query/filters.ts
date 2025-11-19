import type { Knex } from 'knex'
import type { FieldFilter, FilterOperator, FilterQuery, Primitive } from '../types/query'
import type { Schema, TableNames } from '../types/schema'

export type { FieldFilter, FilterOperator, FilterQuery } from '../types/query'

function applyFieldFilter(qb: Knex.QueryBuilder, column: string, value: FieldFilter) {
   const builder = qb as any
   if (
      value === null
      || value === undefined
      || typeof value === 'string'
      || typeof value === 'number'
      || typeof value === 'boolean'
      || value instanceof Date
   ) {
      builder.where(column, value as Primitive)
      return
   }

   Object.entries(value).forEach(([operator, operand]) => {
      switch (operator as FilterOperator) {
         case '$eq':
            if (operand === null) {
               builder.whereNull(column)
            }
            else {
               builder.where(column, operand as Primitive)
            }
            break
         case '$ne':
            if (operand === null) {
               builder.whereNotNull(column)
            }
            else {
               builder.whereNot(column, operand as Primitive)
            }
            break
         case '$gt':
            builder.where(column, '>', operand as Primitive)
            break
         case '$gte':
            builder.where(column, '>=', operand as Primitive)
            break
         case '$lt':
            builder.where(column, '<', operand as Primitive)
            break
         case '$lte':
            builder.where(column, '<=', operand as Primitive)
            break
         case '$in':
            builder.whereIn(column, operand as Primitive[])
            break
         case '$nin':
            builder.whereNotIn(column, operand as Primitive[])
            break
         case '$like':
            builder.where(column, 'like', operand as Primitive)
            break
         default:
            throw new Error(`Unsupported filter operator: ${operator}`)
      }
   })
}

export function applyFilters<S extends Schema, N extends TableNames<S>>(qb: Knex.QueryBuilder, query?: FilterQuery<S, N>): Knex.QueryBuilder {
   if (!query) {
      return qb
   }

   // Extract $and and $or, then get remaining fields
   const $and = '$and' in query ? query.$and : undefined
   const $or = '$or' in query ? query.$or : undefined
   const fields = Object.fromEntries(
      Object.entries(query).filter(([k]) => k !== '$and' && k !== '$or')
   ) as Record<string, FieldFilter>

   Object.entries(fields).forEach(([column, value]) => {
      if (value === undefined) return
      applyFieldFilter(qb, column, value)
   })

   if (Array.isArray($and) && $and.length) {
      qb.andWhere((builder) => {
         $and.forEach((nested: FilterQuery<S, N>) => applyFilters<S, N>(builder, nested))
      })
   }

   if (Array.isArray($or) && $or.length) {
      qb.andWhere((builder) => {
         builder.where((sub) => {
            $or.forEach((nested: FilterQuery<S, N>) => {
               sub.orWhere(inner => applyFilters<S, N>(inner, nested))
            })
         })
      })
   }

   return qb
}

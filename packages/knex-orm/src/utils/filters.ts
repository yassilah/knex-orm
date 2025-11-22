import type { Knex } from 'knex'
import type { Operator } from './operators'
import type { FieldFilter, FilterQuery } from '@/types/query'
import type { RelationDefinition } from '@/types/relations'
import type { Schema, TableNames } from '@/types/schema'
import { hash } from 'ohash'
import { getCollection, getColumns, getPrimaryKey, getRelations } from './collections'
import { OPERATORS } from './operators'
import { isBelongsTo, isHasMany, isHasOne, isManyToMany } from './relations'

export type { FieldFilter, FilterQuery } from '@/types/query'

/**
 * Apply a field filter to a query builder.
 */
function applyFieldFilter(builder: Knex.QueryBuilder, column: string, value: FieldFilter) {
   if (typeof value !== 'object' || value === null || value instanceof Date || Array.isArray(value)) {
      if (Array.isArray(value)) {
         return builder.whereIn(column, value)
      }
      else {
         return builder.where(column, value)
      }
   }

   for (const [operator, operand] of Object.entries(value)) {
      const operatorFn = OPERATORS[operator as Operator]
      if (!operatorFn) {
         throw new Error(`Invalid operator: ${operator}`)
      }
      operatorFn(builder, column, operand as never)
   }
}

/**
 * Check if a value is a simple FieldFilter (only operators) vs a FilterQuery (has field names).
 */
function isSimpleFieldFilter(value: unknown): boolean {
   if (typeof value !== 'object' || value === null || value instanceof Date || Array.isArray(value)) {
      return true
   }

   const keys = Object.keys(value)

   if (keys.includes('$and') || keys.includes('$or')) {
      return false
   }

   return keys.every(key => key in OPERATORS)
}

function applyRelationFilter<S extends Schema, N extends TableNames<S>>(
   qb: Knex.QueryBuilder,
   knex: Knex,
   schema: S,
   baseTable: N,
   relationName: string,
   nestedFilter: FilterQuery<S, any> | FieldFilter,
   baseTableAlias?: string,
): void {
   const collection = getCollection(schema, baseTable)
   const relations = getRelations(collection, { includeBelongsTo: true })
   const relation = relations[relationName]

   if (!relation) {
      throw new Error(`Relation "${relationName}" not found on table "${baseTable}"`)
   }

   const tableTable = relation.table
   const tableCollection = schema[tableTable]
   if (!tableCollection) {
      throw new Error(`table table "${tableTable}" not found in schema`)
   }

   const basePk = getPrimaryKey(collection)
   const tablePk = getPrimaryKey(tableCollection)
   const relationAlias = hash({ filter: relationName })
   const baseRef = baseTableAlias || baseTable

   // For belongs-to relations with a simple FieldFilter, filter by the foreign key column directly
   if (isBelongsTo(relation) && isSimpleFieldFilter(nestedFilter)) {
      const columnName = baseTableAlias ? `${baseTableAlias}.${relationName}` : relationName
      applyFieldFilter(qb, columnName, nestedFilter as FieldFilter)
      return
   }

   // For other cases, join the related table and apply filters
   if (isHasOne(relation) || isHasMany(relation)) {
      qb.innerJoin(
         `${tableTable} as ${relationAlias}`,
         `${relationAlias}.${relation.foreignKey}`,
         `${baseRef}.${basePk}`,
      )
      // For has-one/has-many, if it's a simple FieldFilter, treat it as filtering by the primary key
      if (isSimpleFieldFilter(nestedFilter)) {
         const columnName = `${relationAlias}.${tablePk}`
         applyFieldFilter(qb, columnName, nestedFilter as FieldFilter)
      }
      else {
         applyFilters(qb, knex, schema, tableTable, nestedFilter as FilterQuery<S, any>, relationAlias)
      }
   }
   else if (isManyToMany(relation)) {
      const { through } = relation

      if (!through) {
         throw new Error(`Many-to-many relation "${relationName}" missing through table`)
      }

      const junctionAlias = hash({ junction: relationAlias })

      qb.innerJoin(
         `${through.table} as ${junctionAlias}`,
         `${junctionAlias}.${through.sourceFk}`,
         `${baseRef}.${basePk}`,
      )
         .innerJoin(
            `${tableTable} as ${relationAlias}`,
            `${relationAlias}.${tablePk}`,
            `${junctionAlias}.${through.tableFk}`,
         )

      // For many-to-many, if it's a simple FieldFilter, treat it as filtering by the primary key
      if (isSimpleFieldFilter(nestedFilter)) {
         const columnName = `${relationAlias}.${tablePk}`
         applyFieldFilter(qb, columnName, nestedFilter as FieldFilter)
      }
      else {
         applyFilters(qb, knex, schema, tableTable, nestedFilter as FilterQuery<S, any>, relationAlias)
      }
   }
   else {
      // belongs-to with FilterQuery - join and filter
      qb.innerJoin(
         `${tableTable} as ${relationAlias}`,
         `${relationAlias}.${relation.foreignKey}`,
         `${baseRef}.${basePk}`,
      )
      applyFilters(qb, knex, schema, tableTable, nestedFilter as FilterQuery<S, any>, relationAlias)
   }
}

/**
 * Apply filters to a query builder.
 */
export function applyFilters<S extends Schema, N extends TableNames<S>>(
   qb: Knex.QueryBuilder,
   knex: Knex,
   schema: S,
   tableName: N,
   query?: FilterQuery<S, N>,
   tableAlias?: string,
): Knex.QueryBuilder {
   if (!query) return qb

   const $and = '$and' in query ? query.$and : undefined
   const $or = '$or' in query ? query.$or : undefined

   const collection = getCollection(schema, tableName)
   const columns = getColumns(schema, collection, { includeBelongsTo: true })
   const relations = getRelations(collection, { includeBelongsTo: true })

   const fields = Object.fromEntries(
      Object.entries(query).filter(([k]) => k !== '$and' && k !== '$or'),
   ) as unknown as Record<string, FieldFilter | FilterQuery<S, any>>

   for (const [key, value] of Object.entries(fields)) {
      if (value === undefined) continue

      if (isRelationFilter(relations, key, value)) {
         applyRelationFilter(qb, knex, schema, tableName, key, value, tableAlias)
      }
      else if (columns[key]) {
         const columnName = tableAlias ? `${tableAlias}.${key}` : key
         applyFieldFilter(qb, columnName, value)
      }
      else {
         throw new Error(`Unknown field "${key}" in filter for table "${tableName}"`)
      }
   }

   if (Array.isArray($and) && $and.length > 0) {
      qb.andWhere((builder) => {
         for (const nested of $and) {
            applyFilters(builder, knex, schema, tableName, nested, tableAlias)
         }
      })
   }

   if (Array.isArray($or) && $or.length > 0) {
      qb.andWhere((builder) => {
         builder.where((sub) => {
            for (const nested of $or) {
               sub.orWhere(inner => applyFilters(inner, knex, schema, tableName, nested, tableAlias))
            }
         })
      })
   }

   return qb
}

/**
 * Check if a value is a relation filter (either FieldFilter or FilterQuery for a relation).
 * Also handles direct values (e.g., `author: 123` instead of `author: { $eq: 123 }`).
 */
function isRelationFilter<S extends Schema, N extends TableNames<S>>(relations: Record<string, RelationDefinition>, key: string, value: unknown): value is FilterQuery<S, N> | FieldFilter {
   if (!relations[key]) {
      return false
   }

   // If it's a direct value (not an object), it's a relation filter that will be normalized to { $eq: value }
   if (typeof value !== 'object' || value === null || value instanceof Date || Array.isArray(value)) {
      return true
   }

   // If it's a belongs-to relation, it can be either a FieldFilter or FilterQuery
   if (isBelongsTo(relations[key])) {
      return true
   }

   // For other relations, it should be a FilterQuery (object with field names or operators)
   // But not a plain operator name string
   return !Object.keys(OPERATORS).includes(String(value))
}

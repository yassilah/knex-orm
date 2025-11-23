import type { Knex } from 'knex'
import type { Operator } from './operators'
import type { FieldFilter, FilterQuery } from '@/types/query'
import type { Schema, TableNames } from '@/types/schema'
import { hash } from 'ohash'
import { getCollection, getColumns, getPrimaryKey, getRelations } from './collections'
import { OPERATORS } from './operators'
import { isBelongsTo, isHasMany, isHasOne, isManyToMany } from './relations'

export type { FieldFilter, FilterQuery } from '@/types/query'

/**
 * Check if value is a primitive type (not an object filter).
 */
function isPrimitive(value: unknown): value is string | number | boolean | Date | null {
   return typeof value !== 'object' || value === null || value instanceof Date
}

/**
 * Apply a field filter to the query builder.
 */
function applyFieldFilter(builder: Knex.QueryBuilder, column: string, value: FieldFilter) {
   if (isPrimitive(value)) return builder.where(column, value)
   if (Array.isArray(value)) return builder.whereIn(column, value)

   for (const [operator, operand] of Object.entries(value)) {
      const operatorFn = OPERATORS[operator as Operator]
      if (!operatorFn) throw new Error(`Invalid operator: ${operator}`)
      operatorFn(builder, column, operand as never)
   }
}

/**
 * Check if value is a simple field filter (primitives or operators only, not nested queries).
 */
function isSimpleFieldFilter(value: unknown): boolean {
   if (isPrimitive(value) || Array.isArray(value)) return true
   if (typeof value !== 'object') return false

   if ('$and' in value || '$or' in value) return false

   for (const key in value) {
      if (!(key in OPERATORS)) return false
   }
   return true
}

/** Apply relation filter (join and filter related table) */
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
   if (!relation) throw new Error(`Relation "${relationName}" not found on table "${baseTable}"`)

   const relatedTable = relation.table
   const relatedCollection = schema[relatedTable]
   if (!relatedCollection) throw new Error(`Related table "${relatedTable}" not found in schema`)

   const basePk = getPrimaryKey(collection)
   const relatedPk = getPrimaryKey(relatedCollection)
   const relationAlias = hash({ filter: relationName })
   const baseRef = baseTableAlias || baseTable
   const isSimple = isSimpleFieldFilter(nestedFilter)

   // Belongs-to: Can filter by FK directly if simple, otherwise join
   if (isBelongsTo(relation)) {
      if (isSimple) {
         const columnName = baseTableAlias ? `${baseTableAlias}.${relationName}` : relationName
         applyFieldFilter(qb, columnName, nestedFilter as FieldFilter)
         return
      }
      // Complex filter: join and apply
      qb.innerJoin(`${relatedTable} as ${relationAlias}`, `${relationAlias}.${relation.foreignKey}`, `${baseRef}.${basePk}`)
      applyFilters(qb, knex, schema, relatedTable, nestedFilter as FilterQuery<S, any>, relationAlias)
      return
   }

   // Has-one/Has-many: Join on FK and filter
   if (isHasOne(relation) || isHasMany(relation)) {
      qb.innerJoin(`${relatedTable} as ${relationAlias}`, `${relationAlias}.${relation.foreignKey}`, `${baseRef}.${basePk}`)
      if (isSimple) {
         applyFieldFilter(qb, `${relationAlias}.${relatedPk}`, nestedFilter as FieldFilter)
      }
      else {
         applyFilters(qb, knex, schema, relatedTable, nestedFilter as FilterQuery<S, any>, relationAlias)
      }
      return
   }

   // Many-to-many: Join through junction table
   if (isManyToMany(relation)) {
      const { through } = relation
      if (!through) throw new Error(`Many-to-many relation "${relationName}" missing through table`)

      const junctionAlias = hash({ junction: relationAlias })
      qb.innerJoin(`${through.table} as ${junctionAlias}`, `${junctionAlias}.${through.sourceFk}`, `${baseRef}.${basePk}`)
         .innerJoin(`${relatedTable} as ${relationAlias}`, `${relationAlias}.${relatedPk}`, `${junctionAlias}.${through.tableFk}`)

      if (isSimple) {
         applyFieldFilter(qb, `${relationAlias}.${relatedPk}`, nestedFilter as FieldFilter)
      }
      else {
         applyFilters(qb, knex, schema, relatedTable, nestedFilter as FilterQuery<S, any>, relationAlias)
      }
   }
}

/** Apply filters to query builder */
export function applyFilters<S extends Schema, N extends TableNames<S>>(
   qb: Knex.QueryBuilder,
   knex: Knex,
   schema: S,
   tableName: N,
   query?: FilterQuery<S, N>,
   tableAlias?: string,
): Knex.QueryBuilder {
   if (!query) return qb

   const collection = getCollection(schema, tableName)
   const columns = getColumns(schema, collection, { includeBelongsTo: true })
   const relations = getRelations(collection, { includeBelongsTo: true })

   // Process regular fields (skip $and/$or)
   for (const [key, value] of Object.entries(query)) {
      if (key === '$and' || key === '$or' || value === undefined) continue

      // Check if it's a relation first
      if (relations[key]) {
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

   // Handle $and
   if ('$and' in query && Array.isArray(query.$and) && query.$and.length > 0) {
      qb.andWhere((builder) => {
         const $and = query.$and as FilterQuery<S, N>[]
         for (const nested of $and) {
            applyFilters(builder, knex, schema, tableName, nested, tableAlias)
         }
      })
   }

   // Handle $or
   if ('$or' in query && Array.isArray(query.$or) && query.$or.length > 0) {
      qb.andWhere((builder) => {
         builder.where((sub) => {
            const $or = query.$or as FilterQuery<S, N>[]
            for (const nested of $or) {
               sub.orWhere(inner => applyFilters(inner, knex, schema, tableName, nested, tableAlias))
            }
         })
      })
   }

   return qb
}

import type { Knex } from 'knex'
import type { FieldFilter, FilterQuery } from '../types/query'
import type { RelationDefinition, Schema, TableNames } from '../types/schema'
import type { Operator } from './operators'
import { hash } from 'ohash'
import { getCollection, getColumns, getPrimaryKey, getRelations } from './collections'
import { OPERATORS } from './operators'
import { isHasMany, isHasOne, isManyToMany } from './relations'

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

function applyRelationFilter<S extends Schema, N extends TableNames<S>>(
   qb: Knex.QueryBuilder,
   knex: Knex,
   schema: S,
   baseTable: N,
   relationName: string,
   nestedFilter: FilterQuery<S, any>,
   baseTableAlias?: string,
): void {
   const collection = getCollection(schema, baseTable)
   const relations = getRelations(collection)
   const relation = relations[relationName]

   if (!relation) {
      throw new Error(`Relation "${relationName}" not found on table "${baseTable}"`)
   }

   const targetTable = relation.target
   const targetCollection = schema[targetTable]
   if (!targetCollection) {
      throw new Error(`Target table "${targetTable}" not found in schema`)
   }

   const basePk = getPrimaryKey(collection)
   const targetPk = getPrimaryKey(targetCollection)
   const relationAlias = hash({ filter: relationName })
   const baseRef = baseTableAlias || baseTable

   if (isHasOne(relation) || isHasMany(relation)) {
      qb.innerJoin(
         `${targetTable} as ${relationAlias}`,
         `${relationAlias}.${relation.foreignKey}`,
         `${baseRef}.${basePk}`,
      )
      applyFilters(qb, knex, schema, targetTable, nestedFilter, relationAlias)
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
            `${targetTable} as ${relationAlias}`,
            `${relationAlias}.${targetPk}`,
            `${junctionAlias}.${through.targetFk}`,
         )

      applyFilters(qb, knex, schema, targetTable, nestedFilter, relationAlias)
   }
   else {
      throw new Error(`Unsupported relation type for filtering: ${relation.type}`)
   }
}

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
   const columns = getColumns(schema, collection, {
      includeBelongsTo: true,
   })
   const relations = getRelations(collection, {
      includeBelongsTo: false,
   })

   const fields = Object.fromEntries(Object.entries(query).filter(([k]) => k !== '$and' && k !== '$or')) as Record<string, FieldFilter | FilterQuery<S, any>>

   Object.entries(fields).forEach(([key, value]) => {
      if (value === undefined) return

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
   })

   if (Array.isArray($and) && $and.length) {
      qb.andWhere((builder) => {
         $and.forEach(nested => applyFilters(builder, knex, schema, tableName, nested, tableAlias))
      })
   }

   if (Array.isArray($or) && $or.length) {
      qb.andWhere((builder) => {
         builder.where((sub) => {
            $or.forEach(nested => sub.orWhere(inner => applyFilters(inner, knex, schema, tableName, nested, tableAlias)))
         })
      })
   }

   return qb
}

/**
 * Check if a value is a relation filter.
 */
function isRelationFilter<S extends Schema, N extends TableNames<S>>(relations: Record<string, RelationDefinition>, key: string, value: unknown): value is FilterQuery<S, N> {
   return relations[key] && !Object.keys(OPERATORS).includes(String(value))
}

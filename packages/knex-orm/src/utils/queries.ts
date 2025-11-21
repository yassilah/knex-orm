import type { Knex } from 'knex'
import type { MutationOptions } from '@/types/orm'
import type { ColumnSelection, ColumnSelectionResult, FilterQuery, FindQueryParams } from '@/types/query'
import type { CollectionDefinition, Schema, TableNames, TablePrimaryKeyValue, TableRecord, TableRecordInput } from '@/types/schema'
import { getCollection, getColumns, getPrimaryKey, getRelations } from './collections'
import { applyFilters } from './filters'
import { clientSupportsReturning } from './misc'
import { handleBelongsToRelations, handleChildRelationsOnCreate, handleChildRelationsOnUpdate, partitionRecord } from './mutations'
import { isHasMany, isHasOne, isManyToMany } from './relations'
import { runInTransaction } from './transactions'
import { attachRowNormalizer, transformInputValue, transformOutputColumnValue, transformOutputValue } from './values'

type QueryOptionsSlice<S extends Schema, N extends TableNames<S>> = Pick<FindQueryParams<S, N>, 'orderBy' | 'limit' | 'offset'>

/**
 * Apply query options (orderBy, limit, offset) to a query builder.
 */
function applyQueryOptions<S extends Schema, N extends TableNames<S>, TRecord extends Record<string, unknown>>(qb: Knex.QueryBuilder<TRecord, TRecord[]>, options?: QueryOptionsSlice<S, N>): Knex.QueryBuilder<TRecord, TRecord[]> {
   if (!options) return qb

   const { orderBy, limit, offset } = options

   if (orderBy?.length) {
      for (const entry of orderBy) {
         const direction = entry.startsWith('-') ? 'desc' : 'asc'
         const column = (direction === 'desc' ? entry.slice(1) : entry).split('.')[0]
         if (column) qb.orderBy(column, direction)
      }
   }

   if (typeof limit === 'number') qb.limit(limit)
   if (typeof offset === 'number') qb.offset(offset)

   return qb
}

/**
 * Get a query builder for a table, optionally within a transaction.
 */
function builder(knex: Knex, tableName: string, trx?: Knex.Transaction) {
   return (trx ?? knex)(tableName)
}

/**
 * Extract base columns (non-nested) from a column selection array.
 */
function extractSelectableColumns(columns?: readonly string[]) {
   if (!columns?.length) return undefined
   const selectable = Array.from(new Set(columns.filter(col => col && !col.includes('.'))))
   return selectable.length ? selectable : undefined
}

/**
 * Check if any columns contain nested relation paths.
 */
function hasNestedColumns(columns?: readonly string[]) {
   return columns?.some(col => col?.includes('.')) ?? false
}

interface RelationTree {
   fields: Set<string>
   nested: Record<string, RelationTree>
}

/**
 * Parse column paths into a relation tree structure and separate base columns.
 */
function parseColumnPaths(columns: readonly string[]): { relationTree: Record<string, RelationTree>, baseColumns: string[] } {
   const relationTree: Record<string, RelationTree> = {}
   const baseColumns = new Set<string>()

   for (const column of columns) {
      if (!column) continue

      if (column.includes('.')) {
         const parts = column.split('.')
         let current = relationTree

         for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i]
            if (!current[part]) {
               current[part] = { fields: new Set(), nested: {} }
            }
            if (i === parts.length - 2) {
               current[part].fields.add(parts[parts.length - 1])
            }
            current = current[part].nested
         }
      }
      else {
         baseColumns.add(column)
      }
   }

   return { relationTree, baseColumns: Array.from(baseColumns) }
}

/**
 * Build JOIN clauses and SELECT statements for relations recursively.
 */
function buildJoinsAndSelects<S extends Schema>(
   qb: Knex.QueryBuilder,
   schema: S,
   baseTable: string,
   baseAlias: string,
   relationTree: Record<string, RelationTree>,
   prefix: string,
   selects: string[],
): void {
   const collection = getCollection(schema, baseTable)
   const relations = getRelations(collection)
   const basePk = getPrimaryKey(collection)

   for (const [relationName, tree] of Object.entries(relationTree)) {
      const relation = relations[relationName]
      if (!relation) continue

      const targetTable = relation.target
      const targetAlias = `${prefix}_${relationName}`
      const targetCollection = schema[targetTable]
      if (!targetCollection) continue

      const targetPk = getPrimaryKey(targetCollection)

      if (isHasOne(relation) || isHasMany(relation)) {
         qb.leftJoin(`${targetTable} as ${targetAlias}`, `${targetAlias}.${relation.foreignKey}`, `${baseAlias}.${basePk}`)
      }
      else if (isManyToMany(relation)) {
         const { through } = relation
         if (!through) continue
         const junctionAlias = `${targetAlias}_junction`
         qb.leftJoin(`${through.table} as ${junctionAlias}`, `${junctionAlias}.${through.sourceFk}`, `${baseAlias}.${basePk}`)
         qb.leftJoin(`${targetTable} as ${targetAlias}`, `${targetAlias}.${targetPk}`, `${junctionAlias}.${through.targetFk}`)
      }

      selects.push(`${targetAlias}.${targetPk} as ${targetAlias}_${targetPk}`)

      for (const field of tree.fields) {
         selects.push(`${targetAlias}.${field} as ${targetAlias}_${field}`)
      }

      if (Object.keys(tree.nested).length > 0) {
         buildJoinsAndSelects(qb, schema, targetTable, targetAlias, tree.nested, targetAlias, selects)
      }
   }
}

/**
 * Reconstruct nested objects from flat joined query results.
 */
function reconstructNestedObjects<S extends Schema>(
   schema: S,
   baseTable: TableNames<S>,
   flatRows: Record<string, unknown>[],
   relationTree: Record<string, RelationTree>,
   baseAlias: string,
   clientName: string,
): Record<string, unknown>[] {
   if (!flatRows.length) return []

   const collection = getCollection(schema, baseTable)
   const columns = getColumns(schema, collection, { includeBelongsTo: true })
   const relations = getRelations(collection)
   const basePk = getPrimaryKey(collection)
   const basePkAlias = `${baseAlias}_${basePk}`

   const grouped = new Map<string | number, Record<string, unknown>[]>()
   for (const row of flatRows) {
      const pk = row[basePkAlias]
      if (pk != null && (typeof pk === 'string' || typeof pk === 'number')) {
         if (!grouped.has(pk)) grouped.set(pk, [])
         grouped.get(pk)!.push(row)
      }
   }

   const results: Record<string, unknown>[] = []

   for (const [, rows] of grouped.entries()) {
      const baseRow = rows[0]
      const result: Record<string, unknown> = {}

      for (const key of Object.keys(baseRow)) {
         if (key.startsWith(`${baseAlias}_`) && !key.includes('_junction')) {
            const field = key.replace(`${baseAlias}_`, '')
            const definition = columns[field]
            if (definition) {
               result[field] = transformOutputColumnValue(clientName, definition.type, baseRow[key])
            }
         }
      }

      for (const [relationName, tree] of Object.entries(relationTree)) {
         const relation = relations[relationName]
         if (!relation) continue

         const targetAlias = `${baseAlias}_${relationName}`
         const targetCollection = schema[relation.target]
         if (!targetCollection) continue

         const targetPk = getPrimaryKey(targetCollection)
         const targetPkAlias = `${targetAlias}_${targetPk}`
         const targetColumns = getColumns(schema, targetCollection, { includeBelongsTo: true })

         if (isHasOne(relation)) {
            const relationRow = rows.find(r => r[targetPkAlias] != null)
            if (relationRow) {
               const relationObj = extractRelationObject(relationRow, tree, targetAlias, targetColumns, clientName)
               if (Object.keys(tree.nested).length > 0) {
                  const nested = reconstructNestedObjects(schema, relation.target, [relationRow], tree.nested, targetAlias, clientName)
                  if (nested.length > 0) Object.assign(relationObj, nested[0])
               }
               if (Object.keys(relationObj).length > 0) {
                  result[relationName] = relationObj
               }
            }
         }
         else if (isHasMany(relation) || isManyToMany(relation)) {
            const relationObjects = new Map<string | number, Record<string, unknown>>()
            for (const row of rows) {
               const relationPk = row[targetPkAlias]
               if (relationPk != null && (typeof relationPk === 'string' || typeof relationPk === 'number')) {
                  if (!relationObjects.has(relationPk)) {
                     relationObjects.set(relationPk, extractRelationObject(row, tree, targetAlias, targetColumns, clientName))
                  }
                  if (Object.keys(tree.nested).length > 0) {
                     const nested = reconstructNestedObjects(schema, relation.target, [row], tree.nested, targetAlias, clientName)
                     if (nested.length > 0) Object.assign(relationObjects.get(relationPk)!, nested[0])
                  }
               }
            }
            result[relationName] = Array.from(relationObjects.values())
         }
      }

      results.push(result)
   }

   return results
}

/**
 * Extract relation object fields from a flat row.
 */
function extractRelationObject(
   row: Record<string, unknown>,
   tree: RelationTree,
   targetAlias: string,
   targetColumns: Record<string, any>,
   clientName: string,
): Record<string, unknown> {
   const relationObj: Record<string, unknown> = {}
   for (const field of tree.fields) {
      const alias = `${targetAlias}_${field}`
      if (row[alias] !== undefined) {
         const definition = targetColumns[field]
         if (definition) {
            relationObj[field] = transformOutputColumnValue(clientName, definition.type, row[alias])
         }
      }
   }
   return relationObj
}

type FindParams<S extends Schema, N extends TableNames<S>, Columns extends ColumnSelection<S, N> | undefined = undefined,
> = FindQueryParams<S, N, Columns> & { trx?: Knex.Transaction }

/**
 * Insert a record into a table and return the inserted record.
 */
async function insertRecord(knex: Knex, tableName: string, collection: CollectionDefinition, data: Record<string, unknown>, trx: Knex.Transaction) {
   if (clientSupportsReturning(knex)) {
      const [created] = await builder(knex, tableName, trx).insert(data, '*')
      return created
   }

   const [insertId] = await builder(knex, tableName, trx).insert(data)
   const primaryKey = getPrimaryKey(collection)
   const pkValue = data[primaryKey] ?? insertId

   if (pkValue === undefined) {
      throw new Error(`Unable to determine primary key for ${tableName} insert`)
   }

   const inserted = await builder(knex, tableName, trx).where(primaryKey, pkValue).first()
   if (!inserted) {
      throw new Error('Failed to fetch inserted record')
   }

   return inserted
}
/**
 * Find records in a table.
 */
export function find<
   S extends Schema,
   N extends TableNames<S>,
   Columns extends ColumnSelection<S, N> | undefined = undefined,
>(
   knex: Knex,
   schema: S,
   tableName: N,
   params?: FindParams<S, N, Columns>,
) {
   const { trx, ...rest } = params ?? {}
   const { columns, where, orderBy, limit, offset } = rest

   if (hasNestedColumns(columns)) {
      return findWithRelations(knex, schema, tableName, params as FindParams<S, N, Columns>)
   }

   type Selection = ColumnSelectionResult<TableRecord<S, N>, Columns>
   const qb = builder(knex, tableName, trx) as Knex.QueryBuilder<Selection, Selection[]>

   const selectableColumns = extractSelectableColumns(columns)
   qb.select(selectableColumns || '*')
   attachRowNormalizer(qb, schema, tableName)
   applyFilters(qb, knex, schema, tableName, where)
   applyQueryOptions(qb, { orderBy, limit, offset })

   return qb
}

/**
 * Find records with relation loading for nested column selections.
 */
async function findWithRelations<
   S extends Schema,
   N extends TableNames<S>,
   Columns extends ColumnSelection<S, N> | undefined = undefined,
>(
   knex: Knex,
   schema: S,
   tableName: N,
   params?: FindParams<S, N, Columns>,
): Promise<ColumnSelectionResult<TableRecord<S, N>, Columns>[]> {
   const { trx, ...rest } = params ?? {}
   const { columns, where, orderBy, limit, offset } = rest

   const { relationTree, baseColumns } = parseColumnPaths(columns ?? [])
   const baseAlias = tableName
   const qb = builder(knex, `${tableName} as ${baseAlias}`, trx)

   const selects: string[] = []
   const collection = getCollection(schema, tableName)
   const basePk = getPrimaryKey(collection)
   const allColumns = Object.keys(getColumns(schema, collection, { includeBelongsTo: true }))
   const columnsToSelect = baseColumns.length > 0 ? baseColumns : allColumns

   for (const col of columnsToSelect) {
      selects.push(`${baseAlias}.${col} as ${baseAlias}_${col}`)
   }

   if (!baseColumns.includes(basePk)) {
      selects.push(`${baseAlias}.${basePk} as ${baseAlias}_${basePk}`)
   }

   if (Object.keys(relationTree).length > 0) {
      buildJoinsAndSelects(qb, schema, tableName, baseAlias, relationTree, baseAlias, selects)
   }

   qb.select(selects)
   applyFilters(qb, knex, schema, tableName, where)
   applyQueryOptions(qb, { orderBy, limit, offset })

   const flatRows = await qb

   if (Object.keys(relationTree).length > 0) {
      return reconstructNestedObjects(schema, tableName, flatRows, relationTree, baseAlias, knex.client.config.client) as ColumnSelectionResult<TableRecord<S, N>, Columns>[]
   }

   const results: Record<string, unknown>[] = []
   for (const row of flatRows) {
      const result: Record<string, unknown> = {}
      for (const key of Object.keys(row)) {
         if (key.startsWith(`${baseAlias}_`)) {
            result[key.replace(`${baseAlias}_`, '')] = row[key]
         }
      }
      results.push(result)
   }

   return results as ColumnSelectionResult<TableRecord<S, N>, Columns>[]
}

/**
 * Check if a value is a params object (not a primary key value).
 */
function isParamsObject(value: unknown): value is Record<string, unknown> {
   return value != null && typeof value === 'object' && !Array.isArray(value)
      && ('where' in value || 'columns' in value || 'orderBy' in value || 'offset' in value || 'trx' in value)
}

/**
 * Find one record by primary key or filter query.
 */
export function findOne<
   S extends Schema,
   N extends TableNames<S>,
   Columns extends ColumnSelection<S, N> | undefined = undefined,
>(
   knex: Knex,
   schema: S,
   tableName: N,
   primaryKeyOrParams: TablePrimaryKeyValue<S, N> | FindParams<S, N, Columns>,
   params?: Omit<FindParams<S, N, Columns>, 'where' | 'limit'>,
) {
   const collection = schema[tableName]
   const primaryKeyColumn = getPrimaryKey(collection)

   if (isParamsObject(primaryKeyOrParams)) {
      const result = find<S, N, Columns>(knex, schema, tableName, { ...primaryKeyOrParams, limit: 1 })
      if (result instanceof Promise) {
         return result.then(records => records[0])
      }
      return result.first()
   }

   const primaryKey = primaryKeyOrParams as Knex.Value
   const queryParams = { ...params, limit: 1 }
   const result = find<S, N, Columns>(knex, schema, tableName, queryParams)

   if ('where' in result) {
      return result.where(primaryKeyColumn, primaryKey).first()
   }

   return result.then(records => records[0])
}

/**
 * Create records in a table.
 */
export async function create<S extends Schema, N extends TableNames<S>>(
   knex: Knex,
   schema: S,
   tableName: N,
   records: TableRecordInput<S, N>[],
   options?: MutationOptions,
) {
   if (!records.length) return []

   const collection = schema[tableName]
   const clientName = knex.client.config.client?.toString()

   return runInTransaction(knex, options, async (trx) => {
      const created: TableRecord<S, N>[] = []

      for (const record of records) {
         const { scalar, relations } = partitionRecord(collection, record)

         await handleBelongsToRelations(knex, schema, relations, scalar, { trx })
         transformInputValue(clientName, schema, tableName, scalar)

         const inserted = await insertRecord(knex, tableName, collection, scalar, trx)
         transformOutputValue(schema, tableName, inserted, clientName)

         await handleChildRelationsOnCreate(knex, schema, relations, inserted, { trx }, collection)
         created.push(inserted)
      }

      return created
   })
}

/**
 * Create one record in a table.
 */
export function createOne<S extends Schema, N extends TableNames<S>>(
   knex: Knex,
   schema: S,
   tableName: N,
   record: TableRecordInput<S, N>,
   options?: MutationOptions,
) {
   return runInTransaction<TableRecord<S, N>>(knex, options, async (trx) => {
      const created = await create(knex, schema, tableName, [record], { trx })
      return created[0]
   })
}

/**
 * Update records in a table.
 */
export function update<S extends Schema, N extends TableNames<S>>(
   knex: Knex,
   schema: S,
   tableName: N,
   filter: FilterQuery<S, N>,
   patch: TableRecordInput<S, N>,
   options?: MutationOptions,
) {
   const collection = schema[tableName]
   const primaryKey = getPrimaryKey(collection)
   const clientName = knex.client.config.client?.toString()

   return runInTransaction(knex, options, async (trx) => {
      const targets = await builder(knex, tableName, trx)
         .modify(qb => applyFilters(qb, knex, schema, tableName, filter))
         .select(primaryKey) as Record<string, unknown>[]

      if (!targets.length) return 0

      const ids = targets
         .map(row => row[primaryKey])
         .filter((value): value is string | number => value !== undefined)

      const { scalar, relations } = partitionRecord(collection, patch)

      await handleBelongsToRelations(knex, schema, relations, scalar, { trx })
      transformInputValue(clientName, schema, tableName, scalar)

      if (Object.keys(scalar).length) {
         const qb = builder(knex, tableName, trx).modify(qb => applyFilters(qb, knex, schema, tableName, filter))
         if (clientSupportsReturning(knex)) {
            await qb.update(scalar, '*')
         }
         else {
            await qb.update(scalar)
         }
      }

      const refreshed = ids.length > 0
         ? ((await builder(knex, tableName, trx).whereIn(primaryKey, ids).select('*')) as Record<string, unknown>[])
         : []

      refreshed.forEach(row => transformOutputValue(schema, tableName, row, clientName))

      for (const record of refreshed) {
         await handleChildRelationsOnUpdate(knex, schema, relations, record, { trx }, collection)
      }

      return targets.length
   })
}

/**
 * Update one record in a table.
 */
export function updateOne<S extends Schema, N extends TableNames<S>>(
   knex: Knex,
   schema: S,
   tableName: N,
   filter: FilterQuery<S, N>,
   patch: TableRecordInput<S, N>,
   options?: MutationOptions,
): Promise<TableRecord<S, N> | undefined> {
   return runInTransaction<TableRecord<S, N> | undefined>(knex, options, async (trx) => {
      await update(knex, schema, tableName, filter, patch, { trx })
      return findOne(knex, schema, tableName, {
         trx,
         where: filter,
      }) as Promise<TableRecord<S, N> | undefined>
   })
}

/**
 * Remove records in a table.
 */
export function remove<S extends Schema, N extends TableNames<S>>(
   knex: Knex,
   schema: S,
   tableName: N,
   filter: FilterQuery<S, N>,
   options?: MutationOptions,
) {
   return runInTransaction(knex, options, async (trx) => {
      const collection = schema[tableName]
      const primaryKey = getPrimaryKey(collection)

      const targets = (await builder(knex, tableName, trx)
         .modify(qb => applyFilters(qb, knex, schema, tableName, filter))
         .select(primaryKey)) as Record<string, unknown>[]

      if (!targets.length) return 0

      const ids = targets
         .map(row => row[primaryKey])
         .filter((value): value is string | number => value !== undefined)

      if (ids.length > 0) {
         await builder(knex, tableName, trx).whereIn(primaryKey, ids).del()
      }

      return targets.length
   })
}

/**
 * Remove one record in a table.
 */
export function removeOne<S extends Schema, N extends TableNames<S>>(
   knex: Knex,
   schema: S,
   tableName: N,
   filter: FilterQuery<S, N>,
   options?: MutationOptions,
): Promise<TableRecord<S, N> | undefined> {
   return runInTransaction<TableRecord<S, N> | undefined>(knex, options, async (trx) => {
      const record = await findOne<S, N>(knex, schema, tableName, { trx, where: filter })
      if (!record) return undefined
      await remove(knex, schema, tableName, filter, { trx })
      return record as TableRecord<S, N>
   })
}

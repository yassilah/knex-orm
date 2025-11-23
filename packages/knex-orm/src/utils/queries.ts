import type { Knex } from 'knex'
import type { FieldName } from '@/types/fields'
import type { MutationOptions } from '@/types/orm'
import type { FilterQuery, FindQueryParams, QueryResult, QueryResultItem } from '@/types/query'
import type { CollectionDefinition, Schema, TableItem, TableItemInput, TableNames, TablePrimaryKeyValue } from '@/types/schema'
import { getCollection, getColumns, getPrimaryKey, getRelations } from './collections'
import { applyFilters } from './filters'
import { clientSupportsReturning } from './misc'
import { handleBelongsToRelations, handleChildRelationsOnCreate, handleChildRelationsOnUpdate, partitionRecord } from './mutations'
import { isBelongsTo, isHasMany, isHasOne, isManyToMany } from './relations'
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
   baseTable: TableNames<S>,
   baseAlias: string,
   relationTree: Record<string, RelationTree>,
   prefix: string,
   selects: string[],
   rootTable: TableNames<S>,
) {
   const collection = getCollection(schema, baseTable)
   const relations = getRelations(collection, { includeBelongsTo: true })
   const basePk = getPrimaryKey(collection)

   for (const [relationName, tree] of Object.entries(relationTree)) {
      const relation = relations[relationName]
      if (!relation) continue
      const tableTable = relation.table
      const tableAlias = `${prefix}_${relationName}`
      const tableCollection = schema[tableTable]
      if (!tableCollection) continue

      const tablePk = getPrimaryKey(tableCollection)

      if (tableTable === rootTable) continue

      if (isBelongsTo(relation)) {
         const foreignKeyColumn = relationName
         qb.leftJoin(`${tableTable} as ${tableAlias}`, `${baseAlias}.${foreignKeyColumn}`, `${tableAlias}.${tablePk}`)
      }
      else if (isHasOne(relation) || isHasMany(relation)) {
         qb.leftJoin(`${tableTable} as ${tableAlias}`, `${tableAlias}.${relation.foreignKey}`, `${baseAlias}.${basePk}`)
      }
      else if (isManyToMany(relation)) {
         const { through } = relation
         if (!through) continue
         const junctionAlias = `${tableAlias}_junction`
         qb.leftJoin(`${through.table} as ${junctionAlias}`, `${junctionAlias}.${through.sourceFk}`, `${baseAlias}.${basePk}`)
         qb.leftJoin(`${tableTable} as ${tableAlias}`, `${tableAlias}.${tablePk}`, `${junctionAlias}.${through.tableFk}`)
      }

      selects.push(`${tableAlias}.${tablePk} as ${tableAlias}_${tablePk}`)

      if (tree.fields.size === 0 || tree.fields.has('*')) {
         const tableColumns = getColumns(schema, tableCollection, { includeBelongsTo: true })
         for (const field of Object.keys(tableColumns)) {
            if (field !== tablePk) {
               selects.push(`${tableAlias}.${field} as ${tableAlias}_${field}`)
            }
         }
      }
      else {
         for (const field of tree.fields) {
            selects.push(`${tableAlias}.${field} as ${tableAlias}_${field}`)
         }
      }

      if (Object.keys(tree.nested).length > 0) {
         buildJoinsAndSelects(qb, schema, tableTable, tableAlias, tree.nested, tableAlias, selects, rootTable)
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
   hasExplicitBaseColumns: boolean = true,
   requestedBaseColumns: Set<string> = new Set(),
   hasWildcardInBase: boolean = false,
): Record<string, unknown>[] {
   if (!flatRows.length) return []

   const collection = getCollection(schema, baseTable)
   const columns = getColumns(schema, collection, { includeBelongsTo: true })
   const relations = getRelations(collection, { includeBelongsTo: true })
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

      const belongsToForeignKeys = new Set<string>()
      for (const [relationName] of Object.entries(relationTree)) {
         const relation = relations[relationName]
         if (relation && isBelongsTo(relation)) {
            belongsToForeignKeys.add(relationName)
         }
      }

      // Only include base columns if they were explicitly requested
      if (hasExplicitBaseColumns) {
         for (const key of Object.keys(baseRow)) {
            if (key.startsWith(`${baseAlias}_`) && !key.includes('_junction')) {
               const field = key.replace(`${baseAlias}_`, '')
               if (belongsToForeignKeys.has(field)) continue
               // If specific columns were requested (not '*'), only include those (PK is always needed for grouping)
               // If '*' was used, include all columns
               if (!hasWildcardInBase && requestedBaseColumns.size > 0 && field !== basePk && !requestedBaseColumns.has(field)) {
                  continue
               }
               const definition = columns[field]
               if (definition) {
                  result[field] = transformOutputColumnValue(clientName, definition.type, baseRow[key])
               }
            }
         }
      }

      for (const [relationName, tree] of Object.entries(relationTree)) {
         const relation = relations[relationName]
         if (!relation) continue

         const tableAlias = `${baseAlias}_${relationName}`
         const tableCollection = schema[relation.table]
         if (!tableCollection) continue

         const tablePk = getPrimaryKey(tableCollection)
         const tablePkAlias = `${tableAlias}_${tablePk}`
         const tableColumns = getColumns(schema, tableCollection, { includeBelongsTo: true })

         if (isBelongsTo(relation) || isHasOne(relation)) {
            const relationRow = rows.find(r => r[tablePkAlias] != null)
            if (relationRow) {
               const relationObj = extractRelationObject(relationRow, tree, tableAlias, tableColumns, clientName)
               if (Object.keys(tree.nested).length > 0) {
                  const nested = reconstructNestedObjects(schema, relation.table, [relationRow], tree.nested, tableAlias, clientName, true, new Set(), false)
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
               const relationPk = row[tablePkAlias]
               if (relationPk != null && (typeof relationPk === 'string' || typeof relationPk === 'number')) {
                  if (!relationObjects.has(relationPk)) {
                     relationObjects.set(relationPk, extractRelationObject(row, tree, tableAlias, tableColumns, clientName))
                  }
                  if (Object.keys(tree.nested).length > 0) {
                     const nested = reconstructNestedObjects(schema, relation.table, [row], tree.nested, tableAlias, clientName, true, new Set(), false)
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
   tableAlias: string,
   tableColumns: Record<string, any>,
   clientName: string,
): Record<string, unknown> {
   const relationObj: Record<string, unknown> = {}
   // If fields set is empty or contains '*', load all columns
   const fieldsToExtract = tree.fields.size === 0 || tree.fields.has('*')
      ? Object.keys(tableColumns)
      : Array.from(tree.fields)

   for (const field of fieldsToExtract) {
      const alias = `${tableAlias}_${field}`
      if (row[alias] !== undefined) {
         const definition = tableColumns[field]
         if (definition) {
            relationObj[field] = transformOutputColumnValue(clientName, definition.type, row[alias])
         }
      }
   }
   return relationObj
}

type FindParams<S extends Schema, N extends TableNames<S>, C extends FieldName<S, N>[]> = FindQueryParams<S, N, C> & { trx?: Knex.Transaction }

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
export function find<S extends Schema, N extends TableNames<S>, C extends FieldName<S, N>[], P extends FindParams<S, N, C> = FindParams<S, N, C>>(knex: Knex, schema: S, tableName: N, params?: P) {
   const { trx, ...rest } = (params ?? {}) as P
   const { columns, where, orderBy, limit, offset } = rest

   if (hasNestedColumns(columns as readonly string[] | undefined) || (columns && Array.from(columns as readonly string[]).includes('*'))) {
      return findWithRelations<S, N, C>(knex, schema, tableName, params)
   }

   const qb = builder(knex, tableName, trx)

   const selectableColumns = extractSelectableColumns(columns as readonly string[] | undefined)
   qb.select(selectableColumns || '*')
   attachRowNormalizer(qb, schema, tableName)
   applyFilters(qb, knex, schema, tableName, where)
   applyQueryOptions(qb, { orderBy, limit, offset })

   return qb as Knex.QueryBuilder<QueryResult<S, N, C>, QueryResult<S, N, C>>
}

/**
 * Find records with relation loading for nested column selections.
 */
async function findWithRelations<S extends Schema, N extends TableNames<S>, C extends FieldName<S, N>[], P extends FindParams<S, N, C> = FindParams<S, N, C>>(
   knex: Knex,
   schema: S,
   tableName: N,
   params?: P,
) {
   const { trx, ...rest } = (params ?? {}) as P
   const { columns, where, orderBy, limit, offset } = rest

   const { relationTree, baseColumns } = parseColumnPaths((columns ?? []) as readonly string[])
   const baseAlias = tableName
   const qb = builder(knex, `${tableName} as ${baseAlias}`, trx)

   const selects: string[] = []
   const collection = getCollection(schema, tableName)
   const basePk = getPrimaryKey(collection)
   const allColumns = Object.keys(getColumns(schema, collection, { includeBelongsTo: true }))

   function expandWildcards(tree: Record<string, RelationTree>, schema: S, tableName: string, visitedTables: Set<string> = new Set()): Record<string, RelationTree> {
      const expanded: Record<string, RelationTree> = {}
      const collection = getCollection(schema, tableName)
      const relations = getRelations(collection, { includeBelongsTo: true })

      // Add current table to visited set to prevent cycles
      const currentPath = new Set(visitedTables)
      currentPath.add(tableName)

      for (const [relationName, relationTree] of Object.entries(tree)) {
         if (relationName === '*') {
            for (const relName of Object.keys(relations)) {
               const relation = relations[relName]
               // Skip relations that would create a cycle back to a parent table
               if (currentPath.has(relation.table)) {
                  continue
               }
               const nestedExpanded = expandWildcards(relationTree.nested, schema, relation.table, currentPath)
               expanded[relName] = {
                  fields: new Set(relationTree.fields),
                  nested: nestedExpanded,
               }
            }
         }
         else {
            const relation = relations[relationName]
            if (!relation) continue
            // Skip relations that would create a cycle back to a parent table
            if (currentPath.has(relation.table)) {
               continue
            }
            const nestedExpanded = expandWildcards(relationTree.nested, schema, relation.table, currentPath)
            expanded[relationName] = {
               fields: new Set(relationTree.fields),
               nested: nestedExpanded,
            }
         }
      }

      return expanded
   }

   const finalRelationTree = expandWildcards(relationTree, schema, tableName)

   // Track which base columns were explicitly requested (excluding PK which is always needed for joins)
   const requestedBaseColumns = new Set(baseColumns.filter(col => col !== '*' && col !== basePk))
   const hasWildcardInBase = baseColumns.includes('*')
   // Check if relation tree has a wildcard (e.g., '*.*' means include base columns)
   const hasWildcardInRelations = Object.keys(relationTree).includes('*')
   // hasExplicitBaseColumns is true if:
   // 1. Base columns were explicitly requested (either '*' or specific columns), OR
   // 2. A wildcard was used in relations (e.g., '*.*' means include base columns)
   // It's false only when a specific relation is requested without base columns (e.g., 'posts.*')
   const hasExplicitBaseColumns = baseColumns.some(col => col !== basePk) || hasWildcardInRelations

   const columnsToSelect = baseColumns.filter(col => col !== '*').length > 0
      ? baseColumns.filter(col => col !== '*')
      : allColumns

   for (const col of columnsToSelect) {
      selects.push(`${baseAlias}.${col} as ${baseAlias}_${col}`)
   }

   if (!baseColumns.includes(basePk) && !columnsToSelect.includes(basePk)) {
      selects.push(`${baseAlias}.${basePk} as ${baseAlias}_${basePk}`)
   }

   if (Object.keys(finalRelationTree).length > 0) {
      buildJoinsAndSelects(qb, schema, tableName, baseAlias, finalRelationTree, baseAlias, selects, tableName)
   }

   qb.select(selects)
   applyFilters(qb, knex, schema, tableName, where)
   applyQueryOptions(qb, { orderBy, limit, offset })

   const flatRows = await qb

   if (Object.keys(finalRelationTree).length > 0) {
      return reconstructNestedObjects(schema, tableName, flatRows, finalRelationTree, baseAlias, knex.client.config.client, hasExplicitBaseColumns, requestedBaseColumns, hasWildcardInBase) as QueryResult<S, N, C>
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

   return results as QueryResult<S, N, C>
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
export function findOne<S extends Schema, N extends TableNames<S>, C extends FieldName<S, N>[], P extends FindParams<S, N, C>>(
   knex: Knex,
   schema: S,
   tableName: N,
   primaryKeyOrParams: TablePrimaryKeyValue<S, N> | P,
   params?: Omit<P, 'where' | 'limit'>,
) {
   const collection = schema[tableName]
   const primaryKeyColumn = getPrimaryKey(collection)

   if (isParamsObject(primaryKeyOrParams)) {
      const result = find(knex, schema, tableName, { ...primaryKeyOrParams, limit: 1 })
      if (result instanceof Promise) {
         return result.then(records => records?.[0]) as Promise<QueryResultItem<S, N, C>>
      }
      return result.first() as Knex.QueryBuilder<any, QueryResultItem<S, N, C>>
   }

   const primaryKey = primaryKeyOrParams as Knex.Value
   const queryParams = { ...params, limit: 1 } as P
   const result = find(knex, schema, tableName, queryParams)

   if ('where' in result) {
      return result.where(primaryKeyColumn, primaryKey).first() as Knex.QueryBuilder<any, QueryResultItem<S, N, C>>
   }

   return result.then(records => records?.[0] as QueryResultItem<S, N, C>)
}

/**
 * Create records in a table.
 */
export async function create<S extends Schema, N extends TableNames<S>>(
   knex: Knex,
   schema: S,
   tableName: N,
   records: TableItemInput<S, N>[],
   options?: MutationOptions,
) {
   if (!records.length) return []

   const collection = schema[tableName]
   const clientName = knex.client.config.client?.toString()

   return runInTransaction(knex, options, async (trx) => {
      const created: TableItem<S, N>[] = []

      for (const record of records) {
         const { scalar, relations } = partitionRecord(collection, record as Record<string, unknown>)

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
   record: TableItemInput<S, N>,
   options?: MutationOptions,
) {
   return runInTransaction<TableItem<S, N>>(knex, options, async (trx) => {
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
   patch: TableItemInput<S, N>,
   options?: MutationOptions,
) {
   const collection = schema[tableName]
   const primaryKey = getPrimaryKey(collection)
   const clientName = knex.client.config.client?.toString()

   return runInTransaction(knex, options, async (trx) => {
      const tables = await builder(knex, tableName, trx)
         .modify(qb => applyFilters(qb, knex, schema, tableName, filter))
         .select(primaryKey) as Record<string, unknown>[]

      if (!tables.length) return 0

      const ids = tables
         .map(row => row[primaryKey])
         .filter((value): value is string | number => value !== undefined)

      const { scalar, relations } = partitionRecord(collection, patch as Record<string, unknown>)

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

      return tables.length
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
   patch: TableItemInput<S, N>,
   options?: MutationOptions,
): Promise<TableItem<S, N> | undefined> {
   return runInTransaction<TableItem<S, N> | undefined>(knex, options, async (trx) => {
      await update(knex, schema, tableName, filter, patch, { trx })
      return findOne(knex, schema, tableName, {
         trx,
         where: filter,
      }) as Promise<TableItem<S, N> | undefined>
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

      const tables = (await builder(knex, tableName, trx)
         .modify(qb => applyFilters(qb, knex, schema, tableName, filter))
         .select(primaryKey)) as Record<string, unknown>[]

      if (!tables.length) return 0

      const ids = tables
         .map(row => row[primaryKey])
         .filter((value): value is string | number => value !== undefined)

      if (ids.length > 0) {
         await builder(knex, tableName, trx).whereIn(primaryKey, ids).del()
      }

      return tables.length
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
): Promise<TableItem<S, N> | undefined> {
   return runInTransaction<TableItem<S, N> | undefined>(knex, options, async (trx) => {
      const record = await findOne(knex, schema, tableName, { trx, where: filter })
      if (!record) return undefined
      await remove(knex, schema, tableName, filter, { trx })
      return record as TableItem<S, N>
   })
}

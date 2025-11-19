import type { Knex } from 'knex'
import type { MutationOptions } from '../types/orm'
import type { ColumnSelection, ColumnSelectionResult, FilterQuery, FindQueryParams } from '../types/query'
import type { CollectionDefinition, Schema, TableNames, TablePrimaryKeyValue, TableRecord, TableRecordInput } from '../types/schema'
import { applyFilters, applyQueryOptions } from '../query'
import { getCollection, getColumns, getPrimaryKey, getRelations } from './collections'
import { clientSupportsReturning } from './misc'
import { handleBelongsToRelations, handleChildRelationsOnCreate, handleChildRelationsOnUpdate, partitionRecord } from './mutations'
import { isHasMany, isHasOne, isManyToMany } from './relations'
import { runInTransaction } from './transactions'

/**
 * Query builder.
 */
function builder(knex: Knex, tableName: string, trx?: Knex.Transaction) {
   return (trx ?? knex)(tableName)
}

function extractSelectableColumns(columns?: readonly string[]) {
   if (!columns?.length) return undefined
   const selectable = Array.from(new Set(columns.filter(column => column && !column.includes('.'))))
   return selectable.length ? selectable : undefined
}

function hasNestedColumns(columns?: readonly string[]) {
   return columns?.some(column => column && column.includes('.')) ?? false
}

interface RelationTree {
   fields: Set<string>
   nested: Record<string, RelationTree>
}

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
               // Last relation, add the field
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

function buildJoinsAndSelects<S extends Schema>(
   qb: Knex.QueryBuilder,
   schema: S,
   baseTable: string,
   baseAlias: string,
   relationTree: Record<string, RelationTree>,
   prefix: string,
   selects: string[],
): void {
   const collection = getCollection(schema, baseTable as TableNames<S>)
   const relations = getRelations(collection)

   for (const [relationName, tree] of Object.entries(relationTree)) {
      const relation = relations[relationName]
      if (!relation) continue

      const targetTable = relation.target
      const targetAlias = `${prefix}_${relationName}`
      const targetCollection = schema[targetTable]
      if (!targetCollection) continue

      const targetPk = getPrimaryKey(targetCollection)

      if (isHasOne(relation)) {
         qb.leftJoin(`${targetTable} as ${targetAlias}`, `${targetAlias}.${relation.foreignKey}`, `${baseAlias}.${getPrimaryKey(collection)}`)
      }
      else if (isHasMany(relation)) {
         qb.leftJoin(`${targetTable} as ${targetAlias}`, `${targetAlias}.${relation.foreignKey}`, `${baseAlias}.${getPrimaryKey(collection)}`)
      }
      else if (isManyToMany(relation)) {
         const { through } = relation
         if (!through) continue
         const junctionAlias = `${targetAlias}_junction`
         qb.leftJoin(`${through.table} as ${junctionAlias}`, `${junctionAlias}.${through.sourceFk}`, `${baseAlias}.${getPrimaryKey(collection)}`)
         qb.leftJoin(`${targetTable} as ${targetAlias}`, `${targetAlias}.${targetPk}`, `${junctionAlias}.${through.targetFk}`)
      }

      // Always select primary key for grouping/reconstruction
      selects.push(`${targetAlias}.${targetPk} as ${targetAlias}_${targetPk}`)

      // Add selects for direct fields
      for (const field of tree.fields) {
         selects.push(`${targetAlias}.${field} as ${targetAlias}_${field}`)
      }

      // Recursively build joins for nested relations
      if (Object.keys(tree.nested).length > 0) {
         buildJoinsAndSelects(qb, schema, targetTable, targetAlias, tree.nested, targetAlias, selects)
      }
   }
}

function reconstructNestedObjects<S extends Schema>(
   schema: S,
   baseTable: string,
   flatRows: Record<string, unknown>[],
   relationTree: Record<string, RelationTree>,
   baseAlias: string,
): Record<string, unknown>[] {
   if (!flatRows.length) return []

   const collection = getCollection(schema, baseTable as TableNames<S>)
   const relations = getRelations(collection)
   const basePk = getPrimaryKey(collection)
   const basePkAlias = `${baseAlias}_${basePk}`

   // Group rows by base primary key
   const grouped = new Map<string | number, Record<string, unknown>[]>()
   for (const row of flatRows) {
      const pk = row[basePkAlias]
      if (pk !== undefined && pk !== null && (typeof pk === 'string' || typeof pk === 'number')) {
         if (!grouped.has(pk)) {
            grouped.set(pk, [])
         }
         grouped.get(pk)!.push(row)
      }
   }

   const results: Record<string, unknown>[] = []

   for (const [, rows] of grouped.entries()) {
      const baseRow = rows[0]
      const result: Record<string, unknown> = {}

      // Extract base columns
      for (const key of Object.keys(baseRow)) {
         if (key.startsWith(`${baseAlias}_`) && !key.includes('_junction')) {
            const field = key.replace(`${baseAlias}_`, '')
            result[field] = baseRow[key]
         }
      }

      // Reconstruct relations
      for (const [relationName, tree] of Object.entries(relationTree)) {
         const relation = relations[relationName]
         if (!relation) continue

         const targetAlias = `${baseAlias}_${relationName}`
         const targetCollection = schema[relation.target]
         if (!targetCollection) continue

         const targetPk = getPrimaryKey(targetCollection)
         const targetPkAlias = `${targetAlias}_${targetPk}`

         if (isHasOne(relation)) {
            // Find first row with non-null relation data
            const relationRow = rows.find(r => r[targetPkAlias] !== null && r[targetPkAlias] !== undefined)
            if (relationRow) {
               const relationObj: Record<string, unknown> = {}
               for (const field of tree.fields) {
                  const alias = `${targetAlias}_${field}`
                  if (relationRow[alias] !== undefined) {
                     relationObj[field] = relationRow[alias]
                  }
               }
               // Reconstruct nested relations
               if (Object.keys(tree.nested).length > 0) {
                  const nested = reconstructNestedObjects(schema, relation.target, [relationRow], tree.nested, targetAlias)
                  if (nested.length > 0) {
                     Object.assign(relationObj, nested[0])
                  }
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
               if (relationPk !== null && relationPk !== undefined && (typeof relationPk === 'string' || typeof relationPk === 'number')) {
                  if (!relationObjects.has(relationPk)) {
                     const relationObj: Record<string, unknown> = {}
                     for (const field of tree.fields) {
                        const alias = `${targetAlias}_${field}`
                        if (row[alias] !== undefined) {
                           relationObj[field] = row[alias]
                        }
                     }
                     relationObjects.set(relationPk, relationObj)
                  }
                  // Reconstruct nested relations
                  if (Object.keys(tree.nested).length > 0) {
                     const nested = reconstructNestedObjects(schema, relation.target, [row], tree.nested, targetAlias)
                     if (nested.length > 0) {
                        Object.assign(relationObjects.get(relationPk)!, nested[0])
                     }
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

type FindParams<S extends Schema, N extends TableNames<S>, Columns extends ColumnSelection<S, N> | undefined = undefined,
> = FindQueryParams<S, N, Columns> & { trx?: Knex.Transaction }

/**
 * Insert a record into a table.
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

   const inserted = await builder(knex, tableName, trx)
      .where(primaryKey, pkValue)
      .first()

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
): Knex.QueryBuilder<ColumnSelectionResult<TableRecord<S, N>, Columns>, ColumnSelectionResult<TableRecord<S, N>, Columns>[]> | Promise<ColumnSelectionResult<TableRecord<S, N>, Columns>[]> {
   const { trx, ...rest } = params ?? {}
   const { columns, where, orderBy, limit, offset } = rest

   // If nested columns are present, return a Promise that loads relations
   if (hasNestedColumns(columns)) {
      return findWithRelations(knex, schema, tableName, params as FindParams<S, N, Columns>)
   }

   type Selection = ColumnSelectionResult<TableRecord<S, N>, Columns>
   const qb = builder(knex, tableName, trx) as Knex.QueryBuilder<Selection, Selection[]>

   const selectableColumns = extractSelectableColumns(columns)
   if (selectableColumns) {
      qb.select(selectableColumns)
   }
   else {
      qb.select('*')
   }

   applyFilters<S, N>(qb as unknown as Knex.QueryBuilder, where)
   applyQueryOptions<S, N, Selection>(qb, { orderBy: orderBy as any, limit, offset })

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

   // Build query with JOINs
   const baseAlias = tableName
   type Selection = ColumnSelectionResult<TableRecord<S, N>, Columns>
   const qb = builder(knex, `${tableName} as ${baseAlias}`, trx) as Knex.QueryBuilder<Selection, Selection[]>

   const selects: string[] = []
   const collection = getCollection(schema, tableName)
   const basePk = getPrimaryKey(collection)

   // Select base columns
   if (baseColumns.length > 0) {
      for (const col of baseColumns) {
         selects.push(`${baseAlias}.${col} as ${baseAlias}_${col}`)
      }
   }
   else {
      // Select all base columns
      const allColumns = Object.keys(getColumns(collection))
      for (const col of allColumns) {
         selects.push(`${baseAlias}.${col} as ${baseAlias}_${col}`)
      }
   }
   // Always include primary key for grouping
   if (!baseColumns.includes(basePk)) {
      selects.push(`${baseAlias}.${basePk} as ${baseAlias}_${basePk}`)
   }

   // Build JOINs for relations and collect additional selects
   if (Object.keys(relationTree).length > 0) {
      buildJoinsAndSelects(qb, schema, tableName, baseAlias, relationTree, baseAlias, selects)
   }

   // Add all selects to query
   qb.select(selects)

   applyFilters<S, N>(qb as unknown as Knex.QueryBuilder, where)
   applyQueryOptions<S, N, Selection>(qb, { orderBy: orderBy as any, limit, offset })

   // Execute query
   const flatRows = (await qb) as Record<string, unknown>[]

   // Reconstruct nested objects
   if (Object.keys(relationTree).length > 0) {
      return reconstructNestedObjects(schema, tableName, flatRows, relationTree, baseAlias) as ColumnSelectionResult<TableRecord<S, N>, Columns>[]
   }

   // No relations, just return base records
   const results: Record<string, unknown>[] = []
   for (const row of flatRows) {
      const result: Record<string, unknown> = {}
      for (const key of Object.keys(row)) {
         if (key.startsWith(`${baseAlias}_`)) {
            const field = key.replace(`${baseAlias}_`, '')
            result[field] = row[key]
         }
      }
      results.push(result)
   }

   return results as ColumnSelectionResult<TableRecord<S, N>, Columns>[]
}

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
): Promise<ColumnSelectionResult<TableRecord<S, N>, Columns> | undefined> {
   const collection = schema[tableName]
   const primaryKeyColumn = getPrimaryKey(collection)

   // Check if first arg is a primary key value (number or string) or params object
   if (primaryKeyOrParams !== undefined && primaryKeyOrParams !== null && typeof primaryKeyOrParams === 'object' && !Array.isArray(primaryKeyOrParams) && ('where' in primaryKeyOrParams || 'columns' in primaryKeyOrParams || 'orderBy' in primaryKeyOrParams || 'offset' in primaryKeyOrParams || 'trx' in primaryKeyOrParams)) {
      // It's a params object
      const result = find<S, N, Columns>(knex, schema, tableName, { ...primaryKeyOrParams, limit: 1 })
      if (result instanceof Promise) {
         return result.then(records => records[0]) as Promise<ColumnSelectionResult<TableRecord<S, N>, Columns> | undefined>
      }
      return result.first() as Promise<ColumnSelectionResult<TableRecord<S, N>, Columns> | undefined>
   }

   // It's a primary key value
   const primaryKey = primaryKeyOrParams as TablePrimaryKeyValue<S, N>
   const queryParams = { ...params, limit: 1 } as FindParams<S, N, Columns>

   const result = find<S, N, Columns>(knex, schema, tableName, queryParams)
   if (result instanceof Promise) {
      return result.then(records => records[0]) as Promise<ColumnSelectionResult<TableRecord<S, N>, Columns> | undefined>
   }
   return (result as any)
      .where(primaryKeyColumn, primaryKey)
      .first() as Promise<ColumnSelectionResult<TableRecord<S, N>, Columns> | undefined>
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
   const collection = schema[tableName]

   if (!records.length) return []

   return runInTransaction(knex, options, async (trx) => {
      const created: TableRecord<S, N>[] = []

      for (const record of records) {
         const { scalar, relations } = partitionRecord(collection, record)

         await handleBelongsToRelations(
            knex,
            schema,
            relations,
            scalar,
            { trx },
         )

         const inserted = await insertRecord(knex, tableName, collection, scalar, trx)

         await handleChildRelationsOnCreate(
            knex,
            schema,
            relations,
            inserted,
            { trx },
            collection,
         )

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

   return runInTransaction(knex, options, async (trx) => {
      const targets = await builder(knex, tableName, trx)
         .modify(qb => applyFilters(qb, filter))
         .select(primaryKey) as Record<string, unknown>[]

      if (!targets.length) return 0

      const ids = targets
         .map(row => row[primaryKey])
         .filter((value): value is string | number => value !== undefined)

      const { scalar, relations } = partitionRecord(collection, patch)

      await handleBelongsToRelations(
         knex,
         schema,
         relations,
         scalar,
         { trx },
      )

      if (Object.keys(scalar).length) {
         const qb = builder(knex, tableName, trx).modify(qb => applyFilters(qb, filter))

         if (clientSupportsReturning(knex)) {
            await qb.update(scalar, '*')
         }
         else {
            await qb.update(scalar)
         }
      }

      const refreshed = ids.length === 0
         ? []
         : ((await builder(knex, tableName, trx)
               .whereIn(primaryKey, ids)
               .select('*')) as Record<string, unknown>[])

      for (const record of refreshed) {
         await handleChildRelationsOnUpdate(
            knex,
            schema,
            relations,
            record,
            { trx },
            collection,
         )
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
      return findOne<S, N>(knex, schema, tableName, {
         trx,
         where: filter,
      })
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
         .modify(qb => applyFilters(qb, filter))
         .select(primaryKey)) as Record<string, unknown>[]

      if (!targets.length) return 0

      const ids = targets
         .map(row => row[primaryKey])
         .filter((value): value is string | number => value !== undefined)

      if (!ids.length) return 0

      await builder(knex, tableName, trx).whereIn(primaryKey, ids).del()

      return targets.length
   })
}

/**
 * Delete one record in a table.
 */
export function removeOne<S extends Schema, N extends TableNames<S>>(
   knex: Knex,
   schema: S,
   tableName: N,
   filter: FilterQuery<S, N>,
   options?: MutationOptions,
): Promise<TableRecord<S, N> | undefined> {
   return runInTransaction<TableRecord<S, N> | undefined>(knex, options, async (trx) => {
      const record = await findOne<S, N>(knex, schema, tableName, {
         trx,
         where: filter,
      })
      if (!record) return undefined
      await remove(knex, schema, tableName, filter, { trx })
      return record as TableRecord<S, N>
   })
}

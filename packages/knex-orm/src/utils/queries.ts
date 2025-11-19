import type { Knex } from 'knex'
import type { MutationOptions } from '../types/orm'
import type { ColumnSelection, ColumnSelectionResult, FilterQuery, FindQueryParams } from '../types/query'
import type { CollectionDefinition, Schema, TableNames, TablePrimaryKeyValue, TableRecord, TableRecordInput } from '../types/schema'
import { applyFilters, applyQueryOptions } from '../query'
import { getPrimaryKey } from './collections'
import { clientSupportsReturning } from './misc'
import { handleBelongsToRelations, handleChildRelationsOnCreate, handleChildRelationsOnUpdate, partitionRecord } from './mutations'
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
   _schema: S,
   tableName: N,
   params?: FindParams<S, N, Columns>,
): Knex.QueryBuilder<ColumnSelectionResult<TableRecord<S, N>, Columns>, ColumnSelectionResult<TableRecord<S, N>, Columns>[]> {
   const { trx, ...rest } = params ?? {}
   const { columns, where, orderBy, limit, offset } = rest

   type Selection = ColumnSelectionResult<TableRecord<S, N>, Columns>
   const qb = builder(knex, tableName, trx) as Knex.QueryBuilder<Selection, Selection[]>

   const selectableColumns = extractSelectableColumns(columns)
   if (selectableColumns) {
      qb.select(selectableColumns)
   }
   else {
      qb.select('*')
   }

   applyFilters(qb as unknown as Knex.QueryBuilder, where)
   applyQueryOptions(qb, { orderBy: orderBy as any, limit, offset })

   return qb
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
      return find<S, N, Columns>(knex, schema, tableName, { ...primaryKeyOrParams, limit: 1 }).first() as Promise<ColumnSelectionResult<TableRecord<S, N>, Columns> | undefined>
   }

   // It's a primary key value
   const primaryKey = primaryKeyOrParams as TablePrimaryKeyValue<S, N>
   const queryParams = { ...params, limit: 1 } as FindParams<S, N, Columns>

   return (find<S, N, Columns>(knex, schema, tableName, queryParams) as any)
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

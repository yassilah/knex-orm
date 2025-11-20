import type { Knex } from 'knex'
import type { MutationOptions } from './types/orm'
import type { ColumnSelection, ColumnSelectionResult, FilterQuery, FindQueryParams } from './types/query'
import type { CollectionDefinition, Schema, TableNames, TablePrimaryKeyValue, TableRecord, TableRecordInput } from './types/schema'
import { knex } from 'knex'
import { installDefaultExtensions } from './extensions'
import { migrateSchema, planMigrations } from './utils/migrations'
import * as queries from './utils/queries'

/**
 * Create a new instance of the ORM.
 */
export function createInstance<S extends Schema>(schema: S, knexConfig: Knex.Config, defaultExtensions = true) {
   const knexInstance = knex(knexConfig)
   return createInstanceWithKnex(schema, knexInstance, defaultExtensions)
}

/**
 * Create a new instance of the ORM with a pre-configured Knex instance.
 */
export function createInstanceWithKnex<S extends Schema>(schema: S, knexInstance: Knex, defaultExtensions = true) {
   if (defaultExtensions) {
      installDefaultExtensions()
   }

   function find<N extends TableNames<S>, Columns extends ColumnSelection<S, N> | undefined = undefined>(
      tableName: N,
      params?: FindQueryParams<S, N, Columns>,
   ) {
      return queries.find(knexInstance, schema, tableName, params)
   }

   function findOne<
      N extends TableNames<S>,
      Columns extends ColumnSelection<S, N> | undefined = undefined,
   >(
      tableName: N,
      primaryKey: TablePrimaryKeyValue<S, N>,
      params?: Omit<FindQueryParams<S, N, Columns>, 'where' | 'limit'>,
   ): Promise<ColumnSelectionResult<TableRecord<S, N>, Columns> | undefined>

   function findOne<
      N extends TableNames<S>,
      Columns extends ColumnSelection<S, N> | undefined = undefined,
   >(
      tableName: N,
      params: FindQueryParams<S, N, Columns>,
   ): Promise<ColumnSelectionResult<TableRecord<S, N>, Columns> | undefined>

   function findOne<
      N extends TableNames<S>,
      Columns extends ColumnSelection<S, N> | undefined = undefined,
   >(
      tableName: N,
      primaryKeyOrParams: TablePrimaryKeyValue<S, N> | FindQueryParams<S, N, Columns>,
      params?: Omit<FindQueryParams<S, N, Columns>, 'where' | 'limit'>,
   ): Promise<ColumnSelectionResult<TableRecord<S, N>, Columns> | undefined> {
      return queries.findOne(knexInstance, schema, tableName, primaryKeyOrParams, params)
   }

   function create<N extends TableNames<S>>(
      tableName: N,
      records: TableRecordInput<S, N>[],
      options?: MutationOptions,
   ) {
      return queries.create(knexInstance, schema, tableName, records, options)
   }

   function createOne<N extends TableNames<S>>(
      tableName: N,
      record: TableRecordInput<S, N>,
      options?: MutationOptions,
   ) {
      return queries.createOne(knexInstance, schema, tableName, record, options)
   }

   function update<N extends TableNames<S>>(
      tableName: N,
      filter: FilterQuery<S, N>,
      patch: TableRecordInput<S, N>,
      options?: MutationOptions,
   ) {
      return queries.update(knexInstance, schema, tableName, filter, patch, options)
   }

   function updateOne<N extends TableNames<S>>(
      tableName: N,
      filter: FilterQuery<S, N>,
      patch: TableRecordInput<S, N>,
      options?: MutationOptions,
   ) {
      return queries.updateOne(knexInstance, schema, tableName, filter, patch, options)
   }

   function remove<N extends TableNames<S>>(
      tableName: N,
      filter: FilterQuery<S, N>,
      options?: MutationOptions,
   ) {
      return queries.remove(knexInstance, schema, tableName, filter, options)
   }

   function removeOne<N extends TableNames<S>>(
      tableName: N,
      filter: FilterQuery<S, N>,
      options?: MutationOptions,
   ) {
      return queries.removeOne(knexInstance, schema, tableName, filter, options)
   }

   return {
      knex: knexInstance,
      find,
      findOne,
      create,
      createOne,
      update,
      updateOne,
      remove,
      removeOne,
      async migrate() {
         return migrateSchema(knexInstance, schema)
      },
      async planMigrations() {
         return planMigrations(knexInstance, schema)
      },
      async destroy() {
         await knexInstance.destroy()
      },
   }
}

export type Instance<S extends Record<string, CollectionDefinition>> = ReturnType<typeof createInstance<S>>

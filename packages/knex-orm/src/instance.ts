import type { Knex } from 'knex'
import type { FieldName } from '@/types/fields'
import type { MutationOptions } from '@/types/orm'
import type { FilterQuery, FindQueryParams, QueryResult, QueryResultItem } from '@/types/query'
import type { Schema, TableItem, TableItemInput, TableNames, TablePrimaryKeyValue } from '@/types/schema'
import type { MigrationResult, SchemaOperation } from '@/utils/migrations'
import { knex } from 'knex'
import { installDefaultExtensions } from '@/extensions'
import { planMigrations as _planMigrations, migrateSchema } from '@/utils/migrations'
import * as queries from '@/utils/queries'

/**
 * Create a new instance of the ORM.
 */
export function createInstance<S extends Schema>(schema: S, knexConfig: Knex.Config, defaultExtensions = true): Instance<S> {
   const knexInstance = knex(knexConfig)
   return createInstanceWithKnex(schema, knexInstance, defaultExtensions)
}

/**
 * Create a new instance of the ORM with a pre-configured Knex instance.
 */
export function createInstanceWithKnex<S extends Schema>(schema: S, knexInstance: Knex, defaultExtensions = true): Instance<S> {
   if (defaultExtensions) {
      installDefaultExtensions()
   }

   /**
    * Find records in the specified table.
    */
   function find<N extends TableNames<S>, C extends FieldName<S, N>[] = []>(tableName: N, params?: FindQueryParams<S, N, C>) {
      return queries.find<S, N, C>(knexInstance, schema, tableName, params) as Promise<QueryResult<S, N, C>>
   }

   /**
    * Find a single record by primary key or query parameters.
    */
   function findOne<N extends TableNames<S>, C extends FieldName<S, N>[] = []>(tableName: N, primaryKeyOrParams: TablePrimaryKeyValue<S, N> | FindQueryParams<S, N, C>, params?: Omit<FindQueryParams<S, N, C>, 'where' | 'limit'>): Promise<QueryResultItem<S, N, C>>

   function findOne<N extends TableNames<S>, C extends FieldName<S, N>[] = []>(tableName: N, primaryKeyOrParams: TablePrimaryKeyValue<S, N> | FindQueryParams<S, N, C>, params?: Omit<FindQueryParams<S, N, C>, 'where' | 'limit'>): Promise<QueryResultItem<S, N, C>>

   function findOne<N extends TableNames<S>, C extends FieldName<S, N>[] = []>(tableName: N, primaryKeyOrParams: TablePrimaryKeyValue<S, N> | FindQueryParams<S, N, C>, params?: Omit<FindQueryParams<S, N, C>, 'where' | 'limit'>) {
      return queries.findOne(knexInstance, schema, tableName, primaryKeyOrParams, params)
   }

   /**
    * Create new records in the specified table.
    */
   function create<N extends TableNames<S>>(tableName: N, records: TableItemInput<S, N>[], options?: MutationOptions) {
      return queries.create(knexInstance, schema, tableName, records, options)
   }

   /**
    * Create a single record in the specified table.
    */
   function createOne<N extends TableNames<S>>(tableName: N, record: TableItemInput<S, N>, options?: MutationOptions) {
      return queries.createOne(knexInstance, schema, tableName, record, options)
   }

   /**
    * Update records in the specified table.
    */
   function update<N extends TableNames<S>>(tableName: N, filter: FilterQuery<S, N>, patch: TableItemInput<S, N>, options?: MutationOptions) {
      return queries.update(knexInstance, schema, tableName, filter, patch, options)
   }

   /**
    * Update a single record in the specified table.
    */
   function updateOne<N extends TableNames<S>>(tableName: N, filter: FilterQuery<S, N>, patch: TableItemInput<S, N>, options?: MutationOptions) {
      return queries.updateOne(knexInstance, schema, tableName, filter, patch, options)
   }

   /**
    * Remove records from the specified table.
    */
   function remove<N extends TableNames<S>>(tableName: N, filter: FilterQuery<S, N>, options?: MutationOptions) {
      return queries.remove(knexInstance, schema, tableName, filter, options)
   }

   /**
    * Remove a single record from the specified table.
    */
   function removeOne<N extends TableNames<S>>(tableName: N, filter: FilterQuery<S, N>, options?: MutationOptions) {
      return queries.removeOne(knexInstance, schema, tableName, filter, options)
   }

   /**
    * Migrate the schema.
    */
   function migrate() {
      return migrateSchema(knexInstance, schema)
   }

   /**
    * Plan migrations.
    */
   function planMigrations() {
      return _planMigrations(knexInstance, schema)
   }

   /**
    * Return the instance.
    */
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
      migrate,
      planMigrations,
   }
}

export interface Instance<S extends Schema> {
   knex: Knex
   find: <T extends TableNames<S>, C extends FieldName<S, T>[] = []>(tableName: T, params?: FindQueryParams<S, T, C>) => Promise<QueryResult<S, T, C>>
   findOne: <T extends TableNames<S>, C extends FieldName<S, T>[] = []>(tableName: T, primaryKeyOrParams: TablePrimaryKeyValue<S, T> | FindQueryParams<S, T, C>, params?: Omit<FindQueryParams<S, T, C>, 'where' | 'limit'>) => Promise<QueryResultItem<S, T, C>>
   create: <T extends TableNames<S>>(tableName: T, records: TableItemInput<S, T>[], options?: MutationOptions) => Promise<TableItem<S, T>[]>
   createOne: <T extends TableNames<S>>(tableName: T, record: TableItemInput<S, T>, options?: MutationOptions) => Promise<TableItem<S, T>>
   update: <T extends TableNames<S>>(tableName: T, filter: FilterQuery<S, T>, patch: TableItemInput<S, T>, options?: MutationOptions) => Promise<number>
   updateOne: <T extends TableNames<S>>(tableName: T, filter: FilterQuery<S, T>, patch: TableItemInput<S, T>, options?: MutationOptions) => Promise<TableItem<S, T> | undefined>
   remove: <T extends TableNames<S>>(tableName: T, filter: FilterQuery<S, T>, options?: MutationOptions) => Promise<number>
   removeOne: <T extends TableNames<S>>(tableName: T, filter: FilterQuery<S, T>, options?: MutationOptions) => Promise<TableItem<S, T> | undefined>
   migrate: () => Promise<MigrationResult>
   planMigrations: () => Promise<SchemaOperation[]>
}

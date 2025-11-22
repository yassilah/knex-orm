import type { Knex } from 'knex'
import type { ColumnDefinition } from '@/types/columns'
import type { RelationAction } from '@/types/relations'
import type { CollectionDefinition, Schema } from '@/types/schema'
import { getColumns } from './collections'
import { getDataTypeAfterCreate, getDataTypeBeforeCreate, getDataTypeCreator } from './data-types'

export type ColumnDefinitionWithReferences = ColumnDefinition & {
   references?: {
      table: string
      column: string
      onDelete?: RelationAction
      onUpdate?: RelationAction
   }
}

export type SchemaOperation = { type: 'createTable', tableName: string, collection: CollectionDefinition }
   | {
      type: 'addColumn'
      table: string
      column: string
      definition: ColumnDefinitionWithReferences
   }
   | {
      type: 'alterColumn'
      table: string
      column: string
      definition: ColumnDefinitionWithReferences
   }

export interface MigrationResult {
   operations: SchemaOperation[]
}

/**
 * Apply a column definition to a table builder.
 */
function applyColumnDefinition(knex: Knex, builder: Knex.CreateTableBuilder | Knex.AlterTableBuilder, tableName: string, columnName: string, definition: ColumnDefinitionWithReferences) {
   const column = getDataTypeCreator(definition.type)({
      builder,
      tableName,
      columnName,
      definition,
      knex,
   })

   if (definition.primary) column.primary()
   if (definition.unique) column.unique()
   if (definition.nullable === false) column.notNullable()
   else column.nullable()

   if (definition.default !== undefined) {
      column.defaultTo(getDefaultValue(knex, definition.default))
   }

   if (definition.references) {
      const reference = column
         .references(definition.references.column)
         .inTable(definition.references.table)
      if (definition.references.onDelete) {
         reference.onDelete(definition.references.onDelete)
      }
   }
}

/**
 * Check if a value is a Knex function helper.
 */
function isFunctionHelper(knex: Knex, value: unknown): value is keyof Knex.FunctionHelper {
   return typeof value === 'string' && value in knex.fn
}

/**
 * Get the default value, resolving function helpers if needed.
 */
function getDefaultValue<T>(knex: Knex, value: T) {
   if (typeof value === 'string') {
      const fnMatch = value.match(/^\{(\w+)\}$/)?.[1]
      if (fnMatch && isFunctionHelper(knex, fnMatch)) {
         return knex.fn[fnMatch](null as never)
      }
   }
   return value
}

/**
 * Get column information for a table, returning undefined on error.
 */
async function getColumnInfo(knex: Knex, table: string) {
   try {
      return await knex(table).columnInfo()
   }
   catch {
      return undefined
   }
}

/**
 * Compare the schema with the current database state and return the operations needed to sync them.
 */
export async function diffSchema(
   knex: Knex,
   schema: Schema,
): Promise<SchemaOperation[]> {
   const operations: SchemaOperation[] = []

   for (const [tableName, collection] of Object.entries(schema)) {
      const exists = await knex.schema.hasTable(tableName)

      if (!exists) {
         operations.push({ type: 'createTable', tableName, collection })
         continue
      }

      const columnInfo = await getColumnInfo(knex, tableName)
      if (!columnInfo) continue

      const columns = getColumns(schema, collection, {
         includeBelongsTo: true,
      })

      for (const [name, definition] of Object.entries(columns)) {
         if (!columnInfo[name]) {
            operations.push({
               type: 'addColumn',
               table: tableName,
               column: name,
               definition,
            })
            continue
         }

         const existing = columnInfo[name]
         const nullableMismatch = (definition.nullable === false && existing.nullable)
            || (definition.nullable !== false && !existing.nullable)

         if (nullableMismatch) {
            operations.push({
               type: 'alterColumn',
               table: tableName,
               column: name,
               definition,
            })
         }
      }
   }

   return operations
}

/**
 * Create a table with all its columns.
 */
async function createTable(knex: Knex, operation: SchemaOperation & { type: 'createTable' }, schema?: Schema) {
   if (!schema) {
      throw new Error(`Schema is required to create table ${operation.tableName} (needed for belongs-to column inference)`)
   }

   const columns = getColumns(schema, operation.collection, { includeBelongsTo: true })

   for (const [column, definition] of Object.entries(columns)) {
      const beforeCreate = getDataTypeBeforeCreate(definition.type)
      if (beforeCreate) {
         await beforeCreate({ knex, columnName: column, tableName: operation.tableName, definition })
      }
   }

   await knex.schema.createTable(operation.tableName, (table) => {
      for (const [column, definition] of Object.entries(columns)) {
         applyColumnDefinition(knex, table, operation.tableName, column, definition)
      }
   })

   for (const [column, definition] of Object.entries(columns)) {
      const afterCreate = getDataTypeAfterCreate(definition.type)
      if (afterCreate) {
         await afterCreate({ knex, columnName: column, tableName: operation.tableName, definition })
      }
   }
}

/**
 * Alter a table.
 */
async function alterTable(knex: Knex, operation: SchemaOperation & { type: 'addColumn' | 'alterColumn' }) {
   return knex.schema.alterTable(operation.table, (table) => {
      applyColumnDefinition(knex, table, operation.table, operation.column, operation.definition)
   })
}

/**
 * Apply a single migration operation to the database.
 */
export function applyOperation(knex: Knex, operation: SchemaOperation, schema?: Schema) {
   switch (operation.type) {
      case 'createTable':
         return createTable(knex, operation, schema)
      case 'addColumn':
      case 'alterColumn':
         return alterTable(knex, operation)
      default: {
         const _exhaustive: never = operation
         throw new Error(`Unsupported operation: ${(_exhaustive as { type: string }).type}`)
      }
   }
}

/**
 * Plan migration operations by comparing the schema with the current database state.
 */
export async function planMigrations(
   knex: Knex,
   schema: Schema,
): Promise<SchemaOperation[]> {
   return diffSchema(knex, schema)
}

/**
 * Execute migration operations to bring the database in sync with the schema.
 */
export async function migrateSchema(
   knex: Knex,
   schema: Schema,
): Promise<MigrationResult> {
   const operations = await diffSchema(knex, schema)
   for (const operation of operations) {
      await applyOperation(knex, operation, schema)
   }
   return { operations }
}

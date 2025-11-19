import type { Knex } from 'knex'
import type { CollectionDefinition, ColumnDefinition, Schema } from '../types/schema'
import { getDataTypeCreator } from '../data-types'
import { getColumns } from '../utils/collections'

export type SchemaOperation
   = | { type: 'createTable', tableName: string, collection: CollectionDefinition }
      | {
         type: 'addColumn'
         table: string
         column: string
         definition: ColumnDefinition
      }
      | {
         type: 'alterColumn'
         table: string
         column: string
         definition: ColumnDefinition
      }

function applyColumnDefinition(knex: Knex, tableBuilder: Knex.CreateTableBuilder | Knex.AlterTableBuilder, name: string, definition: ColumnDefinition) {
   const columnCreator = getDataTypeCreator(definition.type)

   const column = columnCreator(tableBuilder, name, definition, knex, false)

   if (definition.primary) {
      column.primary()
   }

   if (definition.unique) {
      column.unique()
   }

   if (definition.nullable === false) {
      column.notNullable()
   }
   else {
      column.nullable()
   }

   if (definition.default !== undefined) {
      column.defaultTo(definition.default)
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

export class SchemaComparator {
   constructor(private readonly knex: Knex) {}

   private async getColumnInfo(table: string) {
      try {
         return await this.knex(table).columnInfo()
      }
      catch {
         return undefined
      }
   }

   async diff(
      schema: Schema,
   ): Promise<SchemaOperation[]> {
      const operations: SchemaOperation[] = []

      for (const [tableName, collection] of Object.entries(schema)) {
         const exists = await this.knex.schema.hasTable(tableName)
         if (!exists) {
            operations.push({ type: 'createTable', tableName, collection })
            continue
         }

         const columnInfo = await this.getColumnInfo(tableName)
         if (!columnInfo) continue

         const columns = getColumns(collection, schema)
         Object.entries(columns).forEach(([name, definition]) => {
            if (!columnInfo[name]) {
               operations.push({
                  type: 'addColumn',
                  table: tableName,
                  column: name,
                  definition,
               })
               return
            }

            const existing = columnInfo[name]
            if (
               (definition.nullable === false && existing.nullable)
               || (definition.nullable !== false && !existing.nullable)
            ) {
               operations.push({
                  type: 'alterColumn',
                  table: tableName,
                  column: name,
                  definition,
               })
            }
         })
      }

      return operations
   }

   async applyOperation(operation: SchemaOperation, schema?: Schema): Promise<void> {
      switch (operation.type) {
         case 'createTable':
            await this.knex.schema.createTable(
               operation.tableName,
               (table) => {
                  // Schema is required to infer belongs-to foreign key columns
                  if (!schema) {
                     throw new Error(`Schema is required to create table ${operation.tableName} (needed for belongs-to column inference)`)
                  }
                  const columns = getColumns(operation.collection, schema)

                  Object.entries(columns).forEach(
                     ([column, definition]) =>
                        applyColumnDefinition(this.knex, table, column, definition),
                  )
               },
            )
            break
         case 'addColumn':
            await this.knex.schema.alterTable(operation.table, (table) => {
               applyColumnDefinition(this.knex, table, operation.column, operation.definition)
            })
            break
         case 'alterColumn':
            await this.knex.schema.alterTable(operation.table, (table) => {
               applyColumnDefinition(this.knex, table, operation.column, operation.definition)
            })
            break
         default:
            throw new Error(`Unsupported operation: ${(operation as any).type}`)
      }
   }
}

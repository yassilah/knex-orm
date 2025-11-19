import type { Knex } from 'knex'
import type { CollectionDefinition, ColumnDefinition } from '../types/schema'

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

function applyColumnDefinition(table: Knex.CreateTableBuilder | Knex.AlterTableBuilder, columnName: string, definition: ColumnDefinition) {
   let column: Knex.ColumnBuilder

   switch (definition.type) {
      case 'string':
      case 'text':
         column = table.string(columnName)
         break
      case 'integer':
         column = definition.increments
            ? table.increments(columnName)
            : table.integer(columnName)
         break
      case 'bigint':
         column = table.bigInteger(columnName)
         break
      case 'float':
         column = table.float(columnName)
         break
      case 'decimal':
         column = table.decimal(columnName)
         break
      case 'boolean':
         column = table.boolean(columnName)
         break
      case 'date':
         column = table.date(columnName)
         break
      case 'datetime':
         column = table.dateTime(columnName)
         break
      case 'json':
         column = table.json(columnName)
         break
      case 'uuid':
         column = table.uuid(columnName)
         break
      default:
         column = table.specificType(columnName, definition.type)
   }

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

   if (definition.defaultTo !== undefined) {
      column.defaultTo(definition.defaultTo)
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
      schema: Record<string, CollectionDefinition>,
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

         Object.entries(collection.columns).forEach(([name, definition]) => {
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

   async applyOperation(operation: SchemaOperation): Promise<void> {
      switch (operation.type) {
         case 'createTable':
            await this.knex.schema.createTable(
               operation.tableName,
               (table) => {
                  Object.entries(operation.collection.columns).forEach(
                     ([column, definition]) =>
                        applyColumnDefinition(table, column, definition),
                  )
                  if (operation.collection.timestamps) {
                     table.timestamps(true, true)
                  }
                  operation.collection.indexes?.forEach((index) => {
                     const name
                        = index.name
                           ?? `${operation.tableName}_${index.columns.join('_')}_idx`
                     if (index.unique) {
                        table.unique(index.columns, name)
                     }
                     else {
                        table.index(index.columns, name)
                     }
                  })
               },
            )
            break
         case 'addColumn':
            await this.knex.schema.alterTable(operation.table, (table) => {
               applyColumnDefinition(table, operation.column, operation.definition)
            })
            break
         case 'alterColumn':
            await this.knex.schema.alterTable(operation.table, (table) => {
               applyColumnDefinition(table, operation.column, operation.definition)
            })
            break
         default:
            throw new Error(`Unsupported operation: ${(operation as any).type}`)
      }
   }
}

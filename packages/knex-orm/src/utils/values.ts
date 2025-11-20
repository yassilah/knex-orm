import type { Knex } from 'knex'
import type { ColumnDefinition, Schema, TableNames } from '../types/schema'
import { getCollection, getColumns } from './collections'

interface ValueTransformer {
   serialize?: (value: unknown) => unknown
   deserialize?: (value: unknown) => unknown
}

const DRIVER_VALUE_TRANSFORMERS: Record<string, Record<ColumnDefinition['type'], ValueTransformer>> = {}

/**
 * Apply a value transformer to the value.
 */
function applyTransformer(driver: string, type: ColumnDefinition['type'], phase: 'serialize' | 'deserialize', value: unknown) {
   const fn = DRIVER_VALUE_TRANSFORMERS[driver]?.[type]?.[phase] || DRIVER_VALUE_TRANSFORMERS['*']?.[type]?.[phase]
   return fn?.(value) ?? value
}

/**
 * Define a value transformer for a driver and a column type.
 */
export function defineValueTransformer(driver: string | string[] | '*', type: ColumnDefinition['type'], transformer: ValueTransformer) {
   const drivers = Array.isArray(driver) ? driver : [driver]

   drivers.forEach((driver) => {
      DRIVER_VALUE_TRANSFORMERS[driver] = DRIVER_VALUE_TRANSFORMERS[driver] || {}
      DRIVER_VALUE_TRANSFORMERS[driver][type] = transformer
   })
}

/**
 * Transform column input value.
 */
export function transformInputColumnValue(driver: string, type: ColumnDefinition['type'], value: unknown) {
   return applyTransformer(driver, type, 'serialize', value)
}

/**
 * Transform column output value.
 */
export function transformOutputColumnValue(driver: string, type: ColumnDefinition['type'], value: unknown) {
   return applyTransformer(driver, type, 'deserialize', value)
}

/**
 * Prepare a scalar for write.
 */
export function transformInputValue(driver: string, schema: Schema, tableName: string, scalar: Record<string, unknown>) {
   const collection = getCollection(schema, tableName)
   const columns = getColumns(collection, schema)

   for (const [columnName, value] of Object.entries(scalar)) {
      const definition = columns[columnName]
      if (!definition) continue
      scalar[columnName] = transformInputColumnValue(driver, definition.type, value)
   }

   return scalar
}

/**
 * Normalize a record from the database.
 */
export function transformOutputValue(schema: Schema, tableName: string, record?: unknown, driver?: string) {
   if (!isValidRecord(record) || !driver) return record

   const collection = getCollection(schema, tableName)
   const columns = getColumns(collection, schema)

   for (const [columnName, definition] of Object.entries(columns)) {
      if (!(columnName in record)) continue
      record[columnName] = transformOutputColumnValue(driver, definition.type, record[columnName])
   }

   return record
}

/**
 * Attach a row normalizer to the query builder.
 */
export function attachRowNormalizer<S extends Schema, N extends TableNames<S>>(qb: Knex.QueryBuilder, schema: S, tableName: N) {
   qb.on('query-response', (response: unknown) => {
      if (Array.isArray(response)) {
         response.forEach(row => transformOutputValue(schema, tableName, row, qb.client.config?.client?.toString()))
      }
      else if (response) {
         transformOutputValue(schema, tableName, response, qb.client.config?.client?.toString())
      }
      return response
   })
}

/**
 * Check if the record is an object
 */
function isValidRecord(record: unknown): record is Record<string, unknown> {
   return record != null && typeof record === 'object'
}

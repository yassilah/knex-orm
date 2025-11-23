import type { Operator } from './operators'
import type { ColumnDefinition } from '@/types/columns'
import type { FieldName } from '@/types/fields'
import type { FindQueryParams } from '@/types/query'
import type { Schema, TableItemInput, TableNames } from '@/types/schema'
import z from 'zod'
import { globalCache } from './cache'
import { getCollection, getColumns, getRelations } from './collections'
import { getDataTypeOperators, getDataTypeValidator } from './data-types'

const SPECIAL_OPERATOR_FACTORIES: Partial<Record<Operator, (base: z.ZodTypeAny) => z.ZodTypeAny>> = {
   $in: base => z.array(base),
   $nin: base => z.array(base),
   $between: base => z.tuple([base, base]),
   $nbetween: base => z.tuple([base, base]),
   $null: () => z.union([z.boolean(), z.undefined()]),
   $nnull: () => z.union([z.boolean(), z.undefined()]),
}

/**
 * Create Zod schema for a column value based on its data type.
 */
function createColumnValueSchema(tableName: string, columnName: string, definition: ColumnDefinition) {
   let schema = getDataTypeValidator(definition.type)({
      z,
      columnName,
      tableName,
      definition,
   })

   if (definition.nullable) {
      schema = schema.nullable()
   }

   return schema
}

/**
 * Create Zod schema for field filters (direct value or operator object).
 */
function createFieldFilterSchema(tableName: string, columnName: string, definition: ColumnDefinition) {
   const base = createColumnValueSchema(tableName, columnName, definition)
   const operators = getDataTypeOperators(definition.type)

   const operatorShape: Record<string, z.ZodTypeAny> = {}
   for (const operator of operators) {
      const factory = SPECIAL_OPERATOR_FACTORIES[operator]
      operatorShape[operator] = (factory ? factory(base) : base).optional()
   }

   const operatorObject = z.object(operatorShape).strict().refine(
      value => Object.keys(value).length > 0,
      { message: 'At least one operator is required when using operator objects' },
   )

   return z.union([base, operatorObject])
}

/**
 * Get Zod validation schema for filter queries (WHERE clauses).
 * Results are cached for performance.
 */
export function getWhereValidation<S extends Schema, N extends TableNames<S>>(
   schema: S,
   tableName: N,
   stack: string[] = [],
): z.ZodTypeAny {
   const cacheKey = `filter:${tableName}`

   const selfRef = z.lazy(() => globalCache.useCache('filterSchema', cacheKey, () => z.object({}).strict()))
   if (stack.includes(cacheKey)) return selfRef

   return globalCache.useCache('filterSchema', cacheKey, () => {
      const nextStack = [...stack, cacheKey]
      const collection = getCollection(schema, tableName)
      const columns = getColumns(schema, collection, { includeBelongsTo: true })
      const relations = getRelations(collection)

      const shape: Record<string, z.ZodTypeAny> = {
         $and: z.array(selfRef).optional(),
         $or: z.array(selfRef).optional(),
      }

      for (const [columnName, definition] of Object.entries(columns)) {
         shape[columnName] = createFieldFilterSchema(tableName, columnName, definition).optional()
      }

      for (const [relationName, definition] of Object.entries(relations)) {
         shape[relationName] = (definition.table === tableName
            ? selfRef
            : z.lazy(() => getWhereValidation(schema, definition.table, nextStack))
         ).optional()
      }

      return z.object(shape).strict()
   })
}

/**
 * Check if a column is required (no nullable, default, auto-increment, or primary key).
 */
function isColumnRequired(col: ColumnDefinition) {
   return !col.nullable && col.default === undefined && !col.increments && !col.primary
}

/**
 * Payload schema options.
 */
export interface PayloadSchemaOptions {
   /**
    * When true (default), all fields are treated as optional to mirror {@link TableItemInput}.
    * Set to false to enforce required columns.
    */
   partial?: boolean
}

/**
 * Build Zod validation schema for payload data (create/update).
 * Results are cached for performance.
 */
function buildPayloadSchema<S extends Schema, N extends TableNames<S>>(
   schema: S,
   tableName: N,
   options: PayloadSchemaOptions = {},
   stack: string[] = [],
): z.ZodTypeAny {
   const partial = options.partial ?? true
   const cacheKey = `payload:${tableName}:${partial ? 'partial' : 'strict'}`

   const selfRef = z.lazy(() => globalCache.useCache('payloadSchema', cacheKey, () => z.object({}).strict()))
   if (stack.includes(cacheKey)) return selfRef

   return globalCache.useCache('payloadSchema', cacheKey, () => {
      const nextStack = [...stack, cacheKey]
      const collection = getCollection(schema, tableName)
      const columns = getColumns(schema, collection, { includeBelongsTo: true })
      const relations = getRelations(collection)

      const shape: Record<string, z.ZodTypeAny> = {}

      for (const [columnName, definition] of Object.entries(columns)) {
         const columnSchema = createColumnValueSchema(tableName, columnName, definition)
         shape[columnName] = (partial || !isColumnRequired(definition))
            ? columnSchema.optional()
            : columnSchema
      }

      for (const [relationName, definition] of Object.entries(relations)) {
         const relatedSchema = definition.table === tableName
            ? selfRef
            : z.lazy(() => buildPayloadSchema(schema, definition.table, options, nextStack))

         shape[relationName] = z.union([relatedSchema, z.array(relatedSchema)]).optional()
      }

      return z.object(shape).strict()
   })
}

/**
 * Collect all column paths recursively, including nested relations.
 */
function collectColumnPaths<S extends Schema>(schema: S, tableName: TableNames<S>, prefix = '', stack: string[] = []) {
   const collection = getCollection(schema, tableName)
   const columns = getColumns(schema, collection, { includeBelongsTo: true })
   const relations = getRelations(collection)
   const nextStack = [...stack, tableName]
   const paths: string[] = []

   for (const columnName of Object.keys(columns)) {
      paths.push(prefix ? `${prefix}.${columnName}` : columnName)
   }

   for (const [relationName, definition] of Object.entries(relations)) {
      if (nextStack.includes(definition.table)) continue
      const relationPrefix = prefix ? `${prefix}.${relationName}` : relationName
      const relationPaths = collectColumnPaths(schema, definition.table, relationPrefix, nextStack)
      paths.push(...relationPaths)
   }

   return Array.from(new Set(paths)).sort()
}

/**
 * Get all valid column paths for a table (cached for performance).
 */
function getColumnPaths<S extends Schema, N extends TableNames<S>>(schema: S, tableName: N) {
   const cacheKey = `columns:${tableName}`
   return globalCache.useCache('columnPaths', cacheKey, () => collectColumnPaths(schema, tableName))
}

/**
 * Create a column selection schema.
 */
function createColumnSelectionSchema<S extends Schema, N extends TableNames<S>>(schema: S, tableName: N) {
   const allowedPaths = new Set(getColumnPaths(schema, tableName))
   const allowedList = Array.from(allowedPaths).join(', ')
   return z.array(z.string()).superRefine((values, ctx) => {
      values.forEach((value, index) => {
         if (!allowedPaths.has(value)) {
            ctx.addIssue({
               code: 'custom',
               message: `Unknown column selection "${value}". Allowed columns: ${allowedList}`,
               path: [index],
            })
         }
      })
   }) as unknown as z.ZodType<FieldName<S, N>[]>
}

/**
 * Create an order by schema.
 */
function createOrderBySchema<S extends Schema, N extends TableNames<S>>(schema: S, tableName: N) {
   const allowedPaths = new Set(getColumnPaths(schema, tableName))
   const allowedList = Array.from(allowedPaths).join(', ')
   return z.array(z.string()).superRefine((values, ctx) => {
      values.forEach((value, index) => {
         const table = value.startsWith('-') ? value.slice(1) : value
         if (!allowedPaths.has(table)) {
            ctx.addIssue({
               code: 'custom',
               message: `Unknown orderBy table "${value}". Allowed columns: ${allowedList}`,
               path: [index],
            })
         }
      })
   })
}

/**
 * Create a collection name schema.
 */
export function getCollectionNameSchema<S extends Schema>(schema: S) {
   const collections = Object.keys(schema)
   return z.string().superRefine((value, ctx) => {
      if (!collections.includes(value)) {
         ctx.addIssue({
            code: 'custom',
            message: `Unknown collection "${value}"`,
         })
      }
   }) as z.ZodType<TableNames<S>>
}

/**
 * Validate a collection name.
 */
export function validateCollectionName<S extends Schema>(schema: S, tableName: unknown) {
   return getCollectionNameSchema(schema).parse(tableName)
}

/**
 * Create a query params schema.
 */
export function getQueryParamsSchema<S extends Schema, N extends TableNames<S>>(schema: S, tableName: N) {
   const columnsSchema = createColumnSelectionSchema(schema, tableName).optional()
   const whereSchema = getWhereValidation(schema, tableName)
   const orderBySchema = createOrderBySchema(schema, tableName).optional()

   return z.object({
      columns: columnsSchema,
      where: whereSchema.optional(),
      orderBy: orderBySchema,
      limit: z.number().int().positive().optional(),
      offset: z.number().int().min(0).optional(),
   }).strict() as z.ZodType<FindQueryParams<S, N>>
}

/**
 * Validate query params.
 */
export function validateQueryParams<S extends Schema, N extends TableNames<S>>(schema: S, tableName: N, params: unknown) {
   return getQueryParamsSchema(schema, tableName).parse(params ?? {})
}

/**
 * Create a payload schema.
 */
export function getPayloadSchema<S extends Schema, N extends TableNames<S>>(schema: S, tableName: N, options?: PayloadSchemaOptions) {
   return buildPayloadSchema(schema, tableName, options) as z.ZodType<TableItemInput<S, N>>
}

/**
 * Validate a payload.
 */
export function validatePayload<S extends Schema, N extends TableNames<S>>(schema: S, tableName: N, payload: unknown, options?: PayloadSchemaOptions) {
   return getPayloadSchema(schema, tableName, options).parse(payload)
}

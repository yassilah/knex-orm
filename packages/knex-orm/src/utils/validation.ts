import type { ColumnSelection, FindQueryParams } from '../types/query'
import type { ColumnDefinition, Schema, TableNames, TableRecordInput } from '../types/schema'
import type { Operator } from './operators'
import z from 'zod'
import { getDataTypeOperators, getDataTypeValidator } from '../data-types'
import { getCollection, getColumns, getRelations } from './collections'

const filterSchemaCache = new Map<string, z.ZodTypeAny>()
const payloadSchemaCache = new Map<string, z.ZodTypeAny>()
const columnPathCache = new Map<string, string[]>()

/**
 * Operator value factories.
 */
const OPERATOR_VALUE_FACTORIES: Partial<Record<Operator, (base: z.ZodTypeAny) => z.ZodTypeAny>> = {
   $eq: base => base,
   $neq: base => base,
   $gt: base => base,
   $gte: base => base,
   $lt: base => base,
   $lte: base => base,
   $contains: base => base,
   $ncontains: base => base,
   $startsWith: base => base,
   $nstartsWith: base => base,
   $endsWith: base => base,
   $nendsWith: base => base,
   $like: base => base,
   $nlike: base => base,
   $in: base => z.array(base),
   $nin: base => z.array(base),
   $between: base => z.tuple([base, base]),
   $nbetween: base => z.tuple([base, base]),
   $null: () => z.union([z.boolean(), z.undefined()]),
   $nnull: () => z.union([z.boolean(), z.undefined()]),
}

/**
 * Create a column value schema.
 */
function createColumnValueSchema(column: ColumnDefinition) {
   let schema = getDataTypeValidator(column.type)(column)

   if (column.nullable) {
      schema = schema.nullable()
   }

   return schema
}

/**
 * Create a field filter schema.
 */
function createFieldFilterSchema(column: ColumnDefinition) {
   const base = createColumnValueSchema(column)
   const operators = getDataTypeOperators(column.type)

   const operatorShape = operators.reduce<Record<string, z.ZodTypeAny>>((shape, operator) => {
      const factory = OPERATOR_VALUE_FACTORIES[operator]
      shape[operator] = (factory ? factory(base) : z.any()).optional()
      return shape
   }, {})

   const operatorObject = z.object(operatorShape).strict().refine(
      value => Object.keys(value).length > 0,
      { message: 'At least one operator is required when using operator objects' },
   )

   return z.union([base, operatorObject])
}

/**
 * Get a where validation schema.
 */
export function getWhereValidation<S extends Schema, N extends TableNames<S>>(schema: S, tableName: N, stack: string[] = []): z.ZodTypeAny {
   const cacheKey = `filter:${tableName}`
   const selfRef = z.lazy(() => filterSchemaCache.get(cacheKey) ?? z.object({}).strict())

   if (filterSchemaCache.has(cacheKey)) {
      return filterSchemaCache.get(cacheKey)!
   }

   if (stack.includes(cacheKey)) {
      return selfRef
   }

   const nextStack = [...stack, cacheKey]
   const collection = getCollection(schema, tableName)
   const columns = getColumns(collection, schema)
   const relations = getRelations(collection)

   const shape: Record<string, z.ZodTypeAny> = {}

   for (const [columnName, definition] of Object.entries(columns)) {
      shape[columnName] = createFieldFilterSchema(definition).optional()
   }

   for (const [relationName, definition] of Object.entries(relations)) {
      shape[relationName] = (definition.target === tableName
         ? selfRef
         : z.lazy(() => getWhereValidation(schema, definition.target, nextStack))
      ).optional()
   }

   const filterSchema = z.object({
      ...shape,
      $and: z.array(selfRef).optional(),
      $or: z.array(selfRef).optional(),
   }).strict()

   filterSchemaCache.set(cacheKey, filterSchema)
   return filterSchema
}

/**
 * Check if a column is required.
 */
function isColumnRequired(column: ColumnDefinition) {
   if (column.nullable) return false
   if (column.default !== undefined) return false
   if (column.increments) return false
   if (column.primary) return false
   return true
}

/**
 * Payload schema options.
 */
export interface PayloadSchemaOptions {
   /**
    * When true (default), all fields are treated as optional to mirror {@link TableRecordInput}.
    * Set to false to enforce required columns.
    */
   partial?: boolean
}

/**
 * Build a payload schema.
 */
function buildPayloadSchema<S extends Schema, N extends TableNames<S>>(schema: S, tableName: N, options: PayloadSchemaOptions = {}, stack: string[] = []): z.ZodTypeAny {
   const partial = options.partial ?? true
   const cacheKey = `payload:${tableName}:${partial ? 'partial' : 'strict'}`
   const selfRef = z.lazy(() => payloadSchemaCache.get(cacheKey) ?? z.object({}).strict())

   if (payloadSchemaCache.has(cacheKey)) {
      return payloadSchemaCache.get(cacheKey)!
   }

   if (stack.includes(cacheKey)) {
      return selfRef
   }

   const nextStack = [...stack, cacheKey]
   const collection = getCollection(schema, tableName)
   const columns = getColumns(collection, schema)
   const relations = getRelations(collection)

   const shape: Record<string, z.ZodTypeAny> = {}

   for (const [columnName, definition] of Object.entries(columns)) {
      const columnSchema = createColumnValueSchema(definition)
      shape[columnName] = partial || !isColumnRequired(definition)
         ? columnSchema.optional()
         : columnSchema
   }

   for (const [relationName, definition] of Object.entries(relations)) {
      const targetSchema = definition.target === tableName
         ? selfRef
         : z.lazy(() => buildPayloadSchema(schema, definition.target, options, nextStack))

      const relationSchema = z.union([
         targetSchema,
         z.array(targetSchema),
      ])

      shape[relationName] = relationSchema.optional()
   }

   const payloadSchema = z.object(shape).strict()

   payloadSchemaCache.set(cacheKey, payloadSchema)
   return payloadSchema
}

/**
 * Collect column paths.
 */
function collectColumnPaths<S extends Schema>(schema: S, tableName: TableNames<S>, prefix = '', stack: string[] = []) {
   const collection = getCollection(schema, tableName)
   const columns = getColumns(collection, schema)
   const relations = getRelations(collection)
   const nextStack = [...stack, tableName]
   const paths: string[] = []

   for (const columnName of Object.keys(columns)) {
      paths.push(prefix ? `${prefix}.${columnName}` : columnName)
   }

   for (const [relationName, definition] of Object.entries(relations)) {
      if (nextStack.includes(definition.target)) continue
      const relationPrefix = prefix ? `${prefix}.${relationName}` : relationName
      const relationPaths = collectColumnPaths(schema, definition.target, relationPrefix, nextStack)
      paths.push(...relationPaths)
   }

   return Array.from(new Set(paths)).sort()
}

/**
 * Get column paths.
 */
function getColumnPaths<S extends Schema, N extends TableNames<S>>(schema: S, tableName: N) {
   const cacheKey = `columns:${tableName}`
   if (columnPathCache.has(cacheKey)) {
      return columnPathCache.get(cacheKey)!
   }
   const paths = collectColumnPaths(schema, tableName)
   columnPathCache.set(cacheKey, paths)
   return paths
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
   }) as unknown as z.ZodType<ColumnSelection<S, N>>
}

/**
 * Create an order by schema.
 */
function createOrderBySchema<S extends Schema, N extends TableNames<S>>(schema: S, tableName: N) {
   const allowedPaths = new Set(getColumnPaths(schema, tableName))
   const allowedList = Array.from(allowedPaths).join(', ')
   return z.array(z.string()).superRefine((values, ctx) => {
      values.forEach((value, index) => {
         const target = value.startsWith('-') ? value.slice(1) : value
         if (!allowedPaths.has(target)) {
            ctx.addIssue({
               code: 'custom',
               message: `Unknown orderBy target "${value}". Allowed columns: ${allowedList}`,
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
   return buildPayloadSchema(schema, tableName, options) as z.ZodType<TableRecordInput<S, N>>
}

/**
 * Validate a payload.
 */
export function validatePayload<S extends Schema, N extends TableNames<S>>(schema: S, tableName: N, payload: unknown, options?: PayloadSchemaOptions) {
   return getPayloadSchema(schema, tableName, options).parse(payload)
}

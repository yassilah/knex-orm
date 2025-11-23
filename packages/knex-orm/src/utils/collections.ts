import type { DataTypes } from './data-types'
import type { ColumnDefinitionWithReferences } from './migrations'
import type { NormalizedCollectionDefinition, NormalizedFieldDefinition } from '@/types/collection'
import type { ColumnDefinition } from '@/types/columns'
import type { FieldDefinition } from '@/types/fields'
import type { BelongsToRelationDefinition, RelationDefinition } from '@/types/relations'
import type { CollectionDefinition, Schema, TableNames } from '@/types/schema'
import defu from 'defu'
import { globalCache } from './cache'
import { isBelongsTo } from './relations'

const RELATION_TYPES = new Set(['has-one', 'has-many', 'belongs-to', 'many-to-many'])
const DEFAULT_FIELD_OPTS = { nullable: true }
const DEFAULT_BELONGSTO_OPTS = { nullable: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' }

/**
 * Check if field is a column definition (not a relation).
 */
export function isColumn(field: FieldDefinition): field is ColumnDefinition {
   return !RELATION_TYPES.has(field.type)
}

/**
 * Check if field is a relation definition.
 */
export function isRelation(field: FieldDefinition): field is RelationDefinition {
   return RELATION_TYPES.has(field.type)
}

/**
 * Convert a belongs-to relation definition to a column definition with foreign key reference.
 */
function belongsToColumn(schema: Schema, field: BelongsToRelationDefinition) {
   const referencedField = schema[field.table][field.foreignKey]
   const referencedColumnDef = isColumn(referencedField) ? referencedField : null

   return {
      type: schema[field.table][field.foreignKey].type as DataTypes,
      nullable: field.nullable ?? true,
      unsigned: referencedColumnDef?.increments === true,
      references: {
         table: field.table,
         column: field.foreignKey,
         onDelete: field.onDelete,
         onUpdate: field.onUpdate,
      },
   } satisfies ColumnDefinitionWithReferences
}

/**
 * Extract all column definitions from a collection.
 * Results are cached for performance when includeBelongsTo is not false.
 */
export function getColumns(
   schema: Schema,
   collection: CollectionDefinition,
   options: { includeBelongsTo?: boolean } = {},
) {
   if (options.includeBelongsTo !== false) {
      return globalCache.useCache('columns', collection, () => {
         const result: Record<string, any> = {}
         for (const [key, field] of Object.entries(collection)) {
            if (isBelongsTo(field)) result[key] = belongsToColumn(schema, field)
            else if (isColumn(field)) result[key] = field
         }
         return result
      })
   }

   const result: Record<string, ColumnDefinition> = {}
   for (const [key, field] of Object.entries(collection)) {
      if (isColumn(field)) result[key] = field
   }
   return result
}

/**
 * Extract all relation definitions from a collection.
 * Results are cached for performance when includeBelongsTo is not false.
 */
export function getRelations(
   collection: CollectionDefinition,
   options: { includeBelongsTo?: boolean } = {},
) {
   if (options.includeBelongsTo !== false) {
      return globalCache.useCache('relations', collection, () => {
         const result: Record<string, any> = {}
         for (const [key, field] of Object.entries(collection)) {
            if (isRelation(field)) result[key] = field
         }
         return result
      })
   }

   const result: Record<string, RelationDefinition> = {}
   for (const [key, field] of Object.entries(collection)) {
      if (isRelation(field) && !isBelongsTo(field)) result[key] = field
   }
   return result
}

/**
 * Get a collection from a schema by table name.
 * Throws an error if the collection doesn't exist.
 */
export function getCollection<S extends Schema, N extends TableNames<S>>(schema: S, tableName: N) {
   const collection = schema[tableName]

   if (!collection) {
      throw new Error(`Unknown collection: ${tableName}`)
   }

   return collection
}

/**
 * Get the primary key column name from a collection.
 * Results are cached for performance.
 */
export function getPrimaryKey(collection: CollectionDefinition): string {
   return globalCache.useCache('primaryKey', collection, () => {
      for (const [key, def] of Object.entries(collection)) {
         if (isColumn(def) && def.primary === true) {
            return key
         }
      }
      throw new Error('No primary key column was found')
   })
}

/**
 * Normalize a field definition by applying default values.
 */
export function normalizeField<const F extends FieldDefinition>(field: F) {
   return defu(field, isBelongsTo(field) ? DEFAULT_BELONGSTO_OPTS : DEFAULT_FIELD_OPTS) as unknown as NormalizedFieldDefinition<F>
}

/**
 * Normalize all fields in a collection definition by applying defaults.
 */
export function normalizeCollection<const C extends CollectionDefinition>(collection: C) {
   const result: Record<string, any> = {}
   for (const [key, value] of Object.entries(collection)) {
      result[key] = normalizeField(value)
   }
   return result
}

/**
 * Define a collection with normalized field definitions.
 */
export function defineCollection<const C extends CollectionDefinition>(input: C) {
   return normalizeCollection(input) as NormalizedCollectionDefinition<C>
}

/**
 * Add an auto-incremented integer primary key column.
 */
export function withId<const C extends CollectionDefinition>(collection: C) {
   return {
      ...collection,
      id: { type: 'integer', primary: true, increments: true, nullable: false },
   } as const
}

/**
 * Add created_at and updated_at timestamp columns.
 */
export function withTimestamps<const C extends CollectionDefinition>(collection: C) {
   return {
      ...collection,
      created_at: { type: 'timestamp', nullable: false, default: '{now}' },
      updated_at: { type: 'timestamp', nullable: false, default: '{now}' },
   } as const
}

/**
 * Add a UUID primary key column.
 */
export function withUuid<const C extends CollectionDefinition>(collection: C) {
   return {
      ...collection,
      id: { type: 'uuid', default: '{uuid}', primary: true, nullable: false },
   } as const
}

/**
 * Combine withId and withTimestamps.
 */
export function withDefaults<const C extends CollectionDefinition>(collection: C) {
   return withTimestamps(withId(collection))
}

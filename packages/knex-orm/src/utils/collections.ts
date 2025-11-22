import type { DataTypes } from './data-types'
import type { ColumnDefinitionWithReferences } from './migrations'
import type { NormalizedCollectionDefinition, NormalizedFieldDefinition } from '@/types/collection'
import type { ColumnDefinition } from '@/types/columns'
import type { FieldDefinition } from '@/types/fields'
import type { BelongsToRelationDefinition, RelationDefinition } from '@/types/relations'
import type { CollectionDefinition, Schema, TableNames } from '@/types/schema'
import defu from 'defu'
import { isBelongsTo } from './relations'

const relationTypes = ['has-one', 'has-many', 'belongs-to', 'many-to-many']

/**
 * Type guard to check if a field is a column definition
 */
export function isColumn(field: FieldDefinition): field is ColumnDefinition {
   return !isRelation(field)
}

/**
 * Type guard to check if a field is a relation definition
 */
export function isRelation(field: FieldDefinition): field is RelationDefinition {
   return relationTypes.includes(field.type)
}

/**
 * Get belongsTo relation from a collection definition
 */
function belongsToColumn(schema: Schema, field: BelongsToRelationDefinition) {
   return {
      type: schema[field.table][field.foreignKey].type as DataTypes,
      nullable: field.nullable ?? true,
      references: {
         table: field.table,
         column: field.foreignKey,
         onDelete: field.onDelete,
         onUpdate: field.onUpdate,
      },
   } satisfies ColumnDefinitionWithReferences
}

/**
 * Extract columns from a collection definition.
 */
export function getColumns(schema: Schema, collection: CollectionDefinition, options: { includeBelongsTo?: boolean } = {}) {
   const fields = Object.entries(collection).filter(([_, field]) =>
      options.includeBelongsTo ? isBelongsTo(field) || isColumn(field) : isColumn(field),
   )

   return Object.fromEntries(fields.map(([key, field]) => [
      key,
      isBelongsTo(field) ? belongsToColumn(schema, field) : field as ColumnDefinition,
   ]))
}

/**
 * Extract relations from a collection definition.
 */
export function getRelations(collection: CollectionDefinition, options: { includeBelongsTo?: boolean } = {}) {
   const fields = Object.entries(collection).filter(([_, field]) =>
      options.includeBelongsTo ? isRelation(field) : isRelation(field) && !isBelongsTo(field),
   )
   return Object.fromEntries(fields.map(([key, field]) => [key, field as RelationDefinition]))
}

/**
 * Get a collection from a schema by table name.
 */
export function getCollection<S extends Schema, N extends TableNames<S>>(schema: S, tableName: N) {
   const collection = schema[tableName]

   if (!collection) {
      throw new Error(`Unknown collection: ${tableName}`)
   }

   return collection
}

/**
 * Get the primary key column name from a collection definition.
 */
export function getPrimaryKey(collection: CollectionDefinition) {
   const primaryKey = Object.entries(collection).find(([, def]) => isColumn(def) && def.primary === true)
   if (!primaryKey) {
      throw new Error('No primary key column was found')
   }
   return primaryKey[0]
}

/**
 * Normalize a field definition.
 */
export function normalizeField<const F extends FieldDefinition>(field: F) {
   if (isBelongsTo(field)) {
      return defu(field, {
         nullable: true,
         onDelete: 'CASCADE',
         onUpdate: 'CASCADE',
      }) as NormalizedFieldDefinition<F>
   }

   return defu(field, {
      nullable: true,
   }) as NormalizedFieldDefinition<F>
}

/**
 * Normalize a collection definition.
 */
export function normalizeCollection<const C extends CollectionDefinition>(collection: C) {
   return Object.fromEntries(Object.entries(collection).map(([key, value]) => [key, normalizeField(value)]))
}

/**
 * Define a collection.
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

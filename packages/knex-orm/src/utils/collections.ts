import type { CollectionDefinition, Schema, TableNames } from '../types/schema'

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
 * Gets the primary key column name from a collection definition
 */
export function getPrimaryKey(collection: CollectionDefinition) {
   const columns = collection.columns

   const explicit = Object.entries(columns).find(([, def]) => def.primary === true)

   if (!explicit) {
      throw new Error(`No primary key column was found`)
   }

   return explicit[0]
}

/**
 * Define a collection.
 */
export function defineCollection<const I extends CollectionDefinition>(input: I) {
   return input
}

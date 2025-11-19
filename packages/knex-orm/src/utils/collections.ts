import type { BelongsToRelationDefinition, CollectionDefinition, ColumnDefinition, FieldDefinition, RelationDefinition, Schema, TableNames } from '../types/schema'

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
   const relationTypes = ['hasOne', 'hasMany', 'belongsTo', 'manyToMany']
   return 'type' in field && relationTypes.includes(field.type as string)
}

/**
 * Extract columns from a collection definition
 * belongsTo relations are treated as columns (the relation name IS the column name)
 */
export function getColumns<S extends Schema>(collection: CollectionDefinition, schema?: S): Record<string, ColumnDefinition> {
   const columns: Record<string, ColumnDefinition> = {}

   for (const [key, field] of Object.entries(collection)) {
      if (isColumn(field)) {
         // Regular column
         columns[key] = field
      }
      else if (isRelation(field) && field.type === 'belongsTo') {
         // belongsTo relation IS a column - use the relation name as column name
         const belongsTo = field as BelongsToRelationDefinition

         if (schema) {
            const targetTable = schema[belongsTo.target]
            if (targetTable) {
               // Get the target table's primary key column definition
               const targetColumns = getColumns(targetTable, schema)
               const targetPkColumn = Object.entries(targetColumns).find(([, def]) => def.primary === true)

               if (targetPkColumn) {
                  const [, pkDef] = targetPkColumn
                  // Create a foreign key column based on the target's primary key
                  columns[key] = {
                     type: pkDef.type,
                     nullable: pkDef.nullable ?? true,
                     references: {
                        table: belongsTo.target,
                        column: belongsTo.foreignKey,
                        onDelete: 'CASCADE',
                     },
                  }
               }
            }
         }
      }
   }

   return columns
}

/**
 * Extract relations from a collection definition
 * Excludes belongsTo relations (since they are columns)
 */
export function getRelations(collection: CollectionDefinition): Record<string, RelationDefinition> {
   const relations: Record<string, RelationDefinition> = {}
   for (const [key, field] of Object.entries(collection)) {
      if (isRelation(field) && field.type !== 'belongsTo') {
         relations[key] = field
      }
   }
   return relations
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
 * Gets the primary key column name from a collection definition
 */
export function getPrimaryKey(collection: CollectionDefinition) {
   const columns = getColumns(collection)

   const primaryKey = Object.entries(columns).find(([, def]) => def.primary === true)

   if (!primaryKey) {
      throw new Error(`No primary key column was found`)
   }

   return primaryKey[0]
}

/**
 * Define a collection.
 */
export function defineCollection<const I extends CollectionDefinition>(input: I) {
   return input
}

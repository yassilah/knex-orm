import type { InferColumnType } from './columns'
import type { BaseFieldDefinition, FieldName } from './fields'
import type { Schema, TableItem, TableNames } from './schema'

type RelationKind = 'has-one' | 'has-many' | 'belongs-to' | 'many-to-many'

type RelationAction = 'CASCADE' | 'RESTRICT' | 'NO ACTION' | 'SET NULL' | 'SET DEFAULT'

interface BaseRelationDefinition extends BaseFieldDefinition {
   table: string
   foreignKey: string
   onDelete?: RelationAction
   onUpdate?: RelationAction
}

export interface HasOneRelationDefinition extends BaseRelationDefinition {
   type: 'has-one'
}

export interface HasManyRelationDefinition extends BaseRelationDefinition {
   type: 'has-many'
}

export interface BelongsToRelationDefinition extends BaseRelationDefinition {
   type: 'belongs-to'
}

export interface ManyToManyRelationDefinition extends BaseRelationDefinition {
   type: 'many-to-many'
   through: {
      table: string
      sourceFk: string
      tableFk: string
   }
}

export type RelationDefinition = HasOneRelationDefinition | HasManyRelationDefinition | BelongsToRelationDefinition | ManyToManyRelationDefinition

/** Extract relation field names from table */
export type TableRelationNames<S extends Schema, T extends TableNames<S>>
   = { [K in keyof S[T]]: S[T][K] extends RelationDefinition ? K : never }[keyof S[T]] & string

/** Get relation definition by name */
export type TableRelation<S extends Schema, T extends TableNames<S>, K extends TableRelationNames<S, T>>
   = S[T][K] extends RelationDefinition ? S[T][K] : never

/** Recursively resolve foreign key column through relations */
export type RelationForeignKeyColumn<S extends Schema, T extends RelationDefinition>
   = S[T['table']][T['foreignKey']] extends infer U
      ? U extends RelationDefinition ? RelationForeignKeyColumn<S, U> : U
      : never

/** Infer relation type based on relation kind */
export type InferRelationType<S extends Schema, T extends RelationDefinition>
   = T['table'] extends TableNames<S>
      ? T['type'] extends 'has-one' | 'belongs-to'
         ? TableItem<S, T['table']> | InferColumnType<RelationForeignKeyColumn<S, T>, T['nullable']>
         : T['type'] extends 'has-many' | 'many-to-many'
            ? TableItem<S, T['table']>[] | NonNullable<InferColumnType<RelationForeignKeyColumn<S, T>>>[]
            : never
      : never

/** Generate nested field names for relations (e.g., "posts.title") */
export type RelatedFieldName<S extends Schema, T extends TableNames<S>, RootTable = T, Placeholder = true>
   = TableRelationNames<S, T> extends infer Names
      ? { [K in Names]: TableRelation<S, T, K> extends infer TR
            ? TR['table'] extends RootTable
               ? never
               : `${K}.${FieldName<S, TR['table'], true, T, Placeholder>}`
                  | (TR extends { type: 'has-one' | 'belongs-to' } ? K : never)
            : never
         }[Names]
      : never

/** Extract table name from relation */
export type RelationtableTable<S extends Schema, N extends TableNames<S>, K extends TableRelationNames<S, N>>
   = TableRelation<S, N, K>['table'] & TableNames<S>

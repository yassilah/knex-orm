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

export type TableRelationNames<S extends Schema, T extends TableNames<S>> = {
   [K in keyof S[T]]: S[T][K] extends RelationDefinition ? K : never
}[keyof S[T]] & string

export type TableRelation<S extends Schema, T extends TableNames<S>, K extends TableRelationNames<S, T>> = S[T][K] extends infer TRelation extends RelationDefinition ? TRelation : never

export type RelationForeignKeyColumn<S extends Schema, T extends RelationDefinition>
   = S[T['table']][T['foreignKey']] extends infer U
      ? U extends RelationDefinition
         ? RelationForeignKeyColumn<S, U>
         : U
      : never

type InferSingleRelationType<S extends Schema, T extends RelationDefinition> = T['table'] extends infer U extends TableNames<S>
   ? TableItem<S, U> | InferColumnType<RelationForeignKeyColumn<S, T>, T['nullable']>
   : never

type InferMultipleRelationType<S extends Schema, T extends RelationDefinition> = T['table'] extends infer U extends TableNames<S>
   ? TableItem<S, U>[] | NonNullable<InferColumnType<RelationForeignKeyColumn<S, T>>>[]
   : never

export type InferRelationType<S extends Schema, T extends RelationDefinition>
   = T['type'] extends 'has-one' | 'belongs-to'
      ? InferSingleRelationType<S, T>
      : T['type'] extends 'has-many' | 'many-to-many'
         ? InferMultipleRelationType<S, T>
         : never

export type RelatedFieldName<S extends Schema, T extends TableNames<S>, RootTable = T, Placeholder = true>
   = TableRelationNames<S, T> extends infer Names ? {
      [K in Names]: TableRelation<S, T, K> extends infer TR
         ? TR['table'] extends RootTable ? never
            : `${K}.${FieldName<S, TR['table'], true, T, Placeholder>}` | (TR extends { type: 'has-one' | 'belongs-to' } ? K : never)
         : never
   }[Names] : never

export type RelationtableTable<S extends Schema, N extends TableNames<S>, K extends TableRelationNames<S, N>> = TableRelation<S, N, K>['table'] extends TableNames<S>
   ? TableRelation<S, N, K>['table'] extends infer T extends TableNames<S> ? T : never
   : never

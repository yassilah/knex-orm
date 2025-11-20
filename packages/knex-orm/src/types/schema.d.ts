import type { DataType, DataTypes } from '../utils/data-types'
import type { DeepPartial, Prettify } from './helpers'

export interface BaseFieldDefinition {
   unique?: boolean
   nullable?: boolean
   default?: unknown
   precision?: number
   scale?: number
   length?: number
   options?: string[]
   increments?: boolean
   references?: {
      table: string
      column: string
      onDelete?: RelationAction
      onUpdate?: RelationAction
   }
}

export type RelationAction = 'CASCADE' | 'RESTRICT' | 'NO ACTION' | 'SET NULL' | 'SET DEFAULT'

export interface ColumnDefinition extends BaseFieldDefinition {
   type: DataTypes
   primary?: boolean
}

export type InferColumnType<T extends ColumnDefinition> = T['nullable'] extends true
   ? DataType<T['type']> | null
   : DataType<T['type']>

export type RelationKind = 'has-one' | 'has-many' | 'belongs-to' | 'many-to-many'

export interface BaseRelationDefinition extends BaseFieldDefinition {
   type: RelationKind
   target: string
   foreignKey: string
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
      targetFk: string
   }
}

export type RelationDefinition = BaseRelationDefinition | ManyToManyRelationDefinition

export type FieldDefinition = ColumnDefinition | RelationDefinition

export type CollectionDefinition = Record<string, FieldDefinition>

export type Schema = Record<string, CollectionDefinition>

export type TableNames<S extends Schema> = keyof S & string

// belongs-to relations are columns - the relation name IS the column name
export type TableColumnNames<S extends Schema, T extends TableNames<S>> = {
   [K in keyof S[T]]: S[T][K] extends ColumnDefinition | BelongsToRelationDefinition ? K : never
}[keyof S[T]] & string

// Relations exclude belongs-to (since belongs-to is a column)
export type TableRelationNames<S extends Schema, T extends TableNames<S>> = {
   [K in keyof S[T]]: S[T][K] extends RelationDefinition
      ? S[T][K] extends BelongsToRelationDefinition
         ? never
         : K
      : never
}[keyof S[T]] & string

export type TableColumn<
   S extends Schema,
   T extends TableNames<S>,
   K extends TableColumnNames<S, T>,
> = K extends keyof S[T]
   ? S[T][K] extends ColumnDefinition
      ? S[T][K]
      : S[T][K] extends BelongsToRelationDefinition
         ? S[T][K]['target'] extends TableNames<S>
            ? S[T][K]['foreignKey'] extends keyof S[S[T][K]['target']]
               ? S[S[T][K]['target']][S[T][K]['foreignKey']] extends ColumnDefinition
                  ? S[S[T][K]['target']][S[T][K]['foreignKey']]
                  : never
               : never
            : never
         : never
   : never

export type TableColumns<S extends Schema, T extends TableNames<S>> = {
   [K in TableColumnNames<S, T>]: TableColumn<S, T, K>
}

export type TableRelation<
   S extends Schema,
   T extends TableNames<S>,
   K extends TableRelationNames<S, T>,
> = S[T][K] extends infer TRelation extends RelationDefinition ? TRelation : never

export type TableRelations<S extends Schema, T extends TableNames<S>> = {
   [K in TableRelationNames<S, T>]: TableRelation<S, T, K>
}

export type RelationForeignKeyColumn<
   S extends Schema,
   T extends RelationDefinition,
> = T['target'] extends TableNames<S>
   ? T['foreignKey'] extends keyof S[T['target']]
      ? S[T['target']][T['foreignKey']] extends ColumnDefinition
         ? S[T['target']][T['foreignKey']]
         : never
      : never
   : never

export type InferRecordFromColumns<TColumns extends Record<string, ColumnDefinition>> = {
   [K in keyof TColumns]: InferColumnType<TColumns[K]>
}

export type InferRelationType<
   S extends Schema,
   T extends RelationDefinition,
> = T['type'] extends 'has-one' | 'belongs-to'
   ? TableRecord<S, T['target']> | InferColumnType<RelationForeignKeyColumn<S, T>>
   : T['type'] extends 'has-many' | 'many-to-many'
      ? InferColumnType<RelationForeignKeyColumn<S, T>>[] | TableRecord<S, T['target']>[]
      : never

export type TableRecord<
   S extends Schema,
   T extends TableNames<S>,
> = Prettify<{
   [K in TableColumnNames<S, T>]: InferColumnType<TableColumn<S, T, K>>
} & {
   [K in TableRelationNames<S, T>]: InferRelationType<S, TableRelation<S, T, K>>
}>

export type TableRecordInput<S extends Schema, N extends TableNames<S>> = Prettify<DeepPartial<TableRecord<S, N>>>

type TablePrimaryKeyNameInternal<
   S extends Schema,
   N extends TableNames<S>,
> = {
   [K in TableColumnNames<S, N>]: TableColumn<S, N, K>['primary'] extends true ? K : never
}[TableColumnNames<S, N>]

export type TablePrimaryKeyName<S extends Schema, N extends TableNames<S>> = TablePrimaryKeyNameInternal<S, N> extends never
   ? TableColumnNames<S, N>
   : TablePrimaryKeyNameInternal<S, N>

export type TablePrimaryKeyValue<
   S extends Schema,
   N extends TableNames<S>,
> = TablePrimaryKeyName<S, N> extends infer PK extends TableColumnNames<S, N>
   ? InferColumnType<TableColumn<S, N, PK>>
   : never

/* eslint-disable ts/no-empty-object-type */
import type { NormalizedCollectionDefinition } from './collection'
import type { InferColumnType, TableColumn, TableColumnNames } from './columns'
import type { FieldDefinition } from './fields'
import type { DeepPartial, Prettify } from './helpers'
import type { BelongsToRelationDefinition, InferRelationType, RelationForeignKeyColumn, TableRelation, TableRelationNames } from './relations'

export type CollectionDefinition = Record<string, FieldDefinition>

export type Schema = Record<string, CollectionDefinition>

export type TableNames<S extends Schema> = keyof S & string

/** Table row type with optional deep relation expansion */
export type TableItem<S extends Schema, T extends TableNames<S>, Deep = true> = Prettify<
   {
      [K in TableColumnNames<S, T, Deep extends true ? false : true>]: S[T][K] extends infer U
         ? U extends BelongsToRelationDefinition
            ? InferColumnType<RelationForeignKeyColumn<S, U>, U['nullable']>
            : U extends ColumnDefinition
               ? InferColumnType<U>
               : never
         : never
   } & (Deep extends true ? { [K in TableRelationNames<S, T>]: InferRelationType<S, TableRelation<S, T, K>> } : {})
>

export type TableItemInput<S extends Schema, N extends TableNames<S>> = Prettify<DeepPartial<TableItem<S, N>>>

/** Extract primary key column name */
export type TablePrimaryKeyName<S extends Schema, N extends TableNames<S>>
   = { [K in TableColumnNames<S, N>]: TableColumn<S, N, K>['primary'] extends true ? K : never }[TableColumnNames<S, N>]

/** Infer primary key value type */
export type TablePrimaryKeyValue<S extends Schema, N extends TableNames<S>>
   = TablePrimaryKeyName<S, N> extends infer PK extends TableColumnNames<S, N>
      ? InferColumnType<TableColumn<S, N, PK>>
      : never

export type NormalizedSchemaDefinition<S extends Schema> = Prettify<{
   [K in keyof S]: NormalizedCollectionDefinition<S[K]>
}>

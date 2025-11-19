import type { DeepPartial, Prettify } from './helpers'

export type ColumnDataType
   = | 'string'
      | 'text'
      | 'integer'
      | 'bigint'
      | 'float'
      | 'decimal'
      | 'boolean'
      | 'date'
      | 'datetime'
      | 'json'
      | 'uuid'

export interface ColumnDefinition {
   type: ColumnDataType
   primary?: boolean
   nullable?: boolean
   unique?: boolean
   defaultTo?: unknown
   increments?: boolean
   references?: { table: string, column: string, onDelete?: string }
}

export type ColumnTypeToTS<T extends ColumnDataType>
   = T extends 'string' | 'text' | 'uuid'
      ? string
      : T extends 'integer' | 'bigint' | 'float' | 'decimal'
         ? number
         : T extends 'boolean'
            ? boolean
            : T extends 'date' | 'datetime'
               ? string
               : T extends 'json'
                  ? unknown
                  : unknown

export type InferColumnType<T extends ColumnDefinition> = T['nullable'] extends true
   ? ColumnTypeToTS<T['type']> | null
   : ColumnTypeToTS<T['type']>

export type RelationKind = 'hasOne' | 'hasMany' | 'belongsTo' | 'manyToMany'

export interface BaseRelationDefinition {
   type: RelationKind
   target: string
   localKey?: string
   foreignKey: string
}

export interface HasOneRelationDefinition extends BaseRelationDefinition {
   type: 'hasOne'
}

export interface HasManyRelationDefinition extends BaseRelationDefinition {
   type: 'hasMany'
}

export interface BelongsToRelationDefinition extends BaseRelationDefinition {
   type: 'belongsTo'
}

export interface ManyToManyRelationDefinition extends BaseRelationDefinition {
   type: 'manyToMany'
   through: {
      table: string
      sourceFk: string
      targetFk: string
   }
}

export type RelationDefinition = BaseRelationDefinition | ManyToManyRelationDefinition

export interface IndexDefinition {
   columns: string[]
   unique?: boolean
   name?: string
}

export interface CollectionDefinition {
   columns: Record<string, ColumnDefinition>
   relations?: Record<string, RelationDefinition>
   indexes?: IndexDefinition[]
   timestamps?: boolean
}

export type Schema = Record<string, CollectionDefinition>

export type TableNames<S extends Schema> = keyof S & string

export type TableColumns<S extends Schema, T extends TableNames<S>> = S[T]['columns']
export type TableColumnNames<S extends Schema, T extends TableNames<S>> = keyof S[T]['columns'] & string
export type TableColumn<
   S extends Schema,
   T extends TableNames<S>,
   K extends TableColumnNames<S, T>,
> = S[T]['columns'][K] extends infer TColumn extends ColumnDefinition ? TColumn : never

export type TableRelations<S extends Schema, T extends TableNames<S>> = S[T]['relations']
export type TableRelationNames<S extends Schema, T extends TableNames<S>> = keyof S[T]['relations'] & string
export type TableRelation<
   S extends Schema,
   T extends TableNames<S>,
   K extends TableRelationNames<S, T>,
> = S[T]['relations'][K] extends infer TRelation extends RelationDefinition ? TRelation : never

export type RelationForeignKeyColumn<
   S extends Schema,
   T extends RelationDefinition,
> = S[T['target']]['columns'][T['foreignKey']]

export type InferRecordFromColumns<TColumns extends Record<string, ColumnDefinition>> = {
   [K in keyof TColumns]: InferColumnType<TColumns[K]>
}

export type InferRelationType<
   S extends Schema,
   T extends RelationDefinition,
> = T['type'] extends 'hasOne' | 'belongsTo'
   ? TableRecord<S, T['target']> | InferColumnType<RelationForeignKeyColumn<S, T>>
   : T['type'] extends 'hasMany' | 'manyToMany'
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

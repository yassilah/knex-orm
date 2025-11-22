import type { InferColumnType } from './columns'
import type { FieldName } from './fields'
import type { PickTableItemDotNotation, Prettify } from './helpers'
import type { RelationtableTable, TableRelationNames } from './relations'
import type { Schema, TableItem, TableNames } from './schema'
import type { DataType } from '@/utils/data-types'
import type { InferOperatorExpectedValue, Operator } from '@/utils/operators'

export interface FindQueryParams<S extends Schema, N extends TableNames<S>, C extends FieldName<S, N>[] = []> {
   columns?: C
   where?: FilterQuery<S, N>
   orderBy?: `${'' | '-'}${FieldName<S, T, T, false>}`[]
   limit?: number
   offset?: number
}

type FieldFilter<T extends DataType = DataType> = T | {
   [K in Operator]?: InferOperatorExpectedValue<K, T>
}

type FieldFilterType<S extends Schema, N extends TableNames<S>, K extends keyof TableItem<S, N>> = K extends infer U extends TableRelationNames<S, N>
   ? FilterQuery<S, RelationtableTable<S, N, U>>
   : FieldFilter<InferColumnType<S[N][K]>>

export type FilterQuery<S extends Schema, N extends TableNames<S>> = {
   [K in keyof TableItem<S, N>]?: FieldFilterType<S, N, K>
} & {
   $and?: FilterQuery<S, N>[]
   $or?: FilterQuery<S, N>[]
}

export type QueryResult<S extends Schema, N extends TableNames<S>, C extends FieldName<S, N>[] = []> = C extends []
   ? Prettify<TableItem<S, N, false>>[]
   : Prettify<PickTableItemDotNotation<S, N, C>>[]

export type QueryResultItem<S extends Schema, N extends TableNames<S>, C extends FieldName<S, N>[] = []> = QueryResult<S, N, C> extends (infer U)[] ? U | undefined : never

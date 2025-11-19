/* eslint-disable ts/no-empty-object-type */
import type { Operator } from '../utils/operators'
import type { Prettify } from './helpers'
import type { Schema, TableNames, TableRecord } from './schema'

export type Primitive = string | number | boolean | Date | null | undefined

export type FieldFilter = | Primitive
   | {
      [K in Operator]?: Primitive | Primitive[];
   }

export type FilterQuery<S extends Schema, N extends TableNames<S>> = TableRecord<S, N> extends infer TRecord ? {
   [K in keyof TRecord]?: FieldFilter;
} & {
   $and?: FilterQuery<TRecord>[]
   $or?: FilterQuery<TRecord>[]
}
   : never

type OrderByToken<TRecord extends Record<string, unknown>> = ColumnPath<TRecord> | `-${ColumnPath<TRecord>}`

export type OrderByInput<S extends Schema, N extends TableNames<S>> = readonly OrderByToken<TableRecord<S, N>>[]

type ExtractRecord<T> = Extract<T, Record<string, unknown>>
type ExtractArrayRecord<T> = T extends (infer U)[] ? ExtractRecord<U> : never

type ColumnPathInternal<T, Prefix extends string = ''> = T extends Record<string, unknown>
   ? {
         [K in keyof T & string]:
         T[K] extends (infer _U)[] ? `${Prefix}${K}`
         | (ExtractArrayRecord<T[K]> extends never ? never : ColumnPathInternal<ExtractArrayRecord<T[K]>, `${Prefix}${K}.`>)
            : ExtractRecord<T[K]> extends never
               ? `${Prefix}${K}`
               : `${Prefix}${K}` | ColumnPathInternal<ExtractRecord<T[K]>, `${Prefix}${K}.`>
      }[keyof T & string]
   : never

export type ColumnPath<TRecord extends Record<string, unknown>> = ColumnPathInternal<TRecord> & string

export type ColumnSelection<S extends Schema, N extends TableNames<S>> = ColumnPath<TableRecord<S, N>>[]

type SelectionObject<TRecord extends Record<string, unknown>, Path extends string>
   = Path extends `${infer Key}.${infer Rest}`
      ? Key extends keyof TRecord & string
         ? TRecord[Key] extends (infer _U)[]
            ? ExtractArrayRecord<TRecord[Key]> extends never
               ? { [K in Key]: TRecord[Key] }
               : { [K in Key]: SelectionArray<ExtractArrayRecord<TRecord[Key]>, Rest> }
            : ExtractRecord<TRecord[Key]> extends never
               ? { [K in Key]: TRecord[Key] }
               : { [K in Key]: SelectionObject<ExtractRecord<TRecord[Key]>, Rest> }
         : {}
      : Path extends keyof TRecord & string
         ? { [K in Path]: TRecord[Path] }
         : {}

type SelectionArray<TItem extends Record<string, unknown>, Path extends string>
   = Array<SelectionValue<TItem, Path>>

type SelectionValue<TRecord extends Record<string, unknown>, Path extends string>
   = SelectionObject<TRecord, Path>

type SelectionFromColumns<TRecord extends Record<string, unknown>, Columns extends readonly string[]>
   = Columns extends readonly [infer Head extends string, ...infer Tail extends readonly string[]]
      ? Prettify<SelectionObject<TRecord, Head> & SelectionFromColumns<TRecord, Tail>>
      : {}

export type ColumnSelectionResult<
   TRecord extends Record<string, unknown>,
   Columns extends readonly string[] | undefined,
> = Columns extends readonly string[]
   ? Prettify<SelectionFromColumns<TRecord, Columns>>
   : Prettify<TRecord>

export interface FindQueryParams<
   S extends Schema,
   N extends TableNames<S>,
   Columns extends ColumnSelection<S, N> | undefined = undefined,
> {
   columns?: Columns
   where?: FilterQuery<S, N>
   orderBy?: OrderByInput<S, N>
   limit?: number
   offset?: number
}

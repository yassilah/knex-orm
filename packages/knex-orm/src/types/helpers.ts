import type { TableRelation, TableRelationNames } from './relations'
import type { Schema, TableNames } from './schema'

export type Prettify<T> = T extends object ? ({
   -readonly [K in keyof T]: T[K] extends object
      ? Prettify<T[K]>
      : T[K]
} & {}) : T

export type Merge<T, U> = {
   [K in keyof T | keyof U]: K extends keyof T ? T[K] : K extends keyof U ? U[K] : never
}

type DeepPartialUnion<T> = T extends any
   ? T extends (infer U)[]
      ? U extends object
         ? Prettify<DeepPartial<U>>[]
         : U[]
      : T extends object
         ? Prettify<DeepPartial<T>>
         : T
   : never

export type DeepPartial<T> = {
   [P in keyof T]?: T[P] extends (infer U)[]
      ? U extends object
         ? Prettify<DeepPartial<U>>[]
         : U[]
      : T[P] extends object
         ? Prettify<DeepPartial<T[P]>>
         : DeepPartialUnion<T[P]>
}

type BuildTuple<N extends number, T extends unknown[] = []> = T['length'] extends N
   ? T
   : BuildTuple<N, [...T, unknown]>

type RepeatString<S extends string, T extends unknown[], Sepator extends string = '', Acc extends string = ''>
   = T extends [unknown, ...infer Rest]
      ? RepeatString<S, Rest, Sepator, Acc extends '' ? S : Acc | `${Acc}${Sepator}${S}`>
      : Acc

type UnionToIntersection<U>
   = (U extends any ? (x: U) => any : never) extends (x: infer I) => any ? I : never

type LastOf<U>
   = UnionToIntersection<U extends any ? () => U : never> extends () => infer R ? R : never

type UnionToTuple<U, L = LastOf<U>>
   = [U] extends [never] ? [] : [...UnionToTuple<Exclude<U, L>>, L]

type MaxRelationDepthObject<S extends Schema, T extends TableNames<S>, RootTable extends TableNames<S> = T, Tuple extends unknown[] = []>
   = TableRelationNames<S, T> extends infer Names extends string
      ? Exclude<TableRelation<S, T, Names & TableRelationNames<S, T>>['table'], T | RootTable> extends infer TRT extends TableNames<S>
         ? UnionToTuple<TRT> extends []
            ? Tuple['length']
            : { [K in TRT]: MaxRelationDepth<S, K, T | RootTable, [...Tuple, 1]> }
         : Tuple['length']
      : Tuple['length']

type ExtractMaxRelationDepth<T> = T extends object ? ExtractMaxRelationDepth<T[keyof T]> : T

type GreaterThan<A extends number, B extends number> = BuildTuple<A> extends [...BuildTuple<B>, ...infer _Rest] ? true : false

type MaxTuple<T extends number[], Current extends number = 0>
   = T extends [infer H extends number, ...infer R extends number[]]
      ? MaxTuple<R, GreaterThan<H, Current> extends true ? H : Current>
      : Current

type Max<U extends number> = MaxTuple<UnionToTuple<U> extends infer U extends number[] ? U : []>

type MaxRelationDepth<
   S extends Schema,
   T extends TableNames<S>,
   RootTable extends TableNames<S> = T,
   Tuple extends unknown[] = [],
> = Max<ExtractMaxRelationDepth<MaxRelationDepthObject<S, T, RootTable, Tuple>> extends infer U extends number ? U : 0>

export type GenerateNestedWildcards<S extends Schema, T extends TableNames<S>, RootTable extends TableNames<S> = T> = RepeatString<'*', BuildTuple<MaxRelationDepth<S, T, RootTable, [1]>>, '.'>

export type { PickTableItemDotNotation } from './item-resolve'

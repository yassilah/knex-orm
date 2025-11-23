import type { Knex } from 'knex'

/**
 * SQL Operators
 */
export const OPERATORS = {
   $eq: (builder, column, value: unknown) => builder.where(column, '=', value as any),
   $neq: (builder, column, value: unknown) => builder.not.where(column, '=', value as any),
   $gt: (builder, column, value: number | Date) => builder.where(column, '>', value),
   $gte: (builder, column, value: number | Date) => builder.where(column, '>=', value),
   $lt: (builder, column, value: number | Date) => builder.where(column, '<', value),
   $lte: (builder, column, value: number | Date) => builder.where(column, '<=', value),
   $contains: (builder, column, value: string) => builder.whereLike(column, `%${value}%`),
   $ncontains: (builder, column, value: string) => builder.not.whereLike(column, `%${value}%`),
   $startsWith: (builder, column, value: string) => builder.whereLike(column, `${value}%`),
   $nstartsWith: (builder, column, value: string) => builder.not.whereLike(column, `${value}%`),
   $endsWith: (builder, column, value: string) => builder.whereLike(column, `%${value}`),
   $nendsWith: (builder, column, value: string) => builder.not.whereLike(column, `%${value}`),
   $in: (builder, column, value: any[]) => Array.isArray(value) ? builder.whereIn(column, value) : builder,
   $nin: (builder, column, value: any[]) => Array.isArray(value) ? builder.whereNotIn(column, value) : builder,
   $between: (builder, column, value: [any, any]) => Array.isArray(value) && value.length === 2 ? builder.whereBetween(column, value) : builder,
   $nbetween: (builder, column, value: [any, any]) => Array.isArray(value) && value.length === 2 ? builder.whereNotBetween(column, value) : builder,
   $null: (builder, column, _value: undefined) => builder.whereNull(column),
   $nnull: (builder, column, _value: undefined) => builder.whereNotNull(column),
   $like: (builder, column, value: string) => builder.whereLike(column, value),
   $nlike: (builder, column, value: string) => builder.not.whereLike(column, value),
} satisfies OperatorsDefinition

interface OperatorsDefinition {
   [key: string]: (builder: Knex.QueryBuilder, column: string, value: any | unknown) => Knex.QueryBuilder
}

export type InferOperatorExpectedValue<T extends Operator, TT = any> = T extends keyof typeof OPERATORS ? Parameters<(typeof OPERATORS)[T]>[2] extends infer U
   ? U extends [any, any] ? [TT, TT]
      : U extends any[] ? TT[]
         : U extends undefined ? boolean
            : TT
   : never
   : never

export type Operator = keyof typeof OPERATORS

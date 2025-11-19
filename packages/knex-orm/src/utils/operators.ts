import type { Knex } from 'knex'

/**
 * SQL Operators.
 */
export const OPERATORS = {
   $eq: (builder, column, value) => builder.where(column, '=', value),
   $neq: (builder, column, value) => builder.not.where(column, '=', value),
   $gt: (builder, column, value) => builder.where(column, '>', value),
   $gte: (builder, column, value) => builder.where(column, '>=', value),
   $lt: (builder, column, value) => builder.where(column, '<', value),
   $lte: (builder, column, value) => builder.where(column, '<=', value),
   $contains: (builder, column, value) => builder.whereLike(column, `%${value}%`),
   $ncontains: (builder, column, value) => builder.not.whereLike(column, `%${value}%`),
   $startsWith: (builder, column, value) => builder.whereLike(column, `${value}%`),
   $nstartsWith: (builder, column, value) => builder.not.whereLike(column, `${value}%`),
   $endsWith: (builder, column, value) => builder.whereLike(column, `%${value}`),
   $nendsWith: (builder, column, value) => builder.not.whereLike(column, `%${value}`),
   $in: (builder, column, value) => Array.isArray(value) ? builder.whereIn(column, value) : builder,
   $nin: (builder, column, value) => Array.isArray(value) ? builder.whereNotIn(column, value) : builder,
   $between: (builder, column, value) => Array.isArray(value) && value.length === 2 ? builder.whereBetween(column, value as [any, any]) : builder,
   $nbetween: (builder, column, value) => Array.isArray(value) && value.length === 2 ? builder.whereNotBetween(column, value as [any, any]) : builder,
   $null: (builder, column) => builder.whereNull(column),
   $nnull: (builder, column) => builder.whereNotNull(column),
} satisfies OperatorsDefinition

interface OperatorsDefinition {
   [key: string]: (builder: Knex.QueryBuilder, column: string, value: any) => Knex.QueryBuilder
}

export type Operator = keyof typeof OPERATORS

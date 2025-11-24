import type { Knex } from 'knex'
import type { ColumnDefinition, TableColumnNames } from './columns'
import type { GenerateNestedWildcards } from './helpers'
import type { RelatedFieldName, RelationDefinition } from './relations'
import type { Schema, TableNames } from './schema'

export interface BaseFieldDefinition {
   nullable?: boolean
   default?: unknown | `{${keyof Knex.FunctionHelper}}`
}

export type FieldDefinition = ColumnDefinition | RelationDefinition

/** All valid field selectors for a table (columns, wildcards, nested paths) */
export type FieldName<
   S extends Schema,
   T extends TableNames<S>,
   Deep = true,
   RootTable extends TableNames<S> = T,
   Placeholder = true,
> = TableColumnNames<S, T>
   | (Placeholder extends true
      ? Deep extends true
         ? GenerateNestedWildcards<S, T, RootTable>
         : '*'
      : never)
   | (Deep extends true ? RelatedFieldName<S, T, RootTable, Placeholder> : never)

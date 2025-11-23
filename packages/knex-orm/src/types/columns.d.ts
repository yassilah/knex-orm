import type { BaseFieldDefinition } from './fields'
import type { BelongsToRelationDefinition } from './relations'
import type { Schema, TableNames } from './schema'
import type { DataType, DataTypes } from '@/utils/data-types'

interface BaseColumnDefinition extends BaseFieldDefinition {
   unique?: boolean
   precision?: number
   scale?: number
   length?: number
   options?: string[]
   increments?: boolean
   unsigned?: boolean
}

export interface ColumnDefinition extends BaseColumnDefinition {
   type: DataTypes
   primary?: boolean
}

/** Extract column field names (including BelongsTo by default) */
export type TableColumnNames<S extends Schema, T extends TableNames<S>, BelongsTo = true>
   = { [K in keyof S[T]]: S[T][K] extends (BelongsTo extends true
      ? ColumnDefinition | BelongsToRelationDefinition
      : ColumnDefinition) ? K : never }[keyof S[T]] & string

/** Get column definition by name */
export type TableColumn<S extends Schema, T extends TableNames<S>, K extends TableColumnNames<S, T>>
   = S[T][K]

/** Infer TypeScript type from column definition */
export type InferColumnType<
   T extends ColumnDefinition,
   Nullable extends boolean | undefined = T['nullable'],
> = Nullable extends true ? DataType<T['type']> | null : DataType<T['type']>

import type { FieldDefinition } from './fields'
import type { Merge, Prettify } from './helpers'
import type { CollectionDefinition } from './schema'

/** Normalize collection with defaults applied to all fields */
export type NormalizedCollectionDefinition<C extends CollectionDefinition> = Prettify<
   { [K in keyof C]: NormalizedFieldDefinition<C[K]> }
>

/** Normalize field definition with defaults */
export type NormalizedFieldDefinition<F extends FieldDefinition> = Prettify<
   Merge<F, F['type'] extends 'belongs-to'
      ? { nullable: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' }
      : { nullable: true }>
>

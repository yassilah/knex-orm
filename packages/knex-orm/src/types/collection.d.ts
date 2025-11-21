import type { Merge, Prettify } from './helpers'
import type { CollectionDefinition, FieldDefinition } from './schema'

export type NormalizedCollectionDefinition<C extends CollectionDefinition> = Prettify<{
   [K in keyof C]: NormalizedFieldDefinition<C[K]>
}>

export type NormalizedFieldDefinition<F extends FieldDefinition> = Prettify<Merge<F, F['type'] extends 'belongs-to' ? {
   nullable: true
   onDelete: 'CASCADE'
   onUpdate: 'CASCADE'
} : {
   nullable: true
}>>

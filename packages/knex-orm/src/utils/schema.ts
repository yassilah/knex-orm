import type { NormalizedSchemaDefinition, Schema } from '../types/schema'
import { defineCollection } from './collections'

/**
 * Define a schema and automatically insert defaults when possible.
 */
export function defineSchema<const S extends Schema>(input: S) {
   return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, defineCollection(value)])) as NormalizedSchemaDefinition<S>
}

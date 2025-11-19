import type { Knex } from 'knex'

/**
 * Convert a value to an array.
 */
export function toArray<T extends Record<string, unknown>>(value: unknown) {
   if (Array.isArray(value)) {
      return value as T[]
   }

   if (value && typeof value === 'object') {
      return [value as T]
   }

   return []
}

/**
 * Check if the client supports returning.
 */
export function clientSupportsReturning(knex: Knex) {
   const clientName = knex.client.config.client
   return clientName === 'pg'
}

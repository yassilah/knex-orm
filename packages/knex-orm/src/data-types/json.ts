import type { DataTypeGroupProps } from '.'
import z from 'zod'

/**
 * JSON data types group definition.
 */
export default {
   operators: ['$eq', '$neq', '$in', '$nin', '$null', '$nnull'],
   types: {
      json: {
         create: (knex, name) => knex.json(name),
         validate: () => z.any(),
      },
      jsonb: {
         create: (knex, name) => knex.jsonb(name),
         validate: () => z.any(),
      },
   },
} satisfies DataTypeGroupProps

import type { DataTypeGroupProps } from '.'
import { Buffer } from 'node:buffer'
import z from 'zod'

/**
 * binary data types group definition.
 */
export default {
   operators: ['$eq', '$neq', '$in', '$nin', '$null', '$nnull'],
   types: {
      binary: {
         create: (knex, name) => knex.binary(name),
         validate: () => z.instanceof(Buffer),
      },
      blob: {
         create: (knex, name) => knex.binary(name),
         validate: () => z.instanceof(Buffer),
      },
   },
} satisfies DataTypeGroupProps

import type { DataTypeGroupProps } from '.'
import z from 'zod'

/**
 * JSON data types group definition.
 */
export default {
   operators: ['$eq', '$neq', '$in', '$nin', '$null', '$nnull'],
   types: {
      json: {
         create: ({ builder, columnName }) => builder.json(columnName),
         validate: () => z.any(),
      },
      jsonb: {
         create: ({ builder, columnName }) => builder.jsonb(columnName),
         validate: () => z.any(),
      },
   },
} satisfies DataTypeGroupProps

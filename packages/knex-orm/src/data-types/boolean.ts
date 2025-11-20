import type { DataTypeGroupProps } from '.'
import z from 'zod'

/**
 * Boolean data types group definition.
 */
export default {
   operators: ['$eq', '$neq', '$null', '$nnull'],
   types: {
      boolean: {
         create: ({ builder, columnName }) => builder.boolean(columnName),
         validate: () => z.coerce.boolean(),
      },
      bool: {
         create: ({ builder, columnName }) => builder.boolean(columnName),
         validate: () => z.coerce.boolean(),
      },
      tinyint: {
         create: ({ builder, columnName }) => builder.specificType(columnName, 'tinyint'),
         validate: () => z.coerce.number().int().refine(val => val === 0 || val === 1, { message: 'Value must be 0 or 1' }),
      },
   },
} satisfies DataTypeGroupProps

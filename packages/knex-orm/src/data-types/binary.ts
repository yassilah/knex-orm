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
         create: ({ builder, columnName }) => builder.binary(columnName),
         validate: () => z.instanceof(Buffer),
      },
      blob: {
         create: ({ builder, columnName }) => builder.binary(columnName),
         validate: () => z.instanceof(Buffer),
      },
   },
} satisfies DataTypeGroupProps

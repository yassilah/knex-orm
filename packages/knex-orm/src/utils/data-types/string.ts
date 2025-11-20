import type { DataTypeGroupProps } from '.'
import z from 'zod'

/**
 * String data types group definition.
 */
export default {
   operators: ['$eq', '$neq', '$in', '$nin', '$startsWith', '$nstartsWith', '$endsWith', '$nendsWith', '$contains', '$ncontains', '$null', '$nnull'],
   types: {
      text: {
         create: ({ builder, columnName }) => builder.text(columnName),
         validate: () => z.string(),
      },
      varchar: {
         create: ({ builder, columnName, definition }) => builder.string(columnName, definition.length),
         validate: ({ definition }) => z.string().max(definition.length || 255),
      },
      char: {
         create: ({ builder, columnName, definition }) => builder.string(columnName, definition.length),
         validate: ({ definition }) => z.string().max(definition.length || 255),
      },
      uuid: {
         create: ({ builder, columnName }) => builder.uuid(columnName),
         validate: () => z.uuid(),
      },
      enum: {
         create: ({ builder, columnName, definition }) => builder.enum(columnName, definition.options || []),
         validate: ({ definition }) => z.enum(definition.options || []),
      },
   },
} satisfies DataTypeGroupProps

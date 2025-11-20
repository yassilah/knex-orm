import type { DataTypeGroupProps } from '.'
import z from 'zod'

/**
 * Number data types group definition.
 */
export default {
   operators: ['$eq', '$neq', '$in', '$nin', '$lt', '$lte', '$gt', '$gte', '$nbetween', '$between', '$null', '$nnull'],
   types: {
      integer: {
         create: ({ builder, columnName, definition }) => definition.increments ? builder.increments(columnName) : builder.integer(columnName),
         validate: () => z.coerce.number().int(),
      },
      bigInteger: {
         create: ({ builder, columnName, definition }) => definition.increments ? builder.bigIncrements(columnName) : builder.bigInteger(columnName),
         validate: () => z.coerce.bigint().or(z.string().regex(/^\d+$/).transform(BigInt)),
      },
      float: {
         create: ({ builder, columnName, definition }) => builder.float(columnName, definition.precision, definition.scale),
         validate: ({ definition }) => {
            let schema = z.coerce.number()
            if (definition.precision) {
               schema = schema.refine((val) => {
                  const [integerPart, decimalPart] = val.toString().split('.')
                  return integerPart && integerPart.length <= (definition.precision! - (definition.scale || 0)) && (!decimalPart || decimalPart.length <= (definition.scale || 0))
               }, {
                  message: `Number exceeds defined precision of ${definition.precision} and scale of ${definition.scale || 0}`,
               })
            }
            return schema
         },
      },
      decimal: {
         create: ({ builder, columnName, definition }) => builder.decimal(columnName, definition.precision, definition.scale),
         validate: ({ definition }) => {
            let schema = z.coerce.number()
            if (definition.precision) {
               schema = schema.refine((val) => {
                  const [integerPart, decimalPart] = val.toString().split('.')
                  return integerPart && integerPart.length <= (definition.precision! - (definition.scale || 0)) && (!decimalPart || decimalPart.length <= (definition.scale || 0))
               }, {
                  message: `Number exceeds defined precision of ${definition.precision} and scale of ${definition.scale || 0}`,
               })
            }
            return schema
         },
      },
      double: {
         create: ({ builder, columnName }) => builder.double(columnName),
         validate: () => z.coerce.number(),
      },
      real: {
         create: ({ builder, columnName }) => builder.float(columnName),
         validate: () => z.coerce.number(),
      },
      smallint: {
         create: ({ builder, columnName }) => builder.specificType(columnName, 'smallint'),
         validate: () => z.coerce.number().int().refine(val => val >= -32768 && val <= 32767, { message: 'Value must be between -32768 and 32767' }),
      },
      mediumint: {
         create: ({ builder, columnName }) => builder.specificType(columnName, 'mediumint'),
         validate: () => z.coerce.number().int().refine(val => val >= -8388608 && val <= 8388607, { message: 'Value must be between -8388608 and 8388607' }),
      },
   },
} satisfies DataTypeGroupProps

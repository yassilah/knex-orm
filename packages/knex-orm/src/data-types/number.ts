import type { DataTypeGroupProps } from '.'
import z from 'zod'

/**
 * Number data types group definition.
 */
export default {
   operators: ['$eq', '$neq', '$in', '$nin', '$lt', '$lte', '$gt', '$gte', '$nbetween', '$between', '$null', '$nnull'],
   types: {
      integer: {
         create: (knex, name, def) => def.increments ? knex.increments(name) : knex.integer(name),
         validate: () => z.coerce.number().int(),
      },
      bigInteger: {
         create: (knex, name, def) => def.increments ? knex.bigIncrements(name) : knex.bigInteger(name),
         validate: () => z.coerce.bigint().or(z.string().regex(/^\d+$/).transform(BigInt)),
      },
      float: {
         create: (knex, name, def) => knex.float(name, def.precision, def.scale),
         validate: (def) => {
            let schema = z.coerce.number()
            if (def.precision) {
               schema = schema.refine((val) => {
                  const [integerPart, decimalPart] = val.toString().split('.')
                  return integerPart && integerPart.length <= (def.precision! - (def.scale || 0)) && (!decimalPart || decimalPart.length <= (def.scale || 0))
               }, {
                  message: `Number exceeds defined precision of ${def.precision} and scale of ${def.scale || 0}`,
               })
            }
            return schema
         },
      },
      decimal: {
         create: (knex, name, def) => knex.decimal(name, def.precision, def.scale),
         validate: (def) => {
            let schema = z.coerce.number()
            if (def.precision) {
               schema = schema.refine((val) => {
                  const [integerPart, decimalPart] = val.toString().split('.')
                  return integerPart && integerPart.length <= (def.precision! - (def.scale || 0)) && (!decimalPart || decimalPart.length <= (def.scale || 0))
               }, {
                  message: `Number exceeds defined precision of ${def.precision} and scale of ${def.scale || 0}`,
               })
            }
            return schema
         },
      },
      double: {
         create: (knex, name) => knex.double(name),
         validate: () => z.coerce.number(),
      },
      real: {
         create: (knex, name) => knex.float(name),
         validate: () => z.coerce.number(),
      },
      smallint: {
         create: (knex, name) => knex.specificType(name, 'smallint'),
         validate: () => z.coerce.number().int().refine(val => val >= -32768 && val <= 32767, { message: 'Value must be between -32768 and 32767' }),
      },
      mediumint: {
         create: (knex, name) => knex.specificType(name, 'mediumint'),
         validate: () => z.coerce.number().int().refine(val => val >= -8388608 && val <= 8388607, { message: 'Value must be between -8388608 and 8388607' }),
      },
   },
} satisfies DataTypeGroupProps

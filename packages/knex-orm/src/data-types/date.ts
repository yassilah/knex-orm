import type { DataTypeGroupProps } from '.'
import z from 'zod'

/**
 * Date data types group definition.
 */
export default {
   operators: ['$eq', '$neq', '$in', '$nin', '$lt', '$lte', '$gt', '$gte', '$nbetween', '$between', '$null', '$nnull'],
   types: {
      date: {
         create: (knex, name) => knex.date(name),
         validate: () => z.preprocess((arg) => {
            if (typeof arg === 'string' || arg instanceof Date) return new Date(arg)
         }, z.date()),
      },
      datetime: {
         create: (knex, name) => knex.dateTime(name),
         validate: () => z.preprocess((arg) => {
            if (typeof arg === 'string' || arg instanceof Date) return new Date(arg)
         }, z.date()),
      },
      timestamp: {
         create: (knex, name) => knex.timestamp(name),
         validate: () => z.preprocess((arg) => {
            if (typeof arg === 'string' || arg instanceof Date) return new Date(arg)
         }, z.date()),
      },
      time: {
         create: (knex, name) => knex.time(name),
         validate: () => z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { message: 'Invalid time format' }),
      },
      year: {
         create: (knex, name) => knex.specificType(name, 'year'),
         validate: () => z.coerce.number().int().refine(val => val >= 1901 && val <= 2155, { message: 'Year must be between 1901 and 2155' }),
      },
   },
} satisfies DataTypeGroupProps

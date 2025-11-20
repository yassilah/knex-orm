import type { DataTypeGroupProps } from '.'
import z from 'zod'

/**
 * Date data types group definition.
 */
export default {
   operators: ['$eq', '$neq', '$in', '$nin', '$lt', '$lte', '$gt', '$gte', '$nbetween', '$between', '$null', '$nnull'],
   types: {
      date: {
         create: ({ builder, columnName }) => builder.date(columnName),
         validate: () => z.preprocess((arg) => {
            if (typeof arg === 'string' || arg instanceof Date) return new Date(arg)
         }, z.date()),
      },
      datetime: {
         create: ({ builder, columnName }) => builder.dateTime(columnName),
         validate: () => z.preprocess((arg) => {
            if (typeof arg === 'string' || arg instanceof Date) return new Date(arg)
         }, z.date()),
      },
      timestamp: {
         create: ({ builder, columnName }) => builder.timestamp(columnName),
         validate: () => z.preprocess((arg) => {
            if (typeof arg === 'string' || arg instanceof Date) return new Date(arg)
         }, z.date()),
      },
      time: {
         create: ({ builder, columnName }) => builder.time(columnName),
         validate: () => z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { message: 'Invalid time format' }),
      },
      year: {
         create: ({ builder, columnName }) => builder.specificType(columnName, 'year'),
         validate: () => z.coerce.number().int().refine(val => val >= 1901 && val <= 2155, { message: 'Year must be between 1901 and 2155' }),
      },
   },
} satisfies DataTypeGroupProps

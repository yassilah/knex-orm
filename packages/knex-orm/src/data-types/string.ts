import type { DataTypeGroupProps } from '.'
import z from 'zod'

/**
 * String data types group definition.
 */
export default {
   operators: ['$eq', '$neq', '$in', '$nin', '$startsWith', '$nstartsWith', '$endsWith', '$nendsWith', '$contains', '$ncontains', '$null', '$nnull'],
   types: {
      'text': {
         create: ({ builder, columnName }) => builder.text(columnName),
         validate: () => z.string(),
      },
      'varchar': {
         create: ({ builder, columnName, definition }) => builder.string(columnName, definition.length),
         validate: ({ definition }) => z.string().max(definition.length || 255),
      },
      'char': {
         create: ({ builder, columnName, definition }) => builder.string(columnName, definition.length),
         validate: ({ definition }) => z.string().max(definition.length || 255),
      },
      'uuid': {
         create: ({ builder, columnName }) => builder.uuid(columnName),
         validate: () => z.uuid(),
      },
      'enum': {
         create: ({ builder, columnName, definition }) => builder.enum(columnName, definition.options || []),
         validate: ({ definition }) => z.enum(definition.options || []),
      },
      'enum-array': {
         create: async ({ builder, knex, columnName, tableName, definition }) => {
            if (knex.client.config.client === 'pg') {
               const enumName = `${tableName}_${columnName}_types`
               await knex.raw(`CREATE TYPE ${enumName} AS ENUM (${(definition.options || []).map(opt => `'${opt}'`).join(',')})`)
               return builder.specificType(columnName, `${enumName}[]`)
            }
            else if (knex.client.config.client === 'mysql2' || knex.client.config.client === 'mysql') {
               return builder.specificType(columnName, `enum(${(definition.options || []).map(opt => `'${opt}'`).join(',')})`)
            }

            return builder.text(columnName).defaultTo('')
         },
         remove: async ({ knex, columnName, tableName }) => {
            if (knex.client.config.client === 'pg') {
               await knex.raw(`DROP TYPE IF EXISTS ${tableName}_${columnName}_types`)
            }
         },
         validate: ({ definition }) => z.preprocess((value) => {
            if (typeof value === 'string') return value.split(',').filter(Boolean)
            if (Array.isArray(value)) return value.filter(Boolean)
            return []
         }, z.array(z.enum(definition.options || [])).transform(arr => arr.join(','))),
      },
   },
} satisfies DataTypeGroupProps

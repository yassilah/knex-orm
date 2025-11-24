import { defineDataType } from '@/utils/data-types'
import { defineValueTransformer } from '@/utils/values'

/**
 * Install the enum-array data type.
 */
export default function install() {
   defineValueTransformer(['sqlite3', 'better-sqlite3'], 'enum-array', {
      serialize(value) {
         return Array.isArray(value) ? value.join(',') : value
      },
      deserialize(value) {
         return Array.isArray(value) ? value : value?.toString().split(',').filter(Boolean)
      },
   })

   defineValueTransformer('pg', 'enum-array', {
      deserialize(value) {
         return Array.isArray(value) ? value : value?.toString().match(/\{(.*)\}/)?.[1]?.split(',').filter(Boolean)
      },
   })

   defineValueTransformer('mysql2', 'enum-array', {
      serialize(value) {
         return Array.isArray(value) ? value.join(',') : value
      },
      deserialize(value) {
         return Array.isArray(value) ? value : value?.toString().split(',').filter(Boolean)
      },
   })

   defineDataType('string', 'enum-array', {
      beforeCreate: ({ knex, columnName, tableName, definition }) => {
         if (knex.client.config.client === 'pg') {
            const enumTypeName = `${tableName}_${columnName}_enum`
            return knex.raw(`CREATE TYPE ${enumTypeName} AS ENUM (${(definition.options || []).map(opt => `'${opt}'`).join(',')})`)
         }
      },
      afterRemove: ({ knex, columnName, tableName }) => {
         if (knex.client.config.client === 'pg') {
            return knex.raw(`DROP TYPE IF EXISTS ${tableName}_${columnName}_enum`)
         }
      },
      create: ({ builder, knex, columnName, tableName, definition }) => {
         if (knex.client.config.client === 'pg') {
            const enumTypeName = `${tableName}_${columnName}_enum`
            return builder.specificType(columnName, `${enumTypeName}[]`)
         }
         else if (knex.client.config.client.includes('mysql')) {
            return builder.specificType(columnName, `set(${(definition.options || []).map(opt => `'${opt}'`).join(',')})`)
         }

         return builder.text(columnName)
      },
      validate: ({ z, definition }) => z.preprocess((value) => {
         if (typeof value === 'string') return value.split(',').filter(Boolean)
         if (Array.isArray(value)) return value.filter(Boolean)
         return []
      }, z.array(z.enum(definition.options || [])).transform(arr => arr.join(','))),
   })
}

declare module '..' {
   interface DataTypesMap {
      'enum-array': unknown[]
   }
}

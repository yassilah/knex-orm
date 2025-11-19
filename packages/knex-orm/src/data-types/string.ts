import type { DataTypeGroupProps } from '.'
import z from 'zod'

/**
 * String data types group definition.
 */
export default {
   operators: ['$eq', '$neq', '$in', '$nin', '$startsWith', '$nstartsWith', '$endsWith', '$nendsWith', '$contains', '$ncontains', '$null', '$nnull'],
   types: {
      'text': {
         create: (knex, name) => knex.text(name),
         validate: () => z.string(),
      },
      'varchar': {
         create: (knex, name, def) => knex.string(name, def.length),
         validate: def => z.string().max(def.length || 255),
      },
      'char': {
         create: (knex, name, def) => knex.string(name, def.length),
         validate: def => z.string().max(def.length || 255),
      },
      'uuid': {
         create: (knex, name) => knex.uuid(name),
         validate: () => z.uuid(),
      },
      'enum': {
         create: (knex, name, def) => knex.enum(name, def.options || []),
         validate: def => z.enum(def.options || []),
      },
      'enum-array': {
         create: (knex, name, def, instance) => {
            if (instance.client.config.client === 'pg') {
               knex.specificType(name, `${name}_types[]`).defaultTo(instance.raw(`'{${def.options?.join(',')}'::${name}_types[]`))
            }
            else if (instance.client.config.client === 'mysql2' || instance.client.config.client === 'mysql') {
               return knex.specificType(name, `enum(${(def.options || []).map(opt => `'${opt}'`).join(',')})`)
            }

            return knex.text(name).defaultTo('[]')
         },
         validate: def => z.preprocess((value) => {
            if (typeof value === 'string') {
               try {
                  const parsed = JSON.parse(value)
                  if (Array.isArray(parsed)) return parsed
               }
               catch {
                  return []
               }
            }
            return value
         }, z.array(z.enum(def.options || [])).transform(arr => JSON.stringify(arr))),
      },
   },
} satisfies DataTypeGroupProps

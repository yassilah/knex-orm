import type { Knex } from 'knex'
import type { MutationOptions } from '@/types/orm'
import type { FilterQuery } from '@/types/query'
import type { RelationDefinition } from '@/types/relations'
import type { CollectionDefinition, Schema, TableItem, TableItemInput, TableNames, TablePrimaryKeyValue } from '@/types/schema'
import { getPrimaryKey, getRelations } from './collections'
import { isNonNullish, toArray } from './misc'
import { create, createOne, findOne, remove, updateOne } from './queries'
import { isManyToMany } from './relations'

interface RelationPayload {
   name: string
   definition: RelationDefinition
   value: unknown
}

/**
 * Partition record into scalar values and relations
 */
export function partitionRecord(collection: CollectionDefinition, record: Record<string, unknown>) {
   const scalar: Record<string, unknown> = {}
   const relations: RelationPayload[] = []
   const relationMap = getRelations(collection, { includeBelongsTo: true })

   for (const key in record) {
      const value = record[key]
      const relation = relationMap[key]
      if (relation) {
         relations.push({ name: key, definition: relation, value })
      }
      else {
         scalar[key] = value
      }
   }

   return { scalar, relations }
}

/**
 * Upsert a table record (create if not exists, update if exists).
 */
export async function upsertTableRecord<S extends Schema, N extends TableNames<S>>(knex: Knex, schema: S, tableName: N, payload: TableItemInput<S, N>, options: MutationOptions, tablePk: string): Promise<TableItem<S, N>> {
   const payloadRecord = payload as Record<string, unknown>
   const primaryKeyValue = payloadRecord[tablePk] as TablePrimaryKeyValue<S, N> | undefined

   if (primaryKeyValue !== undefined) {
      const filters = { [tablePk]: { $eq: payloadRecord[tablePk] } } as unknown as FilterQuery<S, N>
      const existing = await findOne(knex, schema, tableName, primaryKeyValue, { trx: options.trx })

      if (existing) {
         await updateOne(knex, schema, tableName, filters, payload, options)
         const updated = await findOne(knex, schema, tableName, primaryKeyValue, { trx: options.trx })
         if (!updated) {
            throw new Error(`Unable to locate ${tableName} record after update`)
         }
         return updated as TableItem<S, N>
      }
   }

   return createOne(knex, schema, tableName, payload, options)
}

/**
 * Handle belongs-to relations (upsert related records and set FK)
 */
export async function handleBelongsToRelations<S extends Schema>(
   knex: Knex,
   schema: S,
   relations: RelationPayload[],
   scalar: Record<string, unknown>,
   options: MutationOptions,
) {
   for (const relation of relations) {
      if (relation.definition.type !== 'belongs-to' || !relation.value) continue

      const valueType = typeof relation.value
      if (valueType === 'number' || valueType === 'string') {
         scalar[relation.name] = relation.value
         continue
      }

      const tableName = relation.definition.table
      const tableMeta = schema[tableName]
      const [payload] = toArray(relation.value) as TableItemInput<S, TableNames<S>>[]
      if (!payload) continue

      const tablePk = getPrimaryKey(tableMeta)
      const record = await upsertTableRecord(knex, schema, tableName, payload, options, tablePk)
      scalar[relation.name] = (record as Record<string, unknown>)[tablePk]
   }
}

/**
 * Handle child relations on create (has-one, has-many, many-to-many)
 */
export async function handleChildRelationsOnCreate<S extends Schema>(
   knex: Knex,
   schema: S,
   relations: RelationPayload[],
   parentRecord: Record<string, unknown>,
   options: MutationOptions,
   collection: CollectionDefinition,
) {
   const parentPk = getPrimaryKey(collection)
   const parentPkValue = parentRecord[parentPk]
   if (parentPkValue === undefined) return

   for (const relation of relations) {
      if (relation.definition.type === 'belongs-to' || !relation.value) continue

      const tableName = relation.definition.table
      const payloads = toArray(relation.value) as TableItemInput<S, TableNames<S>>[]

      if (isManyToMany(relation.definition)) {
         const { through } = relation.definition
         if (!through) continue

         const tableMeta = schema[tableName]
         const tablePk = getPrimaryKey(tableMeta)

         const related = await Promise.all(
            payloads.map((payload) => {
               return upsertTableRecord(knex, schema, tableName, payload, options, tablePk)
            }),
         )

         const junctionRows = related
            .map((record) => {
               const fkValue = record[tablePk as keyof typeof record]
               return fkValue !== undefined
                  ? { [through.sourceFk]: parentPkValue, [through.tableFk]: fkValue } as TableItemInput<S, TableNames<S>>
                  : undefined
            })
            .filter(isNonNullish)

         if (junctionRows.length > 0) {
            await create(knex, schema, through.table, junctionRows, options)
         }
         continue
      }

      for (const payload of payloads) {
         const foreignKey = relation.definition.foreignKey as keyof TableItem<S, TableNames<S>>
         payload[foreignKey] = parentPkValue as any
         await createOne(knex, schema, tableName, payload, options)
      }
   }
}

/**
 * Handle child relations on update (replace/upsert child records)
 */
export async function handleChildRelationsOnUpdate<S extends Schema>(
   knex: Knex,
   schema: S,
   relations: RelationPayload[],
   parentRecord: Record<string, unknown>,
   options: MutationOptions,
   collection: CollectionDefinition,
) {
   const parentPk = getPrimaryKey(collection)
   const parentPkValue = parentRecord[parentPk]
   if (parentPkValue === undefined) return

   for (const relation of relations) {
      if (relation.definition.type === 'belongs-to' || !relation.value) continue

      const tableName = relation.definition.table
      const tableMeta = schema[tableName]
      const tablePk = getPrimaryKey(tableMeta)
      const payloads = toArray(relation.value) as TableItemInput<S, TableNames<S>>[]

      if (isManyToMany(relation.definition)) {
         const { through } = relation.definition
         if (!through) continue

         const filters = { [through.sourceFk]: { $eq: parentPkValue } } as unknown as FilterQuery<S, TableNames<S>>
         await remove(knex, schema, through.table, filters, options)

         const related = await Promise.all(
            payloads.map((payload) => {
               return upsertTableRecord(knex, schema, tableName, payload, options, tablePk)
            }),
         )

         const junctionRows = related
            .map((record) => {
               const fkValue = record[tablePk as keyof typeof record]
               return fkValue !== undefined
                  ? { [through.sourceFk]: parentPkValue, [through.tableFk]: fkValue } as TableItemInput<S, TableNames<S>>
                  : undefined
            })
            .filter(isNonNullish)

         if (junctionRows.length > 0) {
            await create(knex, schema, through.table, junctionRows, options)
         }
         continue
      }

      const foreignKey = relation.definition.foreignKey as keyof TableItem<S, TableNames<S>>
      for (const payload of payloads) {
         payload[foreignKey] = parentPkValue as any
         const payloadRecord = payload as Record<string, unknown>

         if (payloadRecord[tablePk] !== undefined) {
            const filters = { [tablePk]: { $eq: payloadRecord[tablePk] } } as unknown as FilterQuery<S, TableNames<S>>
            await updateOne(knex, schema, tableName, filters, payload, options)
         }
         else {
            await createOne(knex, schema, tableName, payload, options)
         }
      }
   }
}

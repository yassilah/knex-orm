import type { Knex } from 'knex'
import type { MutationOptions } from '@/types/orm'
import type { FilterQuery } from '@/types/query'
import type { RelationDefinition } from '@/types/relations'
import type { CollectionDefinition, Schema, TableItem, TableItemInput, TableNames, TablePrimaryKeyValue } from '@/types/schema'
import { getPrimaryKey, getRelations } from './collections'
import { toArray } from './misc'
import { create, createOne, findOne, remove, updateOne } from './queries'
import { isManyToMany } from './relations'

interface RelationPayload {
   name: string
   definition: RelationDefinition
   value: unknown
}

/**
 * Partition a record into scalar and relation parts.
 */
export function partitionRecord(collection: CollectionDefinition, record: Record<string, unknown>) {
   const scalar: Record<string, unknown> = {}
   const relations: RelationPayload[] = []
   const relationMap = getRelations(collection)

   for (const [key, value] of Object.entries(record)) {
      if (relationMap[key]) {
         relations.push({
            name: key,
            definition: relationMap[key],
            value,
         })
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
export async function upserttableRecord<S extends Schema, N extends TableNames<S>>(knex: Knex, schema: S, tableName: N, payload: TableItemInput<S, N>, options: MutationOptions, tablePk: string): Promise<TableItem<S, N>> {
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
 * Handle belongs-to relations by upserting table records and setting foreign keys.
 */
export async function handleBelongsToRelations<S extends Schema>(knex: Knex, schema: S, relations: RelationPayload[], scalar: Record<string, unknown>, options: MutationOptions) {
   const belongsToRelations = relations.filter(({ definition }) => definition.type === 'belongs-to')

   for (const relation of belongsToRelations) {
      if (!relation.value) continue

      const tableName = relation.definition.table
      const tableMeta = schema[tableName]
      const [payload] = toArray(relation.value) as TableItemInput<S, TableNames<S>>[]
      if (!payload) continue

      const tablePk = getPrimaryKey(tableMeta)
      const record = await upserttableRecord(knex, schema, tableName, payload, options, tablePk)
      scalar[relation.name] = (record as Record<string, unknown>)[tablePk]
   }
}

/**
 * Handle child relations on create.
 */
export async function handleChildRelationsOnCreate<S extends Schema>(knex: Knex, schema: S, relations: RelationPayload[], parentRecord: Record<string, unknown>, options: MutationOptions, collection: CollectionDefinition) {
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
         const related = []

         for (const payload of payloads) {
            const record = await upserttableRecord(knex, schema, tableName, payload, options, tablePk)
            related.push(record)
         }

         if (related.length > 0) {
            const rows = related.map(record => ({
               [through.sourceFk]: parentPkValue,
               [through.tableFk]: (record as Record<string, unknown>)[tablePk],
            })) as TableItemInput<S, TableNames<S>>[]
            await create(knex, schema, through.table, rows, options)
         }
         continue
      }

      for (const payload of payloads) {
         const foreignKey = relation.definition.foreignKey as keyof TableItem<S, TableNames<S>>
         Object.assign(payload, { [foreignKey]: parentPkValue })
         await createOne(knex, schema, tableName, payload, options)
      }
   }
}

/**
 * Handle child relations on update.
 */
export async function handleChildRelationsOnUpdate<S extends Schema>(knex: Knex, schema: S, relations: RelationPayload[], parentRecord: Record<string, unknown>, options: MutationOptions, collection: CollectionDefinition) {
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

         const related = []
         for (const payload of payloads) {
            const record = await upserttableRecord(knex, schema, tableName, payload, options, tablePk)
            related.push(record)
         }

         if (related.length > 0) {
            const rows = related.map(record => ({
               [through.sourceFk]: parentPkValue,
               [through.tableFk]: (record as Record<string, unknown>)[tablePk],
            })) as TableItemInput<S, TableNames<S>>[]
            await create(knex, schema, through.table, rows, options)
         }
         continue
      }

      for (const payload of payloads) {
         const foreignKey = relation.definition.foreignKey as keyof TableItem<S, TableNames<S>>
         Object.assign(payload, { [foreignKey]: parentPkValue })

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

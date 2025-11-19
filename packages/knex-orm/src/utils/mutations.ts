import type { Knex } from 'knex'
import type { FilterQuery } from '../query'
import type { MutationOptions } from '../types/orm'
import type { CollectionDefinition, RelationDefinition, Schema, TableNames, TablePrimaryKeyValue, TableRecord, TableRecordInput } from '../types/schema'
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
 * Upsert a target record.
 */
export async function upsertTargetRecord<S extends Schema, N extends TableNames<S>>(knex: Knex, schema: S, tableName: N, payload: TableRecordInput<S, N>, options: MutationOptions, targetPk: string): Promise<TableRecord<S, N>> {
   const payloadAny = payload as any
   const primaryKeyValue = payloadAny[targetPk] as TablePrimaryKeyValue<S, N> | undefined

   if (primaryKeyValue !== undefined) {
      const filters = { [targetPk]: { $eq: payloadAny[targetPk] } } as unknown as FilterQuery<S, N>

      const existing = await findOne(knex, schema, tableName, primaryKeyValue, { trx: options.trx })

      if (existing) {
         await updateOne(knex, schema, tableName, filters, payload, options)

         const updated = await findOne(knex, schema, tableName, primaryKeyValue, { trx: options.trx })

         if (!updated) {
            throw new Error(`Unable to locate ${tableName} record after update`)
         }

         return updated as TableRecord<S, N>
      }
   }

   return createOne(knex, schema, tableName, payload, options)
}

/**
 * Handle belongs to relations.
 */
export async function handleBelongsToRelations<S extends Schema>(knex: Knex, schema: S, relations: RelationPayload[], scalar: Record<string, unknown>, options: MutationOptions) {
   const belongsToRelations = relations.filter(({ definition }) => definition.type === 'belongs-to')

   for (const relation of belongsToRelations) {
      if (!relation.value) continue

      const targetName = relation.definition.target
      const targetMeta = schema[targetName]

      const [payload] = toArray(relation.value) as TableRecordInput<S, TableNames<S>>[]

      if (!payload) continue

      const targetPk = getPrimaryKey(targetMeta)

      const record = await upsertTargetRecord(knex, schema, targetName, payload, options, targetPk)

      const recordAny = record as any
      // belongs-to relation name IS the column name
      scalar[relation.name] = recordAny[targetPk]
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

      const targetName = relation.definition.target
      const payloads = toArray(relation.value) as TableRecordInput<S, TableNames<S>>[]

      if (isManyToMany(relation.definition)) {
         const { through } = relation.definition
         if (!through) continue

         const targetMeta = schema[targetName]

         const targetPk = getPrimaryKey(targetMeta)

         const related = []

         for (const payload of payloads) {
            const record = await upsertTargetRecord(knex, schema, targetName, payload, options, targetPk)
            related.push(record)
         }

         const rows = related.map((record) => {
            const recordAny = record as any
            return {
               [through.sourceFk]: parentPkValue,
               [through.targetFk]: recordAny[targetPk],
            }
         }) as TableRecordInput<S, TableNames<S>>[]

         if (rows.length) {
            await create(knex, schema, through.table, rows, options)
         }

         continue
      }

      for (const payload of payloads) {
         const foreignKey = relation.definition.foreignKey as keyof TableRecord<S, TableNames<S>>
         Object.assign(payload, { [foreignKey]: parentPkValue })
         await createOne(knex, schema, targetName, payload, options)
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

      const targetName = relation.definition.target
      const targetMeta = schema[targetName]
      const targetPk = getPrimaryKey(targetMeta)
      const payloads = toArray(relation.value) as TableRecordInput<S, TableNames<S>>[]

      if (isManyToMany(relation.definition)) {
         const { through } = relation.definition

         if (!through) continue
         const filters = { [through.sourceFk]: { $eq: parentPkValue } } as unknown as FilterQuery<S, TableNames<S>>
         await remove(knex, schema, through.table, filters, options)

         const related = []

         for (const payload of payloads) {
            const record = await upsertTargetRecord(knex, schema, targetName, payload, options, targetPk)
            related.push(record)
         }

         const rows = related.map((record) => {
            const recordAny = record as any
            return {
               [through.sourceFk]: parentPkValue,
               [through.targetFk]: recordAny[targetPk],
            }
         }) as TableRecordInput<S, TableNames<S>>[]

         if (rows.length) {
            await create(knex, schema, through.table, rows, options)
         }

         continue
      }

      for (const payload of payloads) {
         const foreignKey = relation.definition.foreignKey as keyof TableRecord<S, TableNames<S>>
         Object.assign(payload, { [foreignKey]: parentPkValue })

         const payloadAny = payload as any
         if (payloadAny[targetPk] !== undefined) {
            const filters = { [targetPk]: { $eq: payloadAny[targetPk] } } as unknown as FilterQuery<S, TableNames<S>>
            await updateOne(knex, schema, targetName, filters, payload, options)
         }
         else {
            await createOne(knex, schema, targetName, payload, options)
         }
      }
   }
}

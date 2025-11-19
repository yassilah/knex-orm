import type { Knex } from 'knex'
import type { CollectionDefinition } from '../types/schema'
import type {
   SchemaOperation,
} from './schema-comparator'
import {
   SchemaComparator,
} from './schema-comparator'

export interface MigrationResult {
   operations: SchemaOperation[]
}

export class SchemaMigrator {
   private readonly comparator: SchemaComparator

   constructor(private readonly knex: Knex) {
      this.comparator = new SchemaComparator(knex)
   }

   async plan(
      schema: Record<string, CollectionDefinition>,
   ): Promise<SchemaOperation[]> {
      return this.comparator.diff(schema)
   }

   async migrate(
      schema: Record<string, CollectionDefinition>,
   ): Promise<MigrationResult> {
      const operations = await this.plan(schema)
      for (const operation of operations) {
         await this.comparator.applyOperation(operation)
      }
      return { operations }
   }
}

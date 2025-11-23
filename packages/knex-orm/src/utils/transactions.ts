import type { Knex } from 'knex'
import type { MutationOptions } from '@/types/orm'

/**
 * Run a transaction and return the result
 */
export async function runInTransaction<R>(
   knex: Knex,
   options: MutationOptions | undefined,
   work: (trx: Knex.Transaction) => Promise<R>,
) {
   if (options?.trx) {
      return work(options.trx)
   }
   return knex.transaction(work)
}

import type { Knex } from 'knex'

export interface MutationOptions {
   trx?: Knex.Transaction
}

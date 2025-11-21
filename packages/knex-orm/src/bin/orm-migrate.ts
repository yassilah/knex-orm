#!/usr/bin/env node
import type { Knex } from 'knex'
import type { CollectionDefinition } from '@/types/schema'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createInstance } from '..'

interface CliConfig {
   schema: Record<string, CollectionDefinition>
   knex: Knex.Config
}

async function loadConfig(configPath: string): Promise<CliConfig> {
   const absolute = path.isAbsolute(configPath)
      ? configPath
      : path.resolve(process.cwd(), configPath)
   const module = await import(pathToFileURL(absolute).href)
   return (module.default ?? module.config ?? module) as CliConfig
}

async function run() {
   const configPath = process.argv[2] ?? path.resolve(process.cwd(), 'orm.config.mjs')
   const config = await loadConfig(configPath)
   const orm = createInstance(config.schema, config.knex)
   try {
      const result = await orm.migrate()
      // eslint-disable-next-line no-console
      console.log(`Applied ${result.operations.length} operations`)
   }
   finally {
      await orm.destroy()
   }
}

run().catch((error) => {
   console.error('Migration failed:', error)
   process.exit(1)
})

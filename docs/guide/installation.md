# Installation

## Prerequisites

- Node.js 18 or higher
- A database (PostgreSQL, MySQL, or SQLite)
- TypeScript (recommended)

## Install the Package

```bash
npm install @yassi/knex-orm
# or
pnpm add @yassi/knex-orm
# or
yarn add @yassi/knex-orm
```

## Install Database Drivers

You'll also need to install the appropriate database driver for your database:

### PostgreSQL

```bash
npm install pg
npm install --save-dev @types/pg
```

### MySQL

```bash
npm install mysql2
```

### SQLite

```bash
npm install sqlite3
# or for better-sqlite3
npm install better-sqlite3
```

## TypeScript Configuration

Make sure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## Verify Installation

Create a simple test file to verify everything is working:

```typescript
import { createInstance, defineCollection } from '@yassi/knex-orm'

const schema = {
  test: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    name: { type: 'varchar', nullable: false },
  }),
}

const orm = createInstance(schema, {
  client: 'sqlite3',
  connection: { filename: ':memory:' },
  useNullAsDefault: true,
})

console.log('ORM initialized successfully!')
```

If this runs without errors, you're ready to go!

## Next Steps

- [Quick Start](/guide/quick-start) - Build your first schema and queries
- [Schema Definition](/guide/schema-definition) - Learn how to define your database schema


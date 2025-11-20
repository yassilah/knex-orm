# Migrations

`@yassidev/knex-orm` provides automatic schema migrations that compare your schema definition with the actual database and apply the necessary changes.

## Overview

Migrations ensure your database schema stays in sync with your TypeScript schema definition. The ORM automatically:

1. Compares your schema with the database
2. Identifies differences (new tables, new columns, changed columns)
3. Applies the necessary changes

## Running Migrations

### Basic Migration

Run migrations to sync your schema with the database:

```typescript
const orm = createInstance(schema, knexConfig)

// Apply all pending migrations
await orm.migrate()
```

This will:
- Create new tables that don't exist
- Add new columns to existing tables
- Alter columns that have changed (nullable status)

### Preview Migrations

Before applying migrations, you can preview what will change:

```typescript
// Get the migration plan without applying it
const plan = await orm.planMigrations()

console.log(plan)
// [
//   { type: 'createTable', tableName: 'users', collection: {...} },
//   { type: 'addColumn', table: 'users', column: 'email', definition: {...} },
//   ...
// ]
```

## Migration Operations

### Create Table

When a table doesn't exist in the database, it will be created:

```typescript
const schema = {
  users: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', nullable: false },
  }),
}

await orm.migrate()
// Creates the 'users' table with 'id' and 'email' columns
```

### Add Column

When a new column is added to your schema, it will be added to the table:

```typescript
// Schema updated to include 'name' column
const schema = {
  users: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', nullable: false },
    name: { type: 'varchar', nullable: true }, // New column
  }),
}

await orm.migrate()
// Adds 'name' column to 'users' table
```

### Alter Column

When a column's nullable status changes, it will be altered:

```typescript
// Schema updated: 'email' is now required
const schema = {
  users: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', nullable: false }, // Changed from nullable: true
  }),
}

await orm.migrate()
// Alters 'email' column to be NOT NULL
```

## Migration Workflow

### Development

During development, you can run migrations frequently:

```typescript
// In your development setup
const orm = createInstance(schema, devKnexConfig)

// Run migrations on startup
await orm.migrate()
```

### Production

In production, you might want to:

1. **Preview changes first**:

```typescript
const plan = await orm.planMigrations()

if (plan.length > 0) {
  console.log('Pending migrations:')
  plan.forEach(op => console.log(`- ${op.type}: ${op.tableName || op.table}`))
  
  // Review the plan, then apply
  await orm.migrate()
}
```

2. **Run migrations as part of deployment**:

```typescript
// In your deployment script
async function deploy() {
  const orm = createInstance(schema, productionKnexConfig)
  
  // Check for pending migrations
  const plan = await orm.planMigrations()
  
  if (plan.length > 0) {
    console.log(`Applying ${plan.length} migration(s)...`)
    await orm.migrate()
    console.log('Migrations applied successfully')
  } else {
    console.log('Database is up to date')
  }
}
```

## Migration Limitations

The current migration system handles:

- ✅ Creating new tables
- ✅ Adding new columns
- ✅ Changing column nullable status

It does **not** currently handle:

- ❌ Removing columns
- ❌ Removing tables
- ❌ Changing column types
- ❌ Changing column names
- ❌ Adding/removing indexes (except primary/unique)
- ❌ Changing foreign key constraints

For these operations, you may need to:

1. Write manual migration scripts using Knex
2. Use the raw `knex` instance from the ORM

```typescript
// Access raw Knex for advanced operations
await orm.knex.schema.alterTable('users', (table) => {
  table.dropColumn('old_column')
})
```

## Example: Complete Migration Flow

```typescript
import { createInstance, defineCollection } from '@yassidev/knex-orm'

const schema = {
  users: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', unique: true, nullable: false },
    name: { type: 'varchar', nullable: true },
    created_at: { type: 'timestamp', default: 'CURRENT_TIMESTAMP', nullable: false },
  }),
  posts: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
    content: { type: 'text', nullable: true },
    author_id: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
    created_at: { type: 'timestamp', default: 'CURRENT_TIMESTAMP', nullable: false },
  }),
} as const

const orm = createInstance(schema, {
  client: 'postgres',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'myapp',
  },
})

async function setup() {
  // Preview migrations
  const plan = await orm.planMigrations()
  
  if (plan.length > 0) {
    console.log(`Applying ${plan.length} migration(s)...`)
    await orm.migrate()
    console.log('Database schema is up to date')
  } else {
    console.log('Database schema is already up to date')
  }
}

setup().catch(console.error)
```

## Best Practices

1. **Run migrations in development first**: Always test migrations in development before production.

2. **Preview before applying**: Use `planMigrations()` to see what will change.

3. **Backup production databases**: Always backup your production database before running migrations.

4. **Version control your schema**: Keep your schema definition in version control.

5. **Use transactions when possible**: The ORM runs migrations in transactions when the database supports it.

6. **Handle migration errors**: Always handle potential errors during migrations.

```typescript
try {
  await orm.migrate()
} catch (error) {
  console.error('Migration failed:', error)
  // Handle error, possibly rollback
  throw error
}
```

## Advanced: Custom Migration Scripts

For complex migrations, you can use the raw Knex instance:

```typescript
// Custom migration using raw Knex
await orm.knex.transaction(async (trx) => {
  // Your custom migration logic
  await trx.schema.alterTable('users', (table) => {
    table.string('new_column').nullable()
  })
  
  // Migrate existing data
  await trx('users').update({ new_column: 'default_value' })
  
  // Make column non-nullable
  await trx.schema.alterTable('users', (table) => {
    table.string('new_column').notNullable().alter()
  })
})
```

## Next Steps

- [Schema Definition](/guide/schema-definition) - Learn how to define your schema
- [Getting Started](/guide/getting-started) - Review the basics


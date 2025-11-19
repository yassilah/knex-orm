# Getting Started

`@yassi/knex-orm` is a TypeScript ORM built on top of [Knex.js](https://knexjs.org/) that provides a type-safe, schema-driven approach to database operations. It supports PostgreSQL, MySQL, and SQLite, and includes automatic migrations, powerful querying, and nested relational mutations.

## What is @yassi/knex-orm?

This ORM provides:

- **Type-safe schema definitions** - Define your database schema in TypeScript with full type inference
- **Automatic migrations** - Compare your schema with the database and apply changes automatically
- **Powerful querying** - MongoDB-like filter operators, nested relations, and flexible column selection
- **Nested mutations** - Create and update related records in a single operation
- **Multi-database support** - Works with PostgreSQL, MySQL, and SQLite

## Key Features

### Type-Safe Schema

Define your schema once, and get full TypeScript support throughout your application:

```typescript
import { defineCollection, createInstance } from '@yassi/knex-orm'

const schema = {
  users: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', unique: true, nullable: false },
    status: { type: 'varchar', nullable: true },
  }),
}

const orm = createInstance(schema, {
  client: 'sqlite3',
  connection: { filename: ':memory:' },
})
```

### Powerful Querying

Query with MongoDB-like operators and nested relations:

```typescript
// Find active users
const users = await orm.find('users', {
  where: { status: { $eq: 'active' } },
  orderBy: ['-email'],
  limit: 10,
})

// Find with nested relations
const posts = await orm.find('posts', {
  columns: ['title', 'author.email', 'author.status'],
  where: { 'author.status': { $eq: 'active' } },
})
```

### Automatic Migrations

Keep your database in sync with your schema:

```typescript
// Compare schema with database and apply changes
await orm.migrate()

// Or preview what would change
const plan = await orm.planMigrations()
console.log(plan)
```

### Nested Mutations

Create related records in a single operation:

```typescript
await orm.create('users', [{
  email: 'user@example.com',
  profile: { display_name: 'John Doe' }, // has-one
  posts: [{ title: 'My First Post' }],   // has-many
}])
```

## Next Steps

- [Installation Guide](/guide/installation) - Set up the package in your project
- [Quick Start](/guide/quick-start) - Build your first schema and queries
- [Schema Definition](/guide/schema-definition) - Learn how to define your database schema


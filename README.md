# @yassidev/knex-orm

Custom TypeScript ORM built on Knex that supports Postgres, MySQL, and SQLite with collection definitions, filtering, pagination, nested relational mutations, and schema migrations.

## Workspace Overview

- `pnpm-workspace.yaml` – pnpm monorepo definition
- `packages/knex-orm` – the published package source
  - `src/instance.ts` – ORM instance creation and API
  - `src/types/` – TypeScript type definitions
  - `src/utils/` – core utilities
    - `queries.ts` – query execution and relation loading
    - `mutations.ts` – create, update, delete operations
    - `filters.ts` – filter operator implementation
    - `migrations.ts` – schema diffing and migration runner
    - `collections.ts` – collection utilities
    - `schema.ts` – schema definition helpers
    - `relations.ts` – relation type guards
    - `validation.ts` – Zod schema validation

## Getting Started

```bash
pnpm install
pnpm build
```

Use `pnpm lint` for type checking and `pnpm test` (placeholder) for future tests.

## Defining Schema

```ts
import { defineSchema, createInstance } from '@yassidev/knex-orm';

const schema = defineSchema({
  users: {
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', unique: true, nullable: false },
    profile: { type: 'has-one', target: 'profiles' },
  },
  profiles: {
    id: { type: 'integer', primary: true, increments: true },
    user: { type: 'belongs-to', target: 'users' },
    bio: { type: 'text', nullable: true },
  },
});

const orm = createInstance(schema, knexConfig);
```

The schema powers all ORM operations including queries, mutations, and migrations.

## Query API

- `find` / `findOne` - Query records with filters and relations
- `create` / `createOne` - Create records with nested relations
- `update` / `updateOne` - Update records with filters
- `remove` / `removeOne` - Delete records with filters

Filters accept MongoDB-like operators:

```ts
await orm.find('users', {
  where: {
    status: { $eq: 'active' },
    created_at: { $gte: new Date('2024-01-01') },
  },
  limit: 10,
  orderBy: ['-created_at'],
});
```

Load relations using nested column selection:

```ts
await orm.find('posts', {
  columns: ['title', 'author.email', 'author.profile.bio'],
});
```

## Nested Mutations

Create related records in a single operation:

```ts
await orm.createOne('users', {
  email: 'a@b.com',
  profile: { bio: 'Developer' },  // has-one
  posts: [{ title: 'Hello' }],    // has-many
});
```

Update with nested relations:

```ts
await orm.updateOne('users', 
  { id: { $eq: 1 } },
  {
    email: 'updated@b.com',
    profile: { bio: 'Updated bio' },
  }
);
```

`belongs-to` relations are processed before parent inserts, while `has-one`, `has-many`, and `many-to-many` are processed after.

## Schema Migrations

Automatically sync your database with your schema definition:

```ts
import { createInstance, defineSchema } from '@yassidev/knex-orm';

const schema = defineSchema({
  users: {
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', unique: true, nullable: false },
  },
});

const orm = createInstance(schema, knexConfig);

// Preview migrations
const plan = await orm.planMigrations();
console.log(plan);

// Apply migrations
await orm.migrate();
```

The migration system compares your schema with the database and applies:
- New table creation
- New column additions
- Column nullable status changes

## Development Scripts

- `pnpm build` – compile TypeScript to `dist`
- `pnpm lint` – `tsc --noEmit`
- `pnpm test` – placeholder (Vitest ready)

## License

MIT


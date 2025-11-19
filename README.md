# @yassi/knex-orm

Custom TypeScript ORM built on Knex that supports Postgres, MySQL, and SQLite with collection definitions, filtering, pagination, nested relational mutations, and schema migrations.

## Workspace Overview

- `pnpm-workspace.yaml` – pnpm monorepo definition
- `packages/knex-orm` – the published package source
  - `src/schema` – collection definitions and registry helpers
  - `src/query` – filter and query option utilities
  - `src/orm` – repository implementation with CRUD helpers
  - `src/mutation` – nested mutation engine
  - `src/migrations` – schema diffing and migration runner
  - `src/bin` – CLI entry for migrations

## Getting Started

```bash
pnpm install
pnpm build
```

Use `pnpm lint` for type checking and `pnpm test` (placeholder) for future tests.

## Defining Collections

```ts
import { defineCollection } from '@yassi/knex-orm';

export const users = defineCollection({
  name: 'users',
  columns: {
    id: { type: 'uuid', primary: true },
    email: { type: 'string', unique: true, nullable: false },
    profile_id: { type: 'uuid' },
  },
  relations: {
    profile: { type: 'hasOne', target: 'profiles', foreignKey: 'user_id' },
  },
});
```

Register collections via `createOrm({ collections: [...] })`. The registry powers repositories, nested mutations, and migrations.

## Query API

- `find` / `findOne`
- `create` / `createOne`
- `update` / `updateOne`
- `delete` / `deleteOne`

Filters accept Mongo-like operators, e.g.:

```ts
await repo.find({
  status: { $eq: 'active' },
  created_at: { $gte: new Date('2024-01-01') },
});
```

Options include `limit`, `offset`, `orderBy`, and `select`.

## Nested Mutations

Include relational payloads inside create/update calls:

```ts
await usersRepo.createOne({
  email: 'a@b.com',
  profile: { displayName: 'Ada' }, // hasOne
  posts: [{ title: 'Hello' }],     // hasMany
});
```

`belongsTo` relations run before inserts, while `hasOne`/`hasMany`/`manyToMany` execute after the parent row is persisted.

## Schema Migrations

Run `pnpm exec knex-orm-migrate <config-file>` where the config exports the same object you pass to `createOrm`. The CLI loads the collections, compares them to the live database, and applies create/add/alter operations using Knex’s schema builder.

```ts
// orm.config.mjs
import { createOrm, defineCollection } from '@yassi/knex-orm';

export default {
  driver: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
  },
  collections: [users, posts],
};
```

Invoke migrations:

```bash
pnpm exec knex-orm-migrate orm.config.mjs
```

## Development Scripts

- `pnpm build` – compile TypeScript to `dist`
- `pnpm lint` – `tsc --noEmit`
- `pnpm test` – placeholder (Vitest ready)

## License

MIT


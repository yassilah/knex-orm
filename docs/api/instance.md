# Instance API

The ORM instance is created using `createInstance` or `createInstanceWithKnex` and provides all the methods for interacting with your database.

## Creating an Instance

### createInstance

Creates a new ORM instance with a Knex configuration:

```typescript
import { createInstance, defineCollection } from '@yassidev/knex-orm'

const schema = {
  users: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', nullable: false },
  }),
}

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
```

### createInstanceWithKnex

Creates an ORM instance with an existing Knex instance:

```typescript
import { createInstanceWithKnex, defineCollection } from '@yassidev/knex-orm'
import knex from 'knex'

const knexInstance = knex({
  client: 'postgres',
  connection: { /* ... */ },
})

const orm = createInstanceWithKnex(schema, knexInstance)
```

## Instance Methods

### knex

Access the underlying Knex instance:

```typescript
// Use raw Knex for advanced operations
await orm.knex.raw('SELECT * FROM users WHERE ...')
await orm.knex.transaction(async (trx) => {
  // Transaction logic
})
```

### find

Find multiple records:

```typescript
orm.find<N, Columns>(
  tableName: N,
  params?: FindQueryParams<S, N, Columns>
): QueryBuilder | Promise<Result[]>
```

See [Query Methods](/api/query-methods) for details.

### findOne

Find a single record:

```typescript
orm.findOne<N, Columns>(
  tableName: N,
  primaryKeyOrParams: PrimaryKey | FindQueryParams<S, N, Columns>,
  params?: FindQueryParams<S, N, Columns>
): Promise<Result | undefined>
```

See [Query Methods](/api/query-methods) for details.

### create

Create multiple records:

```typescript
orm.create<N>(
  tableName: N,
  records: TableRecordInput<S, N>[],
  options?: MutationOptions
): Promise<TableRecord<S, N>[]>
```

See [Mutation Methods](/api/mutation-methods) for details.

### createOne

Create a single record:

```typescript
orm.createOne<N>(
  tableName: N,
  record: TableRecordInput<S, N>,
  options?: MutationOptions
): Promise<TableRecord<S, N>>
```

See [Mutation Methods](/api/mutation-methods) for details.

### update

Update multiple records:

```typescript
orm.update<N>(
  tableName: N,
  filter: FilterQuery<S, N>,
  patch: TableRecordInput<S, N>,
  options?: MutationOptions
): Promise<number>
```

See [Mutation Methods](/api/mutation-methods) for details.

### updateOne

Update a single record:

```typescript
orm.updateOne<N>(
  tableName: N,
  filter: FilterQuery<S, N>,
  patch: TableRecordInput<S, N>,
  options?: MutationOptions
): Promise<TableRecord<S, N> | undefined>
```

See [Mutation Methods](/api/mutation-methods) for details.

### remove

Remove multiple records:

```typescript
orm.remove<N>(
  tableName: N,
  filter: FilterQuery<S, N>,
  options?: MutationOptions
): Promise<number>
```

See [Mutation Methods](/api/mutation-methods) for details.

### removeOne

Remove a single record:

```typescript
orm.removeOne<N>(
  tableName: N,
  filter: FilterQuery<S, N>,
  options?: MutationOptions
): Promise<TableRecord<S, N> | undefined>
```

See [Mutation Methods](/api/mutation-methods) for details.

### migrate

Apply schema migrations:

```typescript
orm.migrate(): Promise<MigrationResult>
```

See [Migrations](/guide/migrations) for details.

### planMigrations

Preview pending migrations:

```typescript
orm.planMigrations(): Promise<SchemaOperation[]>
```

See [Migrations](/guide/migrations) for details.

### destroy

Close the database connection:

```typescript
orm.destroy(): Promise<void>
```

Always call this when you're done with the ORM instance:

```typescript
await orm.destroy()
```

## Type Parameters

The instance is fully typed based on your schema:

```typescript
type Schema = typeof schema
type Instance = Instance<Schema>

// TypeScript knows all table names
const users = await orm.find('users') // ✅
const posts = await orm.find('posts') // ✅
const invalid = await orm.find('invalid') // ❌ TypeScript error
```

## Complete Example

```typescript
import { createInstance, defineCollection } from '@yassidev/knex-orm'

const schema = {
  users: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', nullable: false },
    name: { type: 'varchar', nullable: true },
  }),
} as const

const orm = createInstance(schema, {
  client: 'sqlite3',
  connection: { filename: ':memory:' },
  useNullAsDefault: true,
})

async function main() {
  // Migrate
  await orm.migrate()
  
  // Create
  const user = await orm.createOne('users', {
    email: 'user@example.com',
    name: 'John',
  })
  
  // Find
  const found = await orm.findOne('users', user.id)
  
  // Update
  await orm.updateOne('users', { id: { $eq: user.id } }, {
    name: 'John Updated',
  })
  
  // Delete
  await orm.removeOne('users', { id: { $eq: user.id } })
  
  // Cleanup
  await orm.destroy()
}

main().catch(console.error)
```

## Next Steps

- [Query Methods](/api/query-methods) - Detailed query API
- [Mutation Methods](/api/mutation-methods) - Detailed mutation API


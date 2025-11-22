# Mutation Methods API

The mutation methods allow you to create, update, and delete records in your database.

## create

Create multiple records.

### Signature

```typescript
create<N>(
  tableName: N,
  records: TableItemInput<S, N>[],
  options?: MutationOptions
): Promise<TableItem<S, N>[]>
```

### Parameters

- `tableName`: The name of the table
- `records`: Array of records to create
- `options`: Optional mutation options (transaction, etc.)

### Returns

A Promise that resolves to an array of created records.

### Examples

```typescript
// Create multiple users
const users = await orm.create('users', [
  { email: 'user1@example.com', name: 'User 1' },
  { email: 'user2@example.com', name: 'User 2' },
])

// Create with transaction
await orm.knex.transaction(async (trx) => {
  const users = await orm.create('users', [
    { email: 'user@example.com', name: 'User' },
  ], { trx })
})
```

## createOne

Create a single record.

### Signature

```typescript
createOne<N>(
  tableName: N,
  record: TableItemInput<S, N>,
  options?: MutationOptions
): Promise<TableItem<S, N>>
```

### Parameters

- `tableName`: The name of the table
- `record`: The record to create
- `options`: Optional mutation options

### Returns

A Promise that resolves to the created record.

### Examples

```typescript
// Create a user
const user = await orm.createOne('users', {
  email: 'user@example.com',
  name: 'John',
})

// Create with nested relations
const user = await orm.createOne('users', {
  email: 'user@example.com',
  name: 'John',
  profile: { bio: 'Developer' },
  posts: [{ title: 'First Post' }],
})
```

## update

Update multiple records.

### Signature

```typescript
update<N>(
  tableName: N,
  filter: FilterQuery<S, N>,
  patch: TableItemInput<S, N>,
  options?: MutationOptions
): Promise<number>
```

### Parameters

- `tableName`: The name of the table
- `filter`: Filter to match records to update
- `patch`: Fields to update
- `options`: Optional mutation options

### Returns

A Promise that resolves to the number of updated records.

### Examples

```typescript
// Update all active users
const count = await orm.update('users',
  { status: { $eq: 'active' } },
  { last_login: new Date() }
)

// Update with complex filter
const count = await orm.update('users',
  {
    $and: [
      { status: { $eq: 'active' } },
      { created_at: { $lt: new Date('2024-01-01') } },
    ],
  },
  { status: 'archived' }
)
```

## updateOne

Update a single record.

### Signature

```typescript
updateOne<N>(
  tableName: N,
  filter: FilterQuery<S, N>,
  patch: TableItemInput<S, N>,
  options?: MutationOptions
): Promise<TableItem<S, N> | undefined>
```

### Parameters

- `tableName`: The name of the table
- `filter`: Filter to match the record to update
- `patch`: Fields to update
- `options`: Optional mutation options

### Returns

A Promise that resolves to the updated record, or `undefined` if not found.

### Examples

```typescript
// Update by ID
const updated = await orm.updateOne('users',
  { id: { $eq: 1 } },
  { name: 'Updated Name' }
)

// Update by email
const updated = await orm.updateOne('users',
  { email: { $eq: 'user@example.com' } },
  { status: 'inactive' }
)

// Update with nested relations
const updated = await orm.updateOne('users',
  { id: { $eq: 1 } },
  {
    name: 'Updated Name',
    profile: { bio: 'Updated bio' },
  }
)
```

## remove

Remove multiple records.

### Signature

```typescript
remove<N>(
  tableName: N,
  filter: FilterQuery<S, N>,
  options?: MutationOptions
): Promise<number>
```

### Parameters

- `tableName`: The name of the table
- `filter`: Filter to match records to delete
- `options`: Optional mutation options

### Returns

A Promise that resolves to the number of deleted records.

### Examples

```typescript
// Remove all inactive users
const count = await orm.remove('users', {
  status: { $eq: 'inactive' },
})

// Remove with complex filter
const count = await orm.remove('users', {
  $and: [
    { status: { $eq: 'inactive' } },
    { created_at: { $lt: new Date('2024-01-01') } },
  ],
})
```

## removeOne

Remove a single record.

### Signature

```typescript
removeOne<N>(
  tableName: N,
  filter: FilterQuery<S, N>,
  options?: MutationOptions
): Promise<TableItem<S, N> | undefined>
```

### Parameters

- `tableName`: The name of the table
- `filter`: Filter to match the record to delete
- `options`: Optional mutation options

### Returns

A Promise that resolves to the deleted record, or `undefined` if not found.

### Examples

```typescript
// Remove by ID
const deleted = await orm.removeOne('users', {
  id: { $eq: 1 },
})

// Remove by email
const deleted = await orm.removeOne('users', {
  email: { $eq: 'user@example.com' },
})
```

## MutationOptions

All mutation methods accept an optional `MutationOptions` object:

```typescript
interface MutationOptions {
  trx?: Knex.Transaction
}
```

### Using Transactions

```typescript
await orm.knex.transaction(async (trx) => {
  const user = await orm.createOne('users', {
    email: 'user@example.com',
    name: 'John',
  }, { trx })
  
  await orm.createOne('posts', {
    title: 'My Post',
    author_id: user.id,
  }, { trx })
})
```

## Type Safety

All mutation methods are fully typed:

```typescript
// TypeScript knows table names
await orm.create('users', [...]) // ✅
await orm.create('invalid', [...]) // ❌ Error

// TypeScript knows required fields
await orm.createOne('users', {
  email: 'user@example.com', // ✅ Required
  // name is optional
})

// TypeScript knows field types
await orm.createOne('users', {
  email: 'user@example.com',
  age: 'not a number', // ❌ Error
})
```

## Error Handling

```typescript
try {
  const user = await orm.createOne('users', {
    email: 'existing@example.com', // Duplicate
    name: 'John',
  })
} catch (error) {
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    console.error('Email already exists')
  } else {
    console.error('Creation failed:', error)
  }
}
```

## Best Practices

1. **Use transactions for related operations**: Always use transactions when creating/updating related records
2. **Handle errors**: Always handle potential constraint violations
3. **Validate input**: Validate data before mutations
4. **Check return values**: Always check if `updateOne`/`removeOne` return a record

## Next Steps

- [Creating Records](/guide/creating-records) - Usage guide
- [Updating Records](/guide/updating-records) - Usage guide
- [Deleting Records](/guide/deleting-records) - Usage guide
- [Nested Mutations](/guide/nested-mutations) - Create related records


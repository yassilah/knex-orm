# Query Methods API

The query methods (`find` and `findOne`) allow you to retrieve records from your database.

## find

Find multiple records matching a query.

### Signature

```typescript
find<N, Columns>(
  tableName: N,
  params?: FindQueryParams<S, N, Columns>
): QueryBuilder | Promise<Result[]>
```

### Parameters

- `tableName`: The name of the table to query
- `params`: Optional query parameters

### Returns

- If no nested relations are loaded: Returns a Knex QueryBuilder
- If nested relations are loaded: Returns a Promise that resolves to an array of results

### Examples

```typescript
// Find all records
const users = await orm.find('users')

// Find with filter
const activeUsers = await orm.find('users', {
  where: { status: { $eq: 'active' } },
})

// Find with sorting and pagination
const users = await orm.find('users', {
  where: { status: { $eq: 'active' } },
  orderBy: ['-created_at'],
  limit: 10,
  offset: 0,
})

// Find with column selection
const users = await orm.find('users', {
  columns: ['id', 'email', 'name'],
})

// Find with relations
const posts = await orm.find('posts', {
  columns: ['title', 'author.email'],
})
```

### Query Parameters

#### where

Filter conditions. See [Filters](/guide/filters) for all operators.

```typescript
where: {
  status: { $eq: 'active' },
  age: { $gte: 18 },
}
```

#### columns

Select specific columns and relations.

```typescript
columns: ['id', 'email', 'author.name']
```

#### orderBy

Sort results. Prefix with `-` for descending.

```typescript
orderBy: ['-created_at', 'name']
```

#### limit

Limit the number of results.

```typescript
limit: 10
```

#### offset

Skip a number of results (for pagination).

```typescript
offset: 20
```

#### trx

Transaction to use for the query.

```typescript
trx: transactionInstance
```

## findOne

Find a single record.

### Signature

```typescript
findOne<N, Columns>(
  tableName: N,
  primaryKeyOrParams: PrimaryKey | FindQueryParams<S, N, Columns>,
  params?: FindQueryParams<S, N, Columns>
): Promise<Result | undefined>
```

### Parameters

- `tableName`: The name of the table to query
- `primaryKeyOrParams`: Either a primary key value or a query params object
- `params`: Optional additional query parameters (only used when first param is primary key)

### Returns

A Promise that resolves to the found record or `undefined`.

### Examples

```typescript
// Find by primary key
const user = await orm.findOne('users', 1)

// Find by primary key with additional params
const user = await orm.findOne('users', 1, {
  columns: ['id', 'email', 'posts.title'],
})

// Find with filter
const user = await orm.findOne('users', {
  where: { email: { $eq: 'user@example.com' } },
})

// Find with filter and column selection
const user = await orm.findOne('users', {
  where: { email: { $eq: 'user@example.com' } },
  columns: ['id', 'email', 'profile.bio'],
})
```

## Type Safety

Both methods are fully typed based on your schema:

```typescript
// TypeScript knows the table name
const users = await orm.find('users') // ✅
const invalid = await orm.find('invalid') // ❌ Error

// TypeScript knows the result structure
const user = await orm.findOne('users', 1)
// user.email is typed correctly
// user.invalidField is a TypeScript error

// TypeScript knows column names
const users = await orm.find('users', {
  columns: ['id', 'email'] // ✅
  columns: ['invalid'] // ❌ Error
})
```

## Working with Query Builders

When `find` returns a QueryBuilder (no nested relations), you can chain additional Knex methods:

```typescript
const qb = orm.find('users', {
  where: { status: { $eq: 'active' } },
})

// Chain additional Knex methods
const users = await qb
  .where('age', '>=', 18)
  .orderBy('name')
  .limit(10)
```

## Error Handling

```typescript
try {
  const user = await orm.findOne('users', 1)
  if (!user) {
    console.log('User not found')
  }
} catch (error) {
  console.error('Query failed:', error)
}
```

## Performance Tips

1. **Select only needed columns**: Use `columns` to limit data transfer
2. **Use indexes**: Ensure your filters use indexed columns
3. **Limit results**: Use `limit` to avoid loading too much data
4. **Load relations efficiently**: Use nested column selection instead of separate queries

## Next Steps

- [Finding Records](/guide/finding-records) - Usage guide
- [Filters](/guide/filters) - Filter operators
- [Selecting Columns](/guide/selecting-columns) - Column selection


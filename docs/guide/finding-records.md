# Finding Records

The `find` and `findOne` methods allow you to query your database with powerful filtering, sorting, and relation loading capabilities.

## Basic Finding

### Find All Records

Get all records from a table:

```typescript
const users = await orm.find('users')
// Returns: User[]
```

### Find One Record by Primary Key

Get a single record by its primary key:

```typescript
const user = await orm.findOne('users', 1)
// Returns: User | undefined
```

### Find One Record with Filter

Get a single record matching a filter:

```typescript
const user = await orm.findOne('users', {
  where: { email: { $eq: 'user@example.com' } },
})
// Returns: User | undefined
```

## Filtering

Use the `where` clause to filter records. See [Filters](/guide/filters) for all available operators.

```typescript
// Simple equality
const activeUsers = await orm.find('users', {
  where: { status: { $eq: 'active' } },
})

// Multiple conditions
const users = await orm.find('users', {
  where: {
    status: { $eq: 'active' },
    age: { $gte: 18 },
  },
})

// Using operators
const users = await orm.find('users', {
  where: {
    email: { $like: '%@example.com' },
    created_at: { $gte: new Date('2024-01-01') },
  },
})
```

## Sorting

Use `orderBy` to sort results. Prefix with `-` for descending order.

```typescript
// Ascending order
const users = await orm.find('users', {
  orderBy: ['email'],
})

// Descending order
const users = await orm.find('users', {
  orderBy: ['-created_at'],
})

// Multiple columns
const posts = await orm.find('posts', {
  orderBy: ['-created_at', 'title'],
})
```

## Pagination

Use `limit` and `offset` for pagination:

```typescript
// First page (10 records)
const page1 = await orm.find('users', {
  limit: 10,
  offset: 0,
})

// Second page
const page2 = await orm.find('users', {
  limit: 10,
  offset: 10,
})
```

## Selecting Columns

By default, all columns are selected. Use `columns` to select specific columns:

```typescript
// Select specific columns
const users = await orm.find('users', {
  columns: ['id', 'email', 'name'],
})

// Select nested relation columns
const posts = await orm.find('posts', {
  columns: ['title', 'author.email', 'author.name'],
})
```

See [Selecting Columns](/guide/selecting-columns) for more details.

## Querying Relations

You can filter by relation properties:

```typescript
// Find posts by active authors
const posts = await orm.find('posts', {
  where: {
    'author.status': { $eq: 'active' },
  },
})

// Find users with posts containing "hello"
const users = await orm.find('users', {
  where: {
    'posts.title': { $contains: 'hello' },
  },
})
```

## Complex Queries

### AND Conditions

```typescript
const users = await orm.find('users', {
  where: {
    $and: [
      { status: { $eq: 'active' } },
      { age: { $gte: 18 } },
      { email: { $like: '%@example.com' } },
    ],
  },
})
```

### OR Conditions

```typescript
const users = await orm.find('users', {
  where: {
    $or: [
      { status: { $eq: 'active' } },
      { status: { $eq: 'pending' } },
    ],
  },
})
```

### Combining AND and OR

```typescript
const users = await orm.find('users', {
  where: {
    $and: [
      { age: { $gte: 18 } },
      {
        $or: [
          { status: { $eq: 'active' } },
          { status: { $eq: 'pending' } },
        ],
      },
    ],
  },
})
```

## Loading Relations

Load related records using nested column selection:

```typescript
// Load posts with author information
const posts = await orm.find('posts', {
  columns: [
    'id',
    'title',
    'content',
    'author.id',
    'author.email',
    'author.name',
  ],
})

// Load users with their posts
const users = await orm.find('users', {
  columns: [
    'id',
    'email',
    'posts.id',
    'posts.title',
  ],
})

// Load nested relations
const posts = await orm.find('posts', {
  columns: [
    'title',
    'author.email',
    'author.profile.bio',
  ],
})
```

## Using Transactions

You can pass a transaction to queries:

```typescript
await orm.knex.transaction(async (trx) => {
  const user = await orm.findOne('users', 1, { trx })
  const posts = await orm.find('posts', {
    where: { author_id: { $eq: user.id } },
    trx,
  })
})
```

## Return Types

### find()

Returns a Knex query builder or a Promise depending on whether relations are loaded:

```typescript
// Without relations - returns Knex query builder
const qb = orm.find('users', { where: { status: { $eq: 'active' } } })
const users = await qb

// With relations - returns Promise
const users = await orm.find('users', {
  columns: ['email', 'posts.title'],
})
```

### findOne()

Always returns a Promise:

```typescript
const user = await orm.findOne('users', 1)
// Returns: User | undefined
```

## Examples

### Find Active Users with Their Posts

```typescript
const users = await orm.find('users', {
  where: { status: { $eq: 'active' } },
  columns: [
    'id',
    'email',
    'name',
    'posts.id',
    'posts.title',
    'posts.created_at',
  ],
  orderBy: ['-created_at'],
  limit: 10,
})
```

### Find Recent Posts by Active Authors

```typescript
const posts = await orm.find('posts', {
  where: {
    'author.status': { $eq: 'active' },
  },
  columns: [
    'id',
    'title',
    'content',
    'author.email',
    'author.name',
  ],
  orderBy: ['-created_at'],
  limit: 20,
})
```

### Search Users

```typescript
const searchTerm = 'john'

const users = await orm.find('users', {
  where: {
    $or: [
      { name: { $contains: searchTerm } },
      { email: { $contains: searchTerm } },
    ],
  },
  orderBy: ['name'],
})
```

## Next Steps

- [Filters](/guide/filters) - Learn about all available filter operators
- [Selecting Columns](/guide/selecting-columns) - Deep dive into column selection
- [Creating Records](/guide/creating-records) - Learn how to create records


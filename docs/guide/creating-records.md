# Creating Records

The `create` and `createOne` methods allow you to insert new records into your database, with support for nested relations.

## Basic Creation

### Create One Record

```typescript
const user = await orm.createOne('users', {
  email: 'user@example.com',
  name: 'John Doe',
  status: 'active',
})

// Returns: User
```

### Create Multiple Records

```typescript
const users = await orm.create('users', [
  { email: 'user1@example.com', name: 'User 1' },
  { email: 'user2@example.com', name: 'User 2' },
  { email: 'user3@example.com', name: 'User 3' },
])

// Returns: User[]
```

## Handling Primary Keys

### Auto-Incrementing IDs

If your primary key is auto-incrementing, you don't need to provide it:

```typescript
const user = await orm.createOne('users', {
  email: 'user@example.com',
  name: 'John',
  // id is auto-generated
})
```

### Manual Primary Keys

You can provide your own primary key value:

```typescript
const user = await orm.createOne('users', {
  id: 100,
  email: 'user@example.com',
  name: 'John',
})
```

### UUID Primary Keys

For UUID primary keys, generate the UUID yourself:

```typescript
import { randomUUID } from 'crypto'

const user = await orm.createOne('users', {
  id: randomUUID(),
  email: 'user@example.com',
  name: 'John',
})
```

## Default Values

Columns with default values will use them if not provided:

```typescript
// Schema: status has default 'active'
const user = await orm.createOne('users', {
  email: 'user@example.com',
  name: 'John',
  // status will be 'active' (from default)
})

// You can still override defaults
const user = await orm.createOne('users', {
  email: 'user@example.com',
  name: 'John',
  status: 'inactive', // Override default
})
```

## Nullable vs Required Fields

### Required Fields

Fields with `nullable: false` must be provided:

```typescript
// Schema: email is required (nullable: false)
const user = await orm.createOne('users', {
  email: 'user@example.com', // Required
  name: 'John',
})
```

### Optional Fields

Fields with `nullable: true` (or default) can be omitted:

```typescript
// Schema: bio is optional (nullable: true)
const user = await orm.createOne('users', {
  email: 'user@example.com',
  name: 'John',
  // bio is optional, can be omitted
})
```

## Using Transactions

Create records within a transaction:

```typescript
await orm.knex.transaction(async (trx) => {
  const user = await orm.createOne('users', {
    email: 'user@example.com',
    name: 'John',
  }, { trx })
  
  const post = await orm.createOne('posts', {
    title: 'My Post',
    author_id: user.id,
  }, { trx })
})
```

## Nested Mutations

You can create related records in a single operation. See [Nested Mutations](/guide/nested-mutations) for details.

```typescript
// Create user with profile and posts
const user = await orm.createOne('users', {
  email: 'user@example.com',
  name: 'John',
  profile: { bio: 'Developer' }, // has-one
  posts: [                       // has-many
    { title: 'First Post' },
    { title: 'Second Post' },
  ],
})
```

## Return Values

### createOne()

Returns the created record:

```typescript
const user = await orm.createOne('users', {
  email: 'user@example.com',
  name: 'John',
})

console.log(user.id)      // 1
console.log(user.email)   // 'user@example.com'
console.log(user.name)    // 'John'
```

### create()

Returns an array of created records:

```typescript
const users = await orm.create('users', [
  { email: 'user1@example.com', name: 'User 1' },
  { email: 'user2@example.com', name: 'User 2' },
])

console.log(users.length) // 2
console.log(users[0].id)  // 1
console.log(users[1].id)  // 2
```

## Error Handling

### Unique Constraint Violations

If you try to create a record with a duplicate unique value:

```typescript
try {
  await orm.createOne('users', {
    email: 'existing@example.com', // Already exists
    name: 'John',
  })
} catch (error) {
  // Handle unique constraint violation
  console.error('Email already exists')
}
```

### Required Field Missing

If you omit a required field:

```typescript
try {
  await orm.createOne('users', {
    name: 'John',
    // email is required but missing
  })
} catch (error) {
  // Handle validation error
  console.error('Email is required')
}
```

## Examples

### Create User with Profile

```typescript
const user = await orm.createOne('users', {
  email: 'alice@example.com',
  name: 'Alice',
  status: 'active',
})

const profile = await orm.createOne('profiles', {
  user_id: user.id,
  bio: 'Software developer',
  avatar_url: 'https://example.com/avatar.jpg',
})
```

### Bulk Create

```typescript
const users = await orm.create('users', [
  { email: 'user1@example.com', name: 'User 1', status: 'active' },
  { email: 'user2@example.com', name: 'User 2', status: 'active' },
  { email: 'user3@example.com', name: 'User 3', status: 'pending' },
])
```

### Create with JSON Data

```typescript
const user = await orm.createOne('users', {
  email: 'user@example.com',
  name: 'John',
  metadata: {
    preferences: {
      theme: 'dark',
      notifications: true,
    },
    lastLogin: new Date().toISOString(),
  },
})
```

## Best Practices

1. **Use transactions for related operations**: If creating multiple related records, use a transaction.

2. **Handle errors gracefully**: Always handle potential constraint violations.

3. **Validate input**: Validate data before creating records.

4. **Use nested mutations when appropriate**: For related records, consider using nested mutations instead of multiple create calls.

## Next Steps

- [Nested Mutations](/guide/nested-mutations) - Create related records in one operation
- [Updating Records](/guide/updating-records) - Learn how to update records
- [Deleting Records](/guide/deleting-records) - Learn how to delete records


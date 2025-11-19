# Updating Records

The `update` and `updateOne` methods allow you to modify existing records in your database.

## Basic Updates

### Update One Record

Update a single record matching a filter:

```typescript
const updated = await orm.updateOne('users', 
  { email: { $eq: 'user@example.com' } },
  { name: 'John Updated', status: 'inactive' }
)

// Returns: User | undefined (the updated record, or undefined if not found)
```

### Update Multiple Records

Update all records matching a filter:

```typescript
const count = await orm.update('users',
  { status: { $eq: 'active' } },
  { last_login: new Date() }
)

// Returns: number (count of updated records)
```

## Update by Primary Key

You can also update using a filter that matches the primary key:

```typescript
const updated = await orm.updateOne('users',
  { id: { $eq: 1 } },
  { name: 'Updated Name' }
)
```

## Partial Updates

You only need to provide the fields you want to update:

```typescript
// Update only the name
await orm.updateOne('users',
  { id: { $eq: 1 } },
  { name: 'New Name' }
)

// Update multiple fields
await orm.updateOne('users',
  { id: { $eq: 1 } },
  {
    name: 'New Name',
    status: 'inactive',
    updated_at: new Date(),
  }
)
```

## Setting Null Values

To set a field to null, explicitly pass `null`:

```typescript
await orm.updateOne('users',
  { id: { $eq: 1 } },
  { deleted_at: null }
)
```

## Using Transactions

Update records within a transaction:

```typescript
await orm.knex.transaction(async (trx) => {
  await orm.updateOne('users',
    { id: { $eq: 1 } },
    { status: 'inactive' },
    { trx }
  )
  
  await orm.updateOne('posts',
    { author_id: { $eq: 1 } },
    { published: false },
    { trx }
  )
})
```

## Nested Updates

You can update related records using nested mutations. See [Nested Mutations](/guide/nested-mutations) for details.

```typescript
// Update user and their profile
await orm.updateOne('users',
  { id: { $eq: 1 } },
  {
    name: 'Updated Name',
    profile: { bio: 'Updated bio' }, // Updates related profile
  }
)
```

## Conditional Updates

Use filters to conditionally update records:

```typescript
// Only update if status is 'active'
await orm.update('users',
  {
    $and: [
      { id: { $eq: 1 } },
      { status: { $eq: 'active' } },
    ],
  },
  { status: 'inactive' }
)
```

## Increment/Decrement Values

For numeric fields, you can increment or decrement:

```typescript
// Note: This requires fetching, updating, and saving
const user = await orm.findOne('users', 1)
if (user) {
  await orm.updateOne('users',
    { id: { $eq: 1 } },
    { view_count: (user.view_count || 0) + 1 }
  )
}
```

## Return Values

### updateOne()

Returns the updated record, or `undefined` if no record was found:

```typescript
const updated = await orm.updateOne('users',
  { id: { $eq: 1 } },
  { name: 'New Name' }
)

if (updated) {
  console.log(updated.name) // 'New Name'
} else {
  console.log('User not found')
}
```

### update()

Returns the number of records updated:

```typescript
const count = await orm.update('users',
  { status: { $eq: 'active' } },
  { last_login: new Date() }
)

console.log(`Updated ${count} users`)
```

## Error Handling

### Record Not Found

If `updateOne` doesn't find a matching record, it returns `undefined`:

```typescript
const updated = await orm.updateOne('users',
  { id: { $eq: 999 } }, // Non-existent ID
  { name: 'New Name' }
)

if (!updated) {
  console.log('User not found')
}
```

### Unique Constraint Violations

If updating would violate a unique constraint:

```typescript
try {
  await orm.updateOne('users',
    { id: { $eq: 1 } },
    { email: 'existing@example.com' } // Already exists
  )
} catch (error) {
  // Handle unique constraint violation
  console.error('Email already exists')
}
```

## Examples

### Update User Profile

```typescript
const user = await orm.updateOne('users',
  { email: { $eq: 'user@example.com' } },
  {
    name: 'Updated Name',
    status: 'active',
    updated_at: new Date(),
  }
)
```

### Bulk Update

```typescript
// Mark all inactive users as archived
const count = await orm.update('users',
  { status: { $eq: 'inactive' } },
  { status: 'archived' }
)

console.log(`Archived ${count} users`)
```

### Update with JSON Data

```typescript
await orm.updateOne('users',
  { id: { $eq: 1 } },
  {
    metadata: {
      preferences: {
        theme: 'dark',
        notifications: true,
      },
    },
  }
)
```

### Update Related Records

```typescript
// Update user and their posts
await orm.updateOne('users',
  { id: { $eq: 1 } },
  {
    name: 'Updated Name',
    posts: [
      { id: 1, title: 'Updated Post Title' },
      { title: 'New Post' }, // Creates new post
    ],
  }
)
```

## Best Practices

1. **Use specific filters**: Be specific with your filters to avoid updating unintended records.

2. **Check return values**: Always check if `updateOne` returns a record.

3. **Use transactions**: For multiple related updates, use transactions.

4. **Validate input**: Validate data before updating records.

5. **Handle errors**: Always handle potential constraint violations.

## Next Steps

- [Nested Mutations](/guide/nested-mutations) - Update related records in one operation
- [Deleting Records](/guide/deleting-records) - Learn how to delete records
- [Creating Records](/guide/creating-records) - Learn how to create records


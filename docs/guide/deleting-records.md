# Deleting Records

The `remove` and `removeOne` methods allow you to delete records from your database.

## Basic Deletion

### Remove One Record

Delete a single record matching a filter:

```typescript
const deleted = await orm.removeOne('users', {
  email: { $eq: 'user@example.com' },
})

// Returns: User | undefined (the deleted record, or undefined if not found)
```

### Remove Multiple Records

Delete all records matching a filter:

```typescript
const count = await orm.remove('users', {
  status: { $eq: 'inactive' },
})

// Returns: number (count of deleted records)
```

## Delete by Primary Key

You can delete using a filter that matches the primary key:

```typescript
const deleted = await orm.removeOne('users', {
  id: { $eq: 1 },
})
```

## Using Transactions

Delete records within a transaction:

```typescript
await orm.knex.transaction(async (trx) => {
  // Delete user's posts first
  await orm.remove('posts',
    { author_id: { $eq: 1 } },
    { trx }
  )
  
  // Then delete the user
  await orm.removeOne('users',
    { id: { $eq: 1 } },
    { trx }
  )
})
```

## Return Values

### removeOne()

Returns the deleted record, or `undefined` if no record was found:

```typescript
const deleted = await orm.removeOne('users', {
  id: { $eq: 1 },
})

if (deleted) {
  console.log(`Deleted user: ${deleted.email}`)
} else {
  console.log('User not found')
}
```

### remove()

Returns the number of records deleted:

```typescript
const count = await orm.remove('users', {
  status: { $eq: 'inactive' },
})

console.log(`Deleted ${count} users`)
```

## Error Handling

### Record Not Found

If `removeOne` doesn't find a matching record, it returns `undefined`:

```typescript
const deleted = await orm.removeOne('users', {
  id: { $eq: 999 }, // Non-existent ID
})

if (!deleted) {
  console.log('User not found')
}
```

### Foreign Key Constraints

If deleting a record would violate a foreign key constraint (e.g., another table references it), the operation will fail:

```typescript
try {
  // This will fail if posts reference this user
  await orm.removeOne('users', { id: { $eq: 1 } })
} catch (error) {
  // Handle foreign key constraint violation
  console.error('Cannot delete user with existing posts')
}
```

To handle this, you can:

1. **Delete related records first**:

```typescript
// Delete posts first
await orm.remove('posts', { author_id: { $eq: 1 } })

// Then delete user
await orm.removeOne('users', { id: { $eq: 1 } })
```

2. **Use CASCADE deletes** (if configured in your schema):

```typescript
// If foreign key has onDelete: 'CASCADE', related records are deleted automatically
await orm.removeOne('users', { id: { $eq: 1 } })
```

## Examples

### Delete User

```typescript
const deleted = await orm.removeOne('users', {
  email: { $eq: 'user@example.com' },
})

if (deleted) {
  console.log(`Deleted user: ${deleted.name}`)
}
```

### Bulk Delete

```typescript
// Delete all inactive users
const count = await orm.remove('users', {
  status: { $eq: 'inactive' },
})

console.log(`Deleted ${count} inactive users`)
```

### Delete with Conditions

```typescript
// Delete users created before a certain date
const cutoffDate = new Date('2024-01-01')

const count = await orm.remove('users', {
  $and: [
    { status: { $eq: 'inactive' } },
    { created_at: { $lt: cutoffDate } },
  ],
})
```

### Cascade Delete

```typescript
// Delete user and all related records
await orm.knex.transaction(async (trx) => {
  // Delete posts
  await orm.remove('posts',
    { author_id: { $eq: 1 } },
    { trx }
  )
  
  // Delete profile
  await orm.removeOne('profiles',
    { user_id: { $eq: 1 } },
    { trx }
  )
  
  // Delete user
  await orm.removeOne('users',
    { id: { $eq: 1 } },
    { trx }
  )
})
```

## Soft Deletes

If you want to implement soft deletes (marking records as deleted instead of actually deleting them), you can use `update`:

```typescript
// Soft delete
await orm.updateOne('users',
  { id: { $eq: 1 } },
  { deleted_at: new Date() }
)

// Query excluding soft-deleted records
const users = await orm.find('users', {
  where: { deleted_at: { $null: true } },
})
```

## Best Practices

1. **Be careful with bulk deletes**: Always double-check your filters before deleting multiple records.

2. **Handle foreign key constraints**: Delete related records first, or use CASCADE deletes.

3. **Use transactions**: For multiple related deletions, use transactions.

4. **Check return values**: Always check if `removeOne` returns a record.

5. **Consider soft deletes**: For important data, consider implementing soft deletes instead of hard deletes.

6. **Backup before bulk operations**: Always backup your database before performing bulk delete operations.

## Next Steps

- [Creating Records](/guide/creating-records) - Learn how to create records
- [Updating Records](/guide/updating-records) - Learn how to update records
- [Transactions](/guide/transactions) - Learn about transaction management


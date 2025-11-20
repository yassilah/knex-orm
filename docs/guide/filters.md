# Filters

Filters allow you to query records based on specific conditions. `@yassidev/knex-orm` provides MongoDB-like filter operators for powerful querying.

## Basic Filtering

### Equality

```typescript
// Exact match
const users = await orm.find('users', {
  where: { email: { $eq: 'user@example.com' } },
})

// Shorthand (when using $eq, you can omit the operator)
const users = await orm.find('users', {
  where: { email: 'user@example.com' },
})
```

### Inequality

```typescript
const users = await orm.find('users', {
  where: { status: { $neq: 'inactive' } },
})
```

## Comparison Operators

### Greater Than / Less Than

```typescript
// Greater than
const users = await orm.find('users', {
  where: { age: { $gt: 18 } },
})

// Greater than or equal
const users = await orm.find('users', {
  where: { age: { $gte: 18 } },
})

// Less than
const products = await orm.find('products', {
  where: { price: { $lt: 100 } },
})

// Less than or equal
const products = await orm.find('products', {
  where: { price: { $lte: 100 } },
})
```

### Between

```typescript
// Between two values (inclusive)
const products = await orm.find('products', {
  where: { price: { $between: [10, 100] } },
})

// Not between
const products = await orm.find('products', {
  where: { price: { $nbetween: [10, 100] } },
})
```

## Array Operators

### In

```typescript
// Value is in array
const users = await orm.find('users', {
  where: { status: { $in: ['active', 'pending'] } },
})

// Not in array
const users = await orm.find('users', {
  where: { status: { $nin: ['inactive', 'banned'] } },
})
```

## String Operators

### Contains

```typescript
// Contains substring (case-sensitive)
const users = await orm.find('users', {
  where: { name: { $contains: 'john' } },
})

// Does not contain
const users = await orm.find('users', {
  where: { name: { $ncontains: 'admin' } },
})
```

### Starts With / Ends With

```typescript
// Starts with
const users = await orm.find('users', {
  where: { email: { $startsWith: 'admin' } },
})

// Does not start with
const users = await orm.find('users', {
  where: { email: { $nstartsWith: 'test' } },
})

// Ends with
const users = await orm.find('users', {
  where: { email: { $endsWith: '@example.com' } },
})

// Does not end with
const users = await orm.find('users', {
  where: { email: { $nendsWith: '@test.com' } },
})
```

### Like

```typescript
// SQL LIKE pattern
const users = await orm.find('users', {
  where: { email: { $like: '%@example.com' } },
})

// Not like
const users = await orm.find('users', {
  where: { email: { $nlike: '%@test.com' } },
})
```

## Null Operators

### Is Null / Is Not Null

```typescript
// Is null
const users = await orm.find('users', {
  where: { deleted_at: { $null: true } },
})

// Is not null
const users = await orm.find('users', {
  where: { email: { $nnull: true } },
})
```

## Logical Operators

### AND

Combine multiple conditions (all must be true):

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

### OR

Match any condition:

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

## Filtering Relations

You can filter by properties of related records:

```typescript
// Filter posts by author's status
const posts = await orm.find('posts', {
  where: {
    'author.status': { $eq: 'active' },
  },
})

// Filter users by their posts
const users = await orm.find('users', {
  where: {
    'posts.title': { $contains: 'hello' },
  },
})

// Nested relation filtering
const posts = await orm.find('posts', {
  where: {
    'author.profile.bio': { $contains: 'developer' },
  },
})
```

## Complete Operator Reference

| Operator | Description | Example |
|----------|-------------|---------|
| `$eq` | Equal | `{ age: { $eq: 18 } }` |
| `$neq` | Not equal | `{ status: { $neq: 'inactive' } }` |
| `$gt` | Greater than | `{ age: { $gt: 18 } }` |
| `$gte` | Greater than or equal | `{ age: { $gte: 18 } }` |
| `$lt` | Less than | `{ price: { $lt: 100 } }` |
| `$lte` | Less than or equal | `{ price: { $lte: 100 } }` |
| `$in` | In array | `{ status: { $in: ['active', 'pending'] } }` |
| `$nin` | Not in array | `{ status: { $nin: ['inactive'] } }` |
| `$between` | Between values | `{ price: { $between: [10, 100] } }` |
| `$nbetween` | Not between | `{ price: { $nbetween: [10, 100] } }` |
| `$contains` | Contains substring | `{ name: { $contains: 'john' } }` |
| `$ncontains` | Does not contain | `{ name: { $ncontains: 'admin' } }` |
| `$startsWith` | Starts with | `{ email: { $startsWith: 'admin' } }` |
| `$nstartsWith` | Does not start with | `{ email: { $nstartsWith: 'test' } }` |
| `$endsWith` | Ends with | `{ email: { $endsWith: '@example.com' } }` |
| `$nendsWith` | Does not end with | `{ email: { $nendsWith: '@test.com' } }` |
| `$like` | SQL LIKE | `{ email: { $like: '%@example.com' } }` |
| `$nlike` | Not LIKE | `{ email: { $nlike: '%@test.com' } }` |
| `$null` | Is null | `{ deleted_at: { $null: true } }` |
| `$nnull` | Is not null | `{ email: { $nnull: true } }` |

## Examples

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
})
```

### Find Active Users Created This Year

```typescript
const startOfYear = new Date('2024-01-01')

const users = await orm.find('users', {
  where: {
    $and: [
      { status: { $eq: 'active' } },
      { created_at: { $gte: startOfYear } },
    ],
  },
})
```

### Find Products in Price Range

```typescript
const products = await orm.find('products', {
  where: {
    $and: [
      { price: { $between: [10, 100] } },
      { stock: { $gt: 0 } },
      { is_active: { $eq: true } },
    ],
  },
  orderBy: ['price'],
})
```

## Next Steps

- [Finding Records](/guide/finding-records) - Learn how to use filters in queries
- [Selecting Columns](/guide/selecting-columns) - Select specific columns and relations


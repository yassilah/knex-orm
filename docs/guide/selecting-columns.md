# Selecting Columns

By default, `find` and `findOne` return all columns from the queried table. You can use the `columns` option to select specific columns and load related data.

## Basic Column Selection

Select specific columns from a table:

```typescript
// Select only id and email
const users = await orm.find('users', {
  columns: ['id', 'email'],
})

// Select with ordering and filtering
const users = await orm.find('users', {
  columns: ['id', 'email', 'name'],
  where: { status: { $eq: 'active' } },
  orderBy: ['name'],
})
```

## Selecting Relation Columns

Use dot notation to select columns from related tables:

```typescript
// Select post title and author email
const posts = await orm.find('posts', {
  columns: ['title', 'author.email', 'author.name'],
})

// Select user with their posts
const users = await orm.find('users', {
  columns: ['email', 'posts.title', 'posts.content'],
})
```

## Nested Relations

You can select columns from deeply nested relations:

```typescript
// Select post with author and author's profile
const posts = await orm.find('posts', {
  columns: [
    'title',
    'content',
    'author.email',
    'author.name',
    'author.profile.bio',
  ],
})
```

## Has-One Relations

For `has-one` relations, the related record is returned as an object:

```typescript
const users = await orm.find('users', {
  columns: ['email', 'profile.bio', 'profile.avatar_url'],
})

// Result:
// [
//   {
//     email: 'user@example.com',
//     profile: {
//       bio: 'Developer',
//       avatar_url: 'https://...',
//     },
//   },
// ]
```

## Has-Many Relations

For `has-many` relations, the related records are returned as an array:

```typescript
const users = await orm.find('users', {
  columns: ['email', 'posts.title', 'posts.content'],
})

// Result:
// [
//   {
//     email: 'user@example.com',
//     posts: [
//       { title: 'Post 1', content: '...' },
//       { title: 'Post 2', content: '...' },
//     ],
//   },
// ]
```

## Many-to-Many Relations

Many-to-many relations also return arrays:

```typescript
const posts = await orm.find('posts', {
  columns: ['title', 'tags.name'],
})

// Result:
// [
//   {
//     title: 'My Post',
//     tags: [
//       { name: 'javascript' },
//       { name: 'typescript' },
//     ],
//   },
// ]
```

## Mixed Selection

You can mix base columns and relation columns:

```typescript
const posts = await orm.find('posts', {
  columns: [
    'id',           // Base column
    'title',        // Base column
    'content',      // Base column
    'author.id',    // Relation column
    'author.email', // Relation column
    'tags.name',    // Many-to-many relation
  ],
})
```

## Selecting All Base Columns

If you want all base columns but specific relation columns, omit base columns from the array:

```typescript
// All base columns + specific relation columns
const posts = await orm.find('posts', {
  columns: [
    'author.email',
    'tags.name',
  ],
})

// This will return all post columns plus the specified relation columns
```

## Performance Considerations

### Selecting Only What You Need

Selecting only the columns you need can improve performance:

```typescript
// Good: Only select what you need
const users = await orm.find('users', {
  columns: ['id', 'email'],
})

// Less efficient: Select all columns
const users = await orm.find('users')
```

### Loading Relations

Loading relations uses JOINs, which can be more efficient than separate queries:

```typescript
// Efficient: Single query with JOINs
const posts = await orm.find('posts', {
  columns: ['title', 'author.email'],
})

// Less efficient: Multiple queries
const posts = await orm.find('posts', { columns: ['title'] })
for (const post of posts) {
  const author = await orm.findOne('users', post.author_id)
}
```

## Examples

### User Dashboard Data

```typescript
const user = await orm.findOne('users', userId, {
  columns: [
    'id',
    'email',
    'name',
    'profile.bio',
    'profile.avatar_url',
    'posts.id',
    'posts.title',
    'posts.created_at',
  ],
})
```

### Post with Full Author Information

```typescript
const post = await orm.findOne('posts', postId, {
  columns: [
    'id',
    'title',
    'content',
    'created_at',
    'author.id',
    'author.email',
    'author.name',
    'author.profile.bio',
    'tags.name',
  ],
})
```

### User List with Post Counts

```typescript
const users = await orm.find('users', {
  columns: [
    'id',
    'email',
    'name',
    'posts.id', // We can count these in application code
  ],
})
```

## Type Safety

TypeScript will infer the correct types based on your column selection:

```typescript
const users = await orm.find('users', {
  columns: ['id', 'email', 'posts.title'],
})

// TypeScript knows:
// - users is an array
// - Each user has id, email, and posts array
// - Each post in posts has a title
```

## Next Steps

- [Finding Records](/guide/finding-records) - Learn more about querying
- [Relations](/guide/relations) - Understand relation types
- [Nested Mutations](/guide/nested-mutations) - Create related records


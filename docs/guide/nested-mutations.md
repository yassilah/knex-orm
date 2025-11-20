# Nested Mutations

Nested mutations allow you to create or update related records in a single operation. This is one of the most powerful features of `@yassidev/knex-orm`.

## Overview

When creating or updating a record, you can include related records in the same operation:

```typescript
// Create user with profile and posts
await orm.createOne('users', {
  email: 'user@example.com',
  name: 'John',
  profile: { bio: 'Developer' },        // has-one
  posts: [                             // has-many
    { title: 'First Post' },
    { title: 'Second Post' },
  ],
  roles: [                             // many-to-many
    { name: 'admin' },
  ],
})
```

## Belongs-To Relations

`belongs-to` relations are handled first, before the parent record is created:

```typescript
const schema = {
  posts: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
    author: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
  }),
}

// Create post with author
await orm.createOne('posts', {
  title: 'My Post',
  author: { email: 'author@example.com', name: 'Author' },
})
```

**What happens:**
1. The author is created/updated first
2. The post is created with `author_id` set to the author's ID

## Has-One Relations

`has-one` relations are handled after the parent record is created:

```typescript
const schema = {
  users: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', nullable: false },
    profile: { type: 'has-one', target: 'profiles', foreignKey: 'user_id' },
  }),
  profiles: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    user_id: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
    bio: { type: 'text', nullable: true },
  }),
}

// Create user with profile
await orm.createOne('users', {
  email: 'user@example.com',
  name: 'John',
  profile: { bio: 'Developer' },
})
```

**What happens:**
1. The user is created first
2. The profile is created with `user_id` set to the user's ID

## Has-Many Relations

`has-many` relations create multiple related records:

```typescript
const schema = {
  users: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', nullable: false },
    posts: { type: 'has-many', target: 'posts', foreignKey: 'author_id' },
  }),
  posts: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
    author_id: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
  }),
}

// Create user with multiple posts
await orm.createOne('users', {
  email: 'user@example.com',
  name: 'John',
  posts: [
    { title: 'First Post', content: '...' },
    { title: 'Second Post', content: '...' },
  ],
})
```

**What happens:**
1. The user is created first
2. Each post is created with `author_id` set to the user's ID

## Many-to-Many Relations

`many-to-many` relations use a junction table:

```typescript
const schema = {
  posts: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
    tags: {
      type: 'many-to-many',
      target: 'tags',
      foreignKey: 'id',
      through: {
        table: 'post_tags',
        sourceFk: 'post_id',
        targetFk: 'tag_id',
      },
    },
  }),
  tags: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    name: { type: 'varchar', unique: true, nullable: false },
  }),
  post_tags: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    post_id: { type: 'belongs-to', target: 'posts', foreignKey: 'id' },
    tag_id: { type: 'belongs-to', target: 'tags', foreignKey: 'id' },
  }),
}

// Create post with tags
await orm.createOne('posts', {
  title: 'My Post',
  tags: [
    { name: 'javascript' },
    { name: 'typescript' },
  ],
})
```

**What happens:**
1. The post is created first
2. Each tag is created or found (if it already exists)
3. Junction table records are created linking the post to tags

## Upsert Behavior

When creating related records, the ORM will:

1. **Create new records** if they don't exist
2. **Update existing records** if they have a primary key that matches

```typescript
// If tag with name 'javascript' exists, it will be updated
// Otherwise, a new tag will be created
await orm.createOne('posts', {
  title: 'My Post',
  tags: [
    { id: 1, name: 'Updated JavaScript' }, // Updates existing tag
    { name: 'New Tag' },                    // Creates new tag
  ],
})
```

## Updating with Nested Mutations

You can also update related records:

```typescript
// Update user and their profile
await orm.updateOne('users',
  { id: { $eq: 1 } },
  {
    name: 'Updated Name',
    profile: { bio: 'Updated bio' },
  }
)

// Update user and their posts
await orm.updateOne('users',
  { id: { $eq: 1 } },
  {
    name: 'Updated Name',
    posts: [
      { id: 1, title: 'Updated Post' }, // Updates existing post
      { title: 'New Post' },             // Creates new post
    ],
  }
)
```

## Many-to-Many Updates

For many-to-many relations, updating replaces the existing relationships:

```typescript
// This will:
// 1. Remove all existing tag relationships for this post
// 2. Create new relationships with the provided tags
await orm.updateOne('posts',
  { id: { $eq: 1 } },
  {
    title: 'Updated Post',
    tags: [
      { name: 'new-tag-1' },
      { name: 'new-tag-2' },
    ],
  }
)
```

## Complex Nested Mutations

You can nest relations deeply:

```typescript
// Create user with profile, posts, and tags
await orm.createOne('users', {
  email: 'user@example.com',
  name: 'John',
  profile: {
    bio: 'Developer',
    avatar_url: 'https://...',
  },
  posts: [
    {
      title: 'First Post',
      content: '...',
      tags: [
        { name: 'javascript' },
        { name: 'typescript' },
      ],
    },
    {
      title: 'Second Post',
      content: '...',
      tags: [
        { name: 'react' },
      ],
    },
  ],
})
```

## Using Transactions

All nested mutations run within a transaction automatically, so if any part fails, everything is rolled back:

```typescript
// If creating the profile fails, the user creation is also rolled back
await orm.createOne('users', {
  email: 'user@example.com',
  name: 'John',
  profile: { bio: 'Developer' },
})
```

## Examples

### Create Blog Post with Author and Tags

```typescript
const post = await orm.createOne('posts', {
  title: 'Getting Started with TypeScript',
  content: '...',
  author: {
    email: 'author@example.com',
    name: 'John Author',
  },
  tags: [
    { name: 'typescript' },
    { name: 'tutorial' },
    { name: 'beginner' },
  ],
})
```

### Update User with Related Data

```typescript
await orm.updateOne('users',
  { id: { $eq: 1 } },
  {
    name: 'Updated Name',
    profile: {
      bio: 'Senior Developer',
      avatar_url: 'https://...',
    },
    posts: [
      { id: 1, title: 'Updated Post Title' },
      { title: 'New Post' },
    ],
  }
)
```

### Create User with Roles

```typescript
const user = await orm.createOne('users', {
  email: 'admin@example.com',
  name: 'Admin User',
  roles: [
    { name: 'admin' },
    { name: 'editor' },
  ],
})
```

## Best Practices

1. **Use nested mutations for convenience**: They're great for creating related records in one operation.

2. **Be aware of upsert behavior**: Related records with primary keys will be updated, not created.

3. **Many-to-many replaces relationships**: Updating many-to-many relations replaces all existing relationships.

4. **Transactions are automatic**: All nested mutations run in transactions automatically.

5. **Handle errors**: If any part of a nested mutation fails, everything is rolled back.

## Next Steps

- [Creating Records](/guide/creating-records) - Learn basic creation
- [Updating Records](/guide/updating-records) - Learn basic updates
- [Relations](/guide/relations) - Understand relation types


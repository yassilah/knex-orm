# Quick Start

This guide will walk you through creating a simple blog application with users, posts, and tags to demonstrate the core features of `@yassi/knex-orm`.

## Step 1: Define Your Schema

First, let's define our database schema:

```typescript
import { createInstance, defineCollection } from '@yassi/knex-orm'
import type { Instance } from '@yassi/knex-orm'

const schema = {
  users: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', unique: true, nullable: false },
    name: { type: 'varchar', nullable: false },
    posts: { type: 'has-many', target: 'posts', foreignKey: 'author_id' },
  }),
  
  posts: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
    content: { type: 'text', nullable: true },
    author_id: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
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
} as const

type Schema = typeof schema
```

## Step 2: Create the ORM Instance

Create an instance with your database configuration:

```typescript
// For SQLite (in-memory for testing)
const orm = createInstance(schema, {
  client: 'sqlite3',
  connection: { filename: ':memory:' },
  useNullAsDefault: true,
})

// For PostgreSQL
// const orm = createInstance(schema, {
//   client: 'pg',
//   connection: {
//     host: 'localhost',
//     port: 5432,
//     user: 'postgres',
//     password: 'password',
//     database: 'myapp',
//   },
// })

// For MySQL
// const orm = createInstance(schema, {
//   client: 'mysql2',
//   connection: {
//     host: 'localhost',
//     port: 3306,
//     user: 'root',
//     password: 'password',
//     database: 'myapp',
//   },
// })
```

## Step 3: Run Migrations

Create the database tables:

```typescript
await orm.migrate()
```

## Step 4: Create Records

Create users and posts:

```typescript
// Create a user with nested posts
const user = await orm.createOne('users', {
  email: 'alice@example.com',
  name: 'Alice',
  posts: [
    { title: 'My First Post', content: 'Hello world!' },
    { title: 'Another Post', content: 'More content' },
  ],
})

console.log(user)
// {
//   id: 1,
//   email: 'alice@example.com',
//   name: 'Alice',
// }
```

## Step 5: Query Records

Find and filter records:

```typescript
// Find all users
const allUsers = await orm.find('users')

// Find users by email
const user = await orm.findOne('users', {
  where: { email: { $eq: 'alice@example.com' } },
})

// Find posts with author information
const posts = await orm.find('posts', {
  columns: ['title', 'author.email', 'author.name'],
})

// Find posts with filters
const recentPosts = await orm.find('posts', {
  where: {
    $and: [
      { title: { $like: '%Post%' } },
    ],
  },
  orderBy: ['-id'],
  limit: 10,
})
```

## Step 6: Update Records

Update existing records:

```typescript
// Update a user
await orm.updateOne('users', 
  { email: { $eq: 'alice@example.com' } },
  { name: 'Alice Updated' }
)

// Update multiple posts
const updatedCount = await orm.update('posts',
  { author_id: { $eq: 1 } },
  { content: 'Updated content' }
)
```

## Step 7: Delete Records

Delete records:

```typescript
// Delete a specific post
await orm.removeOne('posts', { id: { $eq: 1 } })

// Delete all posts by an author
const deletedCount = await orm.remove('posts', {
  author_id: { $eq: 1 },
})
```

## Step 8: Work with Relations

Create records with nested relations:

```typescript
// Create a post with tags
const post = await orm.createOne('posts', {
  title: 'New Post',
  content: 'Content here',
  author_id: 1,
  tags: [
    { name: 'javascript' },
    { name: 'typescript' },
  ],
})
```

Query with nested relations:

```typescript
// Get posts with their tags
const posts = await orm.find('posts', {
  columns: ['title', 'tags.name'],
})
```

## Complete Example

Here's a complete working example:

```typescript
import { createInstance, defineCollection } from '@yassi/knex-orm'

const schema = {
  users: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', unique: true, nullable: false },
    name: { type: 'varchar', nullable: false },
  }),
}

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
    email: 'test@example.com',
    name: 'Test User',
  })
  
  // Find
  const found = await orm.findOne('users', user.id)
  console.log(found)
  
  // Update
  await orm.updateOne('users', { id: { $eq: user.id } }, {
    name: 'Updated Name',
  })
  
  // Cleanup
  await orm.destroy()
}

main().catch(console.error)
```

## Next Steps

- [Schema Definition](/guide/schema-definition) - Learn more about defining schemas
- [Finding Records](/guide/finding-records) - Deep dive into querying
- [Nested Mutations](/guide/nested-mutations) - Learn about creating related records


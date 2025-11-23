# Relations

Relations define how tables are connected to each other. `@yassidev/knex-orm` supports four types of relations: `belongs-to`, `has-one`, `has-many`, and `many-to-many`.

## Relation Types

### Belongs To

A `belongs-to` relation creates a foreign key column in the current table that references another table. The relation name becomes the column name.

```typescript
const schema = defineSchema({
  posts: {
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
    
    // Creates an 'author' column that references users.id
    author: { 
      type: 'belongs-to', 
      target: 'users',
    },
  },
})
```

**Key Points:**
- The relation name (`author`) becomes the column name in the database
- When using `defineSchema`, the foreign key automatically references the target table's primary key
- This is a one-to-many relationship from the target's perspective

### Has One

A `has-one` relation represents a one-to-one relationship where the foreign key is on the target table.

```typescript
const schema = defineSchema({
  users: {
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', nullable: false },
    
    // One user has one profile
    profile: { 
      type: 'has-one', 
      target: 'profiles',
    },
  },
  
  profiles: {
    id: { type: 'integer', primary: true, increments: true },
    user: { type: 'belongs-to', target: 'users' },
    bio: { type: 'text', nullable: true },
  },
})
```

**Key Points:**
- The foreign key (e.g., `user`) is on the target table (`profiles`)
- One user can have at most one profile
- The relation is defined on the "one" side
- `defineSchema` automatically infers the `foreignKey` from the table name

### Has Many

A `has-many` relation represents a one-to-many relationship where the foreign key is on the target table.

```typescript
const schema = defineSchema({
  users: {
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', nullable: false },
    
    // One user has many posts
    posts: { 
      type: 'has-many',
    },
  },
  
  posts: {
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
    user: { type: 'belongs-to', target: 'users' },
  },
})
```

**Key Points:**
- The foreign key (e.g., `user`) is on the target table (`posts`)
- One user can have many posts
- The relation is defined on the "one" side
- `defineSchema` automatically infers both the `target` (from relation name) and `foreignKey` (from table name)

### Many to Many

A `many-to-many` relation requires a junction table to connect two tables.

```typescript
const schema = defineSchema({
  posts: {
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
    
    // Many posts can have many tags
    tags: {
      type: 'many-to-many',
      through: {
        table: 'post_tags',
        sourceFk: 'post',
        targetFk: 'tag',
      },
    },
  },
  
  tags: {
    id: { type: 'integer', primary: true, increments: true },
    name: { type: 'varchar', unique: true, nullable: false },
  },
  
  post_tags: {
    id: { type: 'integer', primary: true, increments: true },
    post: { type: 'belongs-to', target: 'posts' },
    tag: { type: 'belongs-to', target: 'tags' },
  },
})
```

**Key Points:**
- Requires a junction table (`post_tags`)
- `sourceFk` is the relation name in the junction table pointing to the source table (e.g., `post`)
- `targetFk` is the relation name in the junction table pointing to the target table (e.g., `tag`)
- Both tables can have many of the other
- `defineSchema` automatically infers the `target` from the relation name

## Complete Example

Here's a complete example with all relation types:

```typescript
import { defineSchema } from '@yassidev/knex-orm'

const schema = defineSchema({
  users: {
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', unique: true, nullable: false },
    name: { type: 'varchar', nullable: false },
    
    // Has-one: one user has one profile
    profile: { type: 'has-one', target: 'profiles' },
    
    // Has-many: one user has many posts
    posts: { type: 'has-many' },
    
    // Many-to-many: users can have many roles
    roles: {
      type: 'many-to-many',
      through: {
        table: 'user_roles',
        sourceFk: 'user',
        targetFk: 'role',
      },
    },
  },
  
  profiles: {
    id: { type: 'integer', primary: true, increments: true },
    user: { type: 'belongs-to', target: 'users' },
    bio: { type: 'text', nullable: true },
  },
  
  posts: {
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
    content: { type: 'text', nullable: true },
    
    // Belongs-to: post belongs to a user
    user: { type: 'belongs-to', target: 'users' },
    
    // Many-to-many: posts can have many tags
    tags: {
      type: 'many-to-many',
      through: {
        table: 'post_tags',
        sourceFk: 'post',
        targetFk: 'tag',
      },
    },
  },
  
  tags: {
    id: { type: 'integer', primary: true, increments: true },
    name: { type: 'varchar', unique: true, nullable: false },
  },
  
  roles: {
    id: { type: 'integer', primary: true, increments: true },
    name: { type: 'varchar', unique: true, nullable: false },
  },
  
  // Junction tables
  user_roles: {
    id: { type: 'integer', primary: true, increments: true },
    user: { type: 'belongs-to', target: 'users' },
    role: { type: 'belongs-to', target: 'roles' },
  },
  
  post_tags: {
    id: { type: 'integer', primary: true, increments: true },
    post: { type: 'belongs-to', target: 'posts' },
    tag: { type: 'belongs-to', target: 'tags' },
  },
})
```

## Querying Relations

You can query with relations using nested column selection:

```typescript
// Get posts with author information
const posts = await orm.find('posts', {
  columns: ['title', 'author.email', 'author.name'],
})

// Get users with their posts
const users = await orm.find('users', {
  columns: ['email', 'posts.title', 'posts.content'],
})

// Filter by relation
const posts = await orm.find('posts', {
  where: {
    'author.status': { $eq: 'active' },
  },
})
```

## Nested Mutations

You can create related records in a single operation:

```typescript
// Create user with profile and posts
await orm.createOne('users', {
  email: 'user@example.com',
  name: 'John',
  profile: { bio: 'Developer' }, // has-one
  posts: [                        // has-many
    { title: 'First Post' },
    { title: 'Second Post' },
  ],
  roles: [                        // many-to-many
    { name: 'admin' },
  ],
})
```

See [Nested Mutations](/guide/nested-mutations) for more details.

## Relation Best Practices

1. **Always define both sides**: For `has-one` and `has-many`, define the `belongs-to` on the target table.

2. **Junction tables**: For `many-to-many`, always create the junction table explicitly.

3. **Foreign key naming**: Use descriptive names like `author_id`, `user_id`, etc.

4. **Cascade deletes**: Consider using `onDelete: 'CASCADE'` for foreign keys when appropriate.

## Next Steps

- [Finding Records](/guide/finding-records) - Learn how to query with relations
- [Nested Mutations](/guide/nested-mutations) - Create related records together
- [Selecting Columns](/guide/selecting-columns) - Select nested relation columns


# Relations

Relations define how tables are connected to each other. `@yassidev/knex-orm` supports four types of relations: `belongs-to`, `has-one`, `has-many`, and `many-to-many`.

## Relation Types

### Belongs To

A `belongs-to` relation creates a foreign key column in the current table that references another table. The relation name becomes the column name.

```typescript
const schema = {
  posts: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
    
    // Creates an 'author_id' column that references users.id
    author: { 
      type: 'belongs-to', 
      target: 'users', 
      foreignKey: 'id' 
    },
  }),
}
```

**Key Points:**
- The relation name (`author`) becomes the column name (`author_id`)
- The `foreignKey` specifies which column in the target table to reference
- This is a one-to-many relationship from the target's perspective

### Has One

A `has-one` relation represents a one-to-one relationship where the foreign key is on the target table.

```typescript
const schema = {
  users: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', nullable: false },
    
    // One user has one profile
    profile: { 
      type: 'has-one', 
      target: 'profiles', 
      foreignKey: 'user_id' 
    },
  }),
  
  profiles: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    user_id: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
    bio: { type: 'text', nullable: true },
  }),
}
```

**Key Points:**
- The foreign key (`user_id`) is on the target table (`profiles`)
- One user can have at most one profile
- The relation is defined on the "one" side

### Has Many

A `has-many` relation represents a one-to-many relationship where the foreign key is on the target table.

```typescript
const schema = {
  users: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', nullable: false },
    
    // One user has many posts
    posts: { 
      type: 'has-many', 
      target: 'posts', 
      foreignKey: 'author_id' 
    },
  }),
  
  posts: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
    author_id: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
  }),
}
```

**Key Points:**
- The foreign key (`author_id`) is on the target table (`posts`)
- One user can have many posts
- The relation is defined on the "one" side

### Many to Many

A `many-to-many` relation requires a junction table to connect two tables.

```typescript
const schema = {
  posts: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
    
    // Many posts can have many tags
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
```

**Key Points:**
- Requires a junction table (`post_tags`)
- `sourceFk` is the foreign key in the junction table pointing to the source table
- `targetFk` is the foreign key in the junction table pointing to the target table
- Both tables can have many of the other

## Complete Example

Here's a complete example with all relation types:

```typescript
import { defineCollection } from '@yassidev/knex-orm'

const schema = {
  users: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', unique: true, nullable: false },
    name: { type: 'varchar', nullable: false },
    
    // Has-one: one user has one profile
    profile: { type: 'has-one', target: 'profiles', foreignKey: 'user_id' },
    
    // Has-many: one user has many posts
    posts: { type: 'has-many', target: 'posts', foreignKey: 'author_id' },
    
    // Many-to-many: users can have many roles
    roles: {
      type: 'many-to-many',
      target: 'roles',
      foreignKey: 'id',
      through: {
        table: 'user_roles',
        sourceFk: 'user_id',
        targetFk: 'role_id',
      },
    },
  }),
  
  profiles: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    user_id: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
    bio: { type: 'text', nullable: true },
  }),
  
  posts: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
    content: { type: 'text', nullable: true },
    
    // Belongs-to: post belongs to a user
    author_id: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
    
    // Many-to-many: posts can have many tags
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
  
  roles: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    name: { type: 'varchar', unique: true, nullable: false },
  }),
  
  // Junction tables
  user_roles: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    user_id: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
    role_id: { type: 'belongs-to', target: 'roles', foreignKey: 'id' },
  }),
  
  post_tags: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    post_id: { type: 'belongs-to', target: 'posts', foreignKey: 'id' },
    tag_id: { type: 'belongs-to', target: 'tags', foreignKey: 'id' },
  }),
} as const
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


# Relations Examples

Examples demonstrating various relation patterns and use cases.

## Has-One Relation

User with profile:

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
const user = await orm.createOne('users', {
  email: 'user@example.com',
  profile: { bio: 'Developer' },
})

// Query user with profile
const userWithProfile = await orm.findOne('users', user.id, {
  columns: ['email', 'profile.bio'],
})
```

## Has-Many Relation

User with posts:

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

// Create user with posts
const user = await orm.createOne('users', {
  email: 'author@example.com',
  posts: [
    { title: 'First Post' },
    { title: 'Second Post' },
  ],
})

// Query user with posts
const userWithPosts = await orm.findOne('users', user.id, {
  columns: ['email', 'posts.title', 'posts.id'],
})
```

## Many-to-Many Relation

Posts with tags:

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
const post = await orm.createOne('posts', {
  title: 'My Post',
  tags: [
    { name: 'javascript' },
    { name: 'typescript' },
  ],
})

// Query post with tags
const postWithTags = await orm.findOne('posts', post.id, {
  columns: ['title', 'tags.name'],
})
```

## Complex Nested Relations

User with profile, posts, and tags:

```typescript
const schema = {
  users: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', nullable: false },
    profile: { type: 'has-one', target: 'profiles', foreignKey: 'user_id' },
    posts: { type: 'has-many', target: 'posts', foreignKey: 'author_id' },
  }),
  profiles: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    user_id: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
    bio: { type: 'text', nullable: true },
  }),
  posts: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
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
}

// Create user with everything
const user = await orm.createOne('users', {
  email: 'author@example.com',
  profile: { bio: 'Developer' },
  posts: [
    {
      title: 'First Post',
      tags: [{ name: 'javascript' }, { name: 'tutorial' }],
    },
    {
      title: 'Second Post',
      tags: [{ name: 'typescript' }],
    },
  ],
})

// Query with all relations
const userFull = await orm.findOne('users', user.id, {
  columns: [
    'email',
    'profile.bio',
    'posts.title',
    'posts.tags.name',
  ],
})
```

## Filtering by Relations

Find posts by active authors:

```typescript
const posts = await orm.find('posts', {
  where: {
    'author.status': { $eq: 'active' },
  },
  columns: ['title', 'author.email'],
})
```

Find users with posts containing a keyword:

```typescript
const users = await orm.find('users', {
  where: {
    'posts.title': { $contains: 'TypeScript' },
  },
  columns: ['email', 'posts.title'],
})
```

Find posts by tag:

```typescript
const posts = await orm.find('posts', {
  where: {
    'tags.name': { $eq: 'javascript' },
  },
  columns: ['title', 'tags.name'],
})
```

## Updating Relations

Update user and their profile:

```typescript
await orm.updateOne('users',
  { id: { $eq: 1 } },
  {
    email: 'newemail@example.com',
    profile: { bio: 'Updated bio' },
  }
)
```

Update post and replace tags:

```typescript
await orm.updateOne('posts',
  { id: { $eq: 1 } },
  {
    title: 'Updated Title',
    tags: [
      { name: 'new-tag-1' },
      { name: 'new-tag-2' },
    ],
  }
)
```

## Next Steps

- [Complex Queries](/examples/complex-queries) - Advanced query patterns
- [Basic Usage](/examples/basic-usage) - More examples


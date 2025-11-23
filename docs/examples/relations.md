# Relations Examples

Examples demonstrating various relation patterns and use cases.

## Has-One Relation

User with profile:

```typescript
const schema = defineSchema({
  users: {
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', nullable: false },
    profile: { type: 'has-one', target: 'profiles' },
  },
  profiles: {
    id: { type: 'integer', primary: true, increments: true },
    user: { type: 'belongs-to', target: 'users' },
    bio: { type: 'text', nullable: true },
  },
})

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
const schema = defineSchema({
  users: {
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', nullable: false },
    posts: { type: 'has-many' },
  },
  posts: {
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
    user: { type: 'belongs-to', target: 'users' },
  },
})

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
const schema = defineSchema({
  posts: {
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
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
const schema = defineSchema({
  users: {
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', nullable: false },
    profile: { type: 'has-one', target: 'profiles' },
    posts: { type: 'has-many' },
  },
  profiles: {
    id: { type: 'integer', primary: true, increments: true },
    user: { type: 'belongs-to', target: 'users' },
    bio: { type: 'text', nullable: true },
  },
  posts: {
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
    user: { type: 'belongs-to', target: 'users' },
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


# Complex Queries Examples

Advanced query patterns and use cases.

## Advanced Filtering

### Multiple Conditions

```typescript
// Find active users created this year
const startOfYear = new Date('2024-01-01')

const users = await orm.find('users', {
  where: {
    $and: [
      { status: { $eq: 'active' } },
      { created_at: { $gte: startOfYear } },
      { email: { $like: '%@example.com' } },
    ],
  },
})
```

### OR with AND

```typescript
// Find users who are either active or pending, and created this year
const users = await orm.find('users', {
  where: {
    $and: [
      {
        $or: [
          { status: { $eq: 'active' } },
          { status: { $eq: 'pending' } },
        ],
      },
      { created_at: { $gte: startOfYear } },
    ],
  },
})
```

### Nested Relation Filters

```typescript
// Find posts by active authors with specific tags
const posts = await orm.find('posts', {
  where: {
    $and: [
      { 'author.status': { $eq: 'active' } },
      { 'tags.name': { $in: ['javascript', 'typescript'] } },
    ],
  },
  columns: [
    'title',
    'author.email',
    'tags.name',
  ],
})
```

## Aggregation Patterns

### Counting Related Records

```typescript
// Get users with their post counts
const users = await orm.find('users', {
  columns: ['id', 'email', 'posts.id'],
})

// Count in application code
const usersWithCounts = users.map(user => ({
  ...user,
  postCount: user.posts?.length || 0,
}))
```

### Filtering by Count

```typescript
// Find users who have at least 5 posts
const users = await orm.find('users', {
  columns: ['id', 'email', 'posts.id'],
})

const activeUsers = users.filter(user => (user.posts?.length || 0) >= 5)
```

## Search Implementation

### Full-Text Search

```typescript
async function searchPosts(query: string) {
  const searchTerm = `%${query}%`
  
  return await orm.find('posts', {
    where: {
      $or: [
        { title: { $like: searchTerm } },
        { content: { $like: searchTerm } },
      ],
    },
    columns: [
      'id',
      'title',
      'content',
      'author.name',
    ],
    orderBy: ['-created_at'],
  })
}
```

### Search with Filters

```typescript
async function searchPosts(
  query: string,
  authorId?: number,
  tagName?: string
) {
  const searchTerm = `%${query}%`
  const where: any = {
    $or: [
      { title: { $like: searchTerm } },
      { content: { $like: searchTerm } },
    ],
  }
  
  if (authorId) {
    where['author.id'] = { $eq: authorId }
  }
  
  if (tagName) {
    where['tags.name'] = { $eq: tagName }
  }
  
  return await orm.find('posts', {
    where,
    columns: [
      'id',
      'title',
      'author.name',
      'tags.name',
    ],
  })
}
```

## Date Range Queries

### Recent Activity

```typescript
// Find posts from the last 7 days
const sevenDaysAgo = new Date()
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

const recentPosts = await orm.find('posts', {
  where: {
    created_at: { $gte: sevenDaysAgo },
  },
  orderBy: ['-created_at'],
  limit: 20,
})
```

### Time-Based Filtering

```typescript
// Find users who logged in today
const today = new Date()
today.setHours(0, 0, 0, 0)

const activeToday = await orm.find('users', {
  where: {
    $and: [
      { last_login: { $gte: today } },
      { last_login: { $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } },
    ],
  },
})
```

## Pagination with Filters

```typescript
interface PaginationOptions {
  page: number
  limit: number
  status?: string
  search?: string
}

async function getPaginatedUsers(options: PaginationOptions) {
  const { page, limit, status, search } = options
  const offset = (page - 1) * limit
  
  const where: any = {}
  
  if (status) {
    where.status = { $eq: status }
  }
  
  if (search) {
    where.$or = [
      { name: { $contains: search } },
      { email: { $contains: search } },
    ]
  }
  
  return await orm.find('users', {
    where,
    columns: ['id', 'email', 'name', 'status', 'created_at'],
    orderBy: ['-created_at'],
    limit,
    offset,
  })
}
```

## Complex Joins

### Multi-Level Relations

```typescript
// Get posts with author's profile
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

### Filtering Through Relations

```typescript
// Find posts by authors with specific profile bio
const posts = await orm.find('posts', {
  where: {
    'author.profile.bio': { $contains: 'developer' },
  },
  columns: [
    'title',
    'author.name',
    'author.profile.bio',
  ],
})
```

## Conditional Queries

### Dynamic Query Building

```typescript
function buildUserQuery(filters: {
  status?: string
  minAge?: number
  maxAge?: number
  search?: string
}) {
  const where: any = {}
  
  if (filters.status) {
    where.status = { $eq: filters.status }
  }
  
  if (filters.minAge || filters.maxAge) {
    where.age = {}
    if (filters.minAge) {
      where.age.$gte = filters.minAge
    }
    if (filters.maxAge) {
      where.age.$lte = filters.maxAge
    }
  }
  
  if (filters.search) {
    where.$or = [
      { name: { $contains: filters.search } },
      { email: { $contains: filters.search } },
    ]
  }
  
  return orm.find('users', {
    where,
    orderBy: ['-created_at'],
  })
}
```

## Performance Optimization

### Selecting Only Needed Columns

```typescript
// Good: Only select what you need
const users = await orm.find('users', {
  columns: ['id', 'email', 'name'],
})

// Less efficient: Select all columns
const allUsers = await orm.find('users')
```

### Limiting Results

```typescript
// Always use limit for potentially large result sets
const recentPosts = await orm.find('posts', {
  orderBy: ['-created_at'],
  limit: 50, // Prevent loading too much data
})
```

## Transaction Examples

### Complex Multi-Table Operations

```typescript
await orm.knex.transaction(async (trx) => {
  // Create user
  const user = await orm.createOne('users', {
    email: 'user@example.com',
    name: 'John',
  }, { trx })
  
  // Create profile
  await orm.createOne('profiles', {
    user_id: user.id,
    bio: 'Developer',
  }, { trx })
  
  // Create posts
  await orm.create('posts', [
    { title: 'Post 1', author_id: user.id },
    { title: 'Post 2', author_id: user.id },
  ], { trx })
})
```

## Next Steps

- [Basic Usage](/examples/basic-usage) - More examples
- [Relations](/examples/relations) - Relation examples


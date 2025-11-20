# Basic Usage Examples

This page contains practical examples of common use cases with `@yassidev/knex-orm`.

## Complete Blog Example

A complete blog application with users, posts, and tags:

```typescript
import { createInstance, defineCollection } from '@yassidev/knex-orm'

// Define schema
const schema = {
  users: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', unique: true, nullable: false },
    name: { type: 'varchar', nullable: false },
    status: { type: 'varchar', default: 'active', nullable: false },
    created_at: { type: 'timestamp', default: 'CURRENT_TIMESTAMP', nullable: false },
    
    posts: { type: 'has-many', target: 'posts', foreignKey: 'author_id' },
    profile: { type: 'has-one', target: 'profiles', foreignKey: 'user_id' },
  }),
  
  profiles: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    user_id: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
    bio: { type: 'text', nullable: true },
    avatar_url: { type: 'varchar', nullable: true },
  }),
  
  posts: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
    content: { type: 'text', nullable: true },
    author_id: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
    published_at: { type: 'timestamp', nullable: true },
    created_at: { type: 'timestamp', default: 'CURRENT_TIMESTAMP', nullable: false },
    
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

// Create instance
const orm = createInstance(schema, {
  client: 'sqlite3',
  connection: { filename: ':memory:' },
  useNullAsDefault: true,
})

async function main() {
  // Migrate
  await orm.migrate()
  
  // Create user with profile and posts
  const user = await orm.createOne('users', {
    email: 'author@example.com',
    name: 'John Author',
    status: 'active',
    profile: {
      bio: 'Software developer and blogger',
      avatar_url: 'https://example.com/avatar.jpg',
    },
    posts: [
      {
        title: 'Getting Started with TypeScript',
        content: 'TypeScript is a typed superset of JavaScript...',
        published_at: new Date(),
        tags: [
          { name: 'typescript' },
          { name: 'tutorial' },
        ],
      },
      {
        title: 'Advanced TypeScript Patterns',
        content: 'In this post, we explore advanced patterns...',
        published_at: new Date(),
        tags: [
          { name: 'typescript' },
          { name: 'advanced' },
        ],
      },
    ],
  })
  
  console.log('Created user:', user.id)
  
  // Find published posts with author and tags
  const posts = await orm.find('posts', {
    where: {
      published_at: { $nnull: true },
    },
    columns: [
      'id',
      'title',
      'content',
      'published_at',
      'author.email',
      'author.name',
      'tags.name',
    ],
    orderBy: ['-published_at'],
    limit: 10,
  })
  
  console.log('Published posts:', posts.length)
  
  // Find posts by tag
  const typescriptPosts = await orm.find('posts', {
    where: {
      'tags.name': { $eq: 'typescript' },
    },
    columns: ['title', 'author.name'],
  })
  
  console.log('TypeScript posts:', typescriptPosts.length)
  
  // Update user
  await orm.updateOne('users',
    { id: { $eq: user.id } },
    { status: 'inactive' }
  )
  
  // Cleanup
  await orm.destroy()
}

main().catch(console.error)
```

## User Management Example

Managing users with authentication:

```typescript
// Create user
async function createUser(email: string, name: string, password: string) {
  const user = await orm.createOne('users', {
    email,
    name,
    password_hash: await hashPassword(password),
    status: 'active',
    created_at: new Date(),
  })
  
  return user
}

// Find user by email
async function findUserByEmail(email: string) {
  return await orm.findOne('users', {
    where: { email: { $eq: email } },
  })
}

// Update user status
async function updateUserStatus(userId: number, status: string) {
  return await orm.updateOne('users',
    { id: { $eq: userId } },
    { status, updated_at: new Date() }
  )
}

// List active users
async function listActiveUsers(limit = 10, offset = 0) {
  return await orm.find('users', {
    where: { status: { $eq: 'active' } },
    columns: ['id', 'email', 'name', 'created_at'],
    orderBy: ['-created_at'],
    limit,
    offset,
  })
}
```

## E-commerce Example

Product catalog with categories and reviews:

```typescript
const schema = {
  categories: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    name: { type: 'varchar', nullable: false },
    slug: { type: 'varchar', unique: true, nullable: false },
  }),
  
  products: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    name: { type: 'varchar', nullable: false },
    description: { type: 'text', nullable: true },
    price: { type: 'decimal', nullable: false },
    stock: { type: 'integer', default: 0, nullable: false },
    category_id: { type: 'belongs-to', target: 'categories', foreignKey: 'id' },
    
    reviews: { type: 'has-many', target: 'reviews', foreignKey: 'product_id' },
  }),
  
  reviews: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    product_id: { type: 'belongs-to', target: 'products', foreignKey: 'id' },
    user_id: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
    rating: { type: 'integer', nullable: false },
    comment: { type: 'text', nullable: true },
    created_at: { type: 'timestamp', default: 'CURRENT_TIMESTAMP', nullable: false },
  }),
}

// Find products with reviews
async function getProductsWithReviews(categorySlug?: string) {
  const where: any = {}
  
  if (categorySlug) {
    where['category.slug'] = { $eq: categorySlug }
  }
  
  return await orm.find('products', {
    where,
    columns: [
      'id',
      'name',
      'description',
      'price',
      'stock',
      'category.name',
      'reviews.rating',
      'reviews.comment',
      'reviews.user.email',
    ],
    orderBy: ['-id'],
  })
}

// Create product with category
async function createProduct(
  name: string,
  description: string,
  price: number,
  categorySlug: string
) {
  return await orm.createOne('products', {
    name,
    description,
    price,
    stock: 0,
    category: { slug: categorySlug },
  })
}
```

## Search Example

Implementing search functionality:

```typescript
async function searchUsers(query: string) {
  const searchTerm = `%${query}%`
  
  return await orm.find('users', {
    where: {
      $or: [
        { name: { $like: searchTerm } },
        { email: { $like: searchTerm } },
      ],
    },
    columns: ['id', 'name', 'email'],
    orderBy: ['name'],
  })
}

async function searchPosts(query: string, tag?: string) {
  const where: any = {
    $or: [
      { title: { $contains: query } },
      { content: { $contains: query } },
    ],
  }
  
  if (tag) {
    where['tags.name'] = { $eq: tag }
  }
  
  return await orm.find('posts', {
    where,
    columns: [
      'id',
      'title',
      'content',
      'author.name',
      'tags.name',
    ],
    orderBy: ['-created_at'],
    limit: 20,
  })
}
```

## Pagination Example

Implementing pagination:

```typescript
interface PaginationParams {
  page: number
  limit: number
}

interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

async function getPaginatedUsers(params: PaginationParams): Promise<PaginatedResult<User>> {
  const { page, limit } = params
  const offset = (page - 1) * limit
  
  // Get total count (simplified - in production, use a count query)
  const allUsers = await orm.find('users', {
    columns: ['id'],
  })
  const total = allUsers.length
  
  // Get paginated data
  const data = await orm.find('users', {
    columns: ['id', 'email', 'name', 'created_at'],
    orderBy: ['-created_at'],
    limit,
    offset,
  })
  
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}
```

## Next Steps

- [Relations Examples](/examples/relations) - More relation examples
- [Complex Queries](/examples/complex-queries) - Advanced query patterns


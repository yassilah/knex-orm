# Schema Definition

The schema is the foundation of `@yassi/knex-orm`. It defines your database structure, including tables, columns, data types, and relationships.

## Basic Schema Structure

A schema is an object where each key is a table name and each value is a collection definition:

```typescript
import { defineCollection, createInstance } from '@yassi/knex-orm'

const schema = {
  users: defineCollection({
    // columns and relations go here
  }),
  posts: defineCollection({
    // columns and relations go here
  }),
} as const

const orm = createInstance(schema, knexConfig)
```

## Defining Columns

Columns are defined using data types. Each column can have various properties:

```typescript
const schema = {
  users: defineCollection({
    // Primary key with auto-increment
    id: { type: 'integer', primary: true, increments: true },
    
    // Required string field
    email: { type: 'varchar', nullable: false },
    
    // Optional string field
    name: { type: 'varchar', nullable: true },
    
    // Unique field
    username: { type: 'varchar', unique: true, nullable: false },
    
    // Field with default value
    status: { type: 'varchar', default: 'active', nullable: false },
    
    // Text field
    bio: { type: 'text', nullable: true },
    
    // Integer field
    age: { type: 'integer', nullable: true },
    
    // Boolean field
    is_active: { type: 'boolean', default: true, nullable: false },
    
    // Date field
    created_at: { type: 'timestamp', default: 'CURRENT_TIMESTAMP', nullable: false },
    
    // JSON field
    metadata: { type: 'json', nullable: true },
  }),
}
```

## Column Properties

### `type`
The data type of the column. See [Data Types](/guide/data-types) for available types.

### `primary`
Set to `true` to make this column the primary key. Only one primary key per table.

```typescript
id: { type: 'integer', primary: true, increments: true }
```

### `increments`
Set to `true` for auto-incrementing integer primary keys.

```typescript
id: { type: 'integer', primary: true, increments: true }
```

### `nullable`
Whether the column can be `null`. Defaults to `true` if not specified.

```typescript
email: { type: 'varchar', nullable: false }  // Required
name: { type: 'varchar', nullable: true }     // Optional
```

### `unique`
Set to `true` to enforce uniqueness on this column.

```typescript
email: { type: 'varchar', unique: true, nullable: false }
```

### `default`
Default value for the column. Can be a literal value or a database function.

```typescript
status: { type: 'varchar', default: 'active' }
created_at: { type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
```

### `references`
Define a foreign key relationship. This is typically handled by relations, but can be used directly.

```typescript
user_id: {
  type: 'integer',
  references: {
    table: 'users',
    column: 'id',
    onDelete: 'CASCADE',
  },
}
```

## Available Data Types

### String Types
- `varchar` - Variable-length string
- `text` - Long text
- `char` - Fixed-length string

### Number Types
- `integer` - 32-bit integer
- `bigint` - 64-bit integer
- `decimal` - Decimal number
- `float` - Floating point number
- `double` - Double precision float

### Other Types
- `boolean` - Boolean value
- `date` - Date only
- `datetime` - Date and time
- `timestamp` - Timestamp
- `time` - Time only
- `json` - JSON data
- `binary` - Binary data

See [Data Types](/guide/data-types) for more details.

## Defining Relations

Relations connect tables together. See [Relations](/guide/relations) for detailed information.

```typescript
const schema = {
  users: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', nullable: false },
    
    // Has-many relation
    posts: { type: 'has-many', target: 'posts', foreignKey: 'author_id' },
    
    // Has-one relation
    profile: { type: 'has-one', target: 'profiles', foreignKey: 'user_id' },
  }),
  
  posts: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
    
    // Belongs-to relation (creates author_id column)
    author: { type: 'belongs-to', target: 'users', foreignKey: 'id' },
    
    // Many-to-many relation
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
}
```

## Complete Example

Here's a complete schema example:

```typescript
import { defineCollection } from '@yassi/knex-orm'

export const schema = {
  users: defineCollection({
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', unique: true, nullable: false },
    name: { type: 'varchar', nullable: false },
    status: { type: 'varchar', default: 'active', nullable: false },
    created_at: { type: 'timestamp', default: 'CURRENT_TIMESTAMP', nullable: false },
    
    // Relations
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
```

## Type Safety

The schema is fully type-safe. TypeScript will infer types for:

- Table names
- Column names and types
- Relation names and types
- Query results
- Mutation inputs

```typescript
// TypeScript knows 'users' and 'posts' are valid table names
const users = await orm.find('users')
const posts = await orm.find('posts')
// const invalid = await orm.find('invalid') // TypeScript error!

// TypeScript knows the structure of results
const user = await orm.findOne('users', 1)
// user.email is typed as string | null
// user.id is typed as number
```

## Next Steps

- [Data Types](/guide/data-types) - Learn about available data types
- [Relations](/guide/relations) - Understand how to define relationships
- [Migrations](/guide/migrations) - Apply your schema to the database


# Schema Definition

The schema is the foundation of `@yassidev/knex-orm`. It defines your database structure, including tables, columns, data types, and relationships.

## Basic Schema Structure

A schema is an object where each key is a table name and each value is a collection definition:

```typescript
import { defineSchema, createInstance } from '@yassidev/knex-orm'

const schema = defineSchema({
  users: {
    // columns and relations go here
  },
  posts: {
    // columns and relations go here
  },
})

const orm = createInstance(schema, knexConfig)
```

### `defineSchema`

Use `defineSchema` to wrap your collections. It keeps the schema strongly typed while automatically filling in defaults where they can be safely inferred (for example, `belongs-to` relations referencing a target table's primary key). You can always provide explicit values when the defaults aren't what you need. `defineCollection` remains available when you need to reuse a collection outside of `defineSchema`, but it's optional inside the schema helper.

## Defining Columns

Columns are defined using data types. Each column can have various properties:

```typescript
const schema = defineSchema({
  users: {
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
  },
})
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
const schema = defineSchema({
  users: {
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', nullable: false },
    
    // Has-many relation (target inferred from key, foreignKey from table name)
    posts: { type: 'has-many' },
    
    // Has-one relation (override target because it differs from key)
    profile: { type: 'has-one', target: 'profiles' },
  },
  
  posts: {
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
    
    // Belongs-to relation (target differs from key, so we specify it)
    user: { type: 'belongs-to', target: 'users' },
    
    // Many-to-many relation (target inferred, still need the junction metadata)
    tags: {
      type: 'many-to-many',
      through: {
        table: 'post_tags',
        sourceFk: 'post_id',
        targetFk: 'tag_id',
      },
    },
  },
})
```
> **Tip:** When the relation points to the target table's primary key, `defineSchema` lets you omit `foreignKey` for `belongs-to` and many-to-many relations. Specify it manually if you need to reference a different column.

#### Relation defaults

`defineSchema` automatically normalizes relation definitions:

- `target` defaults to the relation key (e.g. `posts: { type: 'has-many' }` → `target: 'posts'`).
- `foreignKey` defaults to the singularized table name for `has-one`, `has-many`, and `many-to-many` relations (e.g. inside `users`, it becomes `user`).
- `belongs-to` relations still default their `foreignKey` to the target table's primary key so references stay accurate.

You can always override the inferred values by providing them explicitly.

## Complete Example

Here's a complete schema example:

```typescript
import { defineSchema } from '@yassidev/knex-orm'

export const schema = defineSchema({
  users: {
    id: { type: 'integer', primary: true, increments: true },
    email: { type: 'varchar', unique: true, nullable: false },
    name: { type: 'varchar', nullable: false },
    status: { type: 'varchar', default: 'active', nullable: false },
    created_at: { type: 'timestamp', default: 'CURRENT_TIMESTAMP', nullable: false },
    
    // Relations
    posts: { type: 'has-many' },
    profile: { type: 'has-one', target: 'profiles' },
  },
  
  profiles: {
    id: { type: 'integer', primary: true, increments: true },
    user: { type: 'belongs-to', target: 'users' },
    bio: { type: 'text', nullable: true },
    avatar_url: { type: 'varchar', nullable: true },
  },
  
  posts: {
    id: { type: 'integer', primary: true, increments: true },
    title: { type: 'varchar', nullable: false },
    content: { type: 'text', nullable: true },
    user: { type: 'belongs-to', target: 'users' },
    published_at: { type: 'timestamp', nullable: true },
    
    tags: {
      type: 'many-to-many',
      target: 'tags',
      through: {
        table: 'post_tags',
        sourceFk: 'post_id',
        targetFk: 'tag_id',
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


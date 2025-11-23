# Data Types

`@yassidev/knex-orm` supports a wide variety of data types that map to SQL column types. This guide covers all available data types and their usage.

## String Types

### `varchar`
Variable-length string. Most common for text fields.

```typescript
email: { type: 'varchar', nullable: false }
name: { type: 'varchar', nullable: true }
```

### `text`
Long text field for large amounts of text.

```typescript
content: { type: 'text', nullable: true }
description: { type: 'text', nullable: true }
```

### `char`
Fixed-length string.

```typescript
code: { type: 'char', nullable: false }
```

## Number Types

### `integer`
32-bit integer. Use for IDs and counts.

```typescript
id: { type: 'integer', primary: true, increments: true }
age: { type: 'integer', nullable: true }
count: { type: 'integer', default: 0, nullable: false }
```

### `bigint`
64-bit integer. Use for very large numbers.

```typescript
views: { type: 'bigint', default: 0, nullable: false }
```

### `decimal`
Decimal number with fixed precision.

```typescript
price: { type: 'decimal', nullable: false }
```

### `float`
Floating point number.

```typescript
rating: { type: 'float', nullable: true }
```

### `double`
Double precision floating point.

```typescript
coordinate: { type: 'double', nullable: true }
```

## Boolean Type

### `boolean`
Boolean value (true/false).

```typescript
is_active: { type: 'boolean', default: true, nullable: false }
is_published: { type: 'boolean', default: false, nullable: false }
```

## Date and Time Types

### `date`
Date only (no time).

```typescript
birth_date: { type: 'date', nullable: true }
```

### `datetime`
Date and time.

```typescript
created_at: { type: 'datetime', default: 'CURRENT_TIMESTAMP', nullable: false }
```

### `timestamp`
Timestamp (date and time). Often used with `CURRENT_TIMESTAMP`.

```typescript
created_at: { type: 'timestamp', default: 'CURRENT_TIMESTAMP', nullable: false }
updated_at: { type: 'timestamp', nullable: true }
```

### `time`
Time only (no date).

```typescript
start_time: { type: 'time', nullable: true }
```

## JSON Type

### `json`
JSON data. Stored as JSON in the database.

```typescript
metadata: { type: 'json', nullable: true }
settings: { type: 'json', nullable: true }
```

Usage:

```typescript
await orm.createOne('users', {
  email: 'user@example.com',
  metadata: { theme: 'dark', notifications: true },
})
```

## Binary Type

### `binary`
Binary data (blob).

```typescript
avatar: { type: 'binary', nullable: true }
```

## Type Examples

Here's a comprehensive example using various data types:

```typescript
import { defineSchema } from '@yassidev/knex-orm'

const schema = defineSchema({
  products: {
    // Primary key
    id: { type: 'integer', primary: true, increments: true },
    
    // Strings
    name: { type: 'varchar', nullable: false },
    description: { type: 'text', nullable: true },
    sku: { type: 'char', unique: true, nullable: false },
    
    // Numbers
    price: { type: 'decimal', nullable: false },
    stock: { type: 'integer', default: 0, nullable: false },
    views: { type: 'bigint', default: 0, nullable: false },
    rating: { type: 'float', nullable: true },
    
    // Boolean
    is_active: { type: 'boolean', default: true, nullable: false },
    
    // Dates
    created_at: { type: 'timestamp', default: 'CURRENT_TIMESTAMP', nullable: false },
    updated_at: { type: 'timestamp', nullable: true },
    release_date: { type: 'date', nullable: true },
    
    // JSON
    metadata: { type: 'json', nullable: true },
    specifications: { type: 'json', nullable: true },
    
    // Binary
    image: { type: 'binary', nullable: true },
  },
})
```

## Database-Specific Considerations

### PostgreSQL
- `json` type is native JSON
- `timestamp` supports timezone
- `text` is unlimited length

### MySQL
- `json` type is native JSON (MySQL 5.7+)
- `text` has size limits (TINYTEXT, TEXT, MEDIUMTEXT, LONGTEXT)
- `timestamp` automatically updates

### SQLite
- `json` is stored as TEXT
- All integer types map to INTEGER
- No native boolean type (stored as INTEGER 0/1)

## Default Values

You can provide default values for columns:

```typescript
// String default
status: { type: 'varchar', default: 'active', nullable: false }

// Number default
count: { type: 'integer', default: 0, nullable: false }

// Boolean default
is_active: { type: 'boolean', default: true, nullable: false }

// Database function default
created_at: { type: 'timestamp', default: 'CURRENT_TIMESTAMP', nullable: false }
```

## Nullable vs Non-Nullable

By default, columns are nullable unless you specify `nullable: false`:

```typescript
// Nullable (can be null)
name: { type: 'varchar', nullable: true }
// or simply
name: { type: 'varchar' }

// Non-nullable (required)
email: { type: 'varchar', nullable: false }
```

## Next Steps

- [Schema Definition](/guide/schema-definition) - Learn how to define your schema
- [Relations](/guide/relations) - Understand relationships between tables


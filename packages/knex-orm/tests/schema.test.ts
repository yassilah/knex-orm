import { describe, expect, it } from 'vitest'
import { schema } from './test-helpers'

describe('schema', () => {
   it('should normalize the whole schema correctly', () => {
      expect(schema).toMatchInlineSnapshot(`
        {
          "collections": {
            "created_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
            "id": {
              "increments": true,
              "nullable": false,
              "primary": true,
              "type": "integer",
            },
            "name": {
              "nullable": false,
              "type": "varchar",
              "unique": true,
            },
            "updated_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
          },
          "permissions": {
            "action": {
              "nullable": true,
              "options": [
                "read",
                "write",
                "delete",
              ],
              "type": "enum-array",
            },
            "collection": {
              "foreignKey": "id",
              "nullable": true,
              "onDelete": "CASCADE",
              "onUpdate": "CASCADE",
              "target": "collections",
              "type": "belongs-to",
            },
            "created_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
            "id": {
              "increments": true,
              "nullable": false,
              "primary": true,
              "type": "integer",
            },
            "name": {
              "nullable": false,
              "type": "varchar",
              "unique": true,
            },
            "updated_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
          },
          "policies": {
            "created_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
            "id": {
              "increments": true,
              "nullable": false,
              "primary": true,
              "type": "integer",
            },
            "name": {
              "nullable": false,
              "type": "varchar",
              "unique": true,
            },
            "permissions": {
              "foreignKey": "id",
              "nullable": true,
              "target": "permissions",
              "through": {
                "sourceFk": "policy",
                "table": "policies_permissions",
                "targetFk": "permission",
              },
              "type": "many-to-many",
            },
            "updated_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
          },
          "policies_permissions": {
            "created_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
            "id": {
              "increments": true,
              "nullable": false,
              "primary": true,
              "type": "integer",
            },
            "permission": {
              "foreignKey": "id",
              "nullable": true,
              "onDelete": "CASCADE",
              "onUpdate": "CASCADE",
              "target": "permissions",
              "type": "belongs-to",
            },
            "policy": {
              "foreignKey": "id",
              "nullable": true,
              "onDelete": "CASCADE",
              "onUpdate": "CASCADE",
              "target": "policies",
              "type": "belongs-to",
            },
            "updated_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
          },
          "posts": {
            "author": {
              "foreignKey": "id",
              "nullable": true,
              "onDelete": "CASCADE",
              "onUpdate": "CASCADE",
              "target": "users",
              "type": "belongs-to",
            },
            "created_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
            "id": {
              "increments": true,
              "nullable": false,
              "primary": true,
              "type": "integer",
            },
            "slug": {
              "nullable": false,
              "type": "varchar",
              "unique": true,
            },
            "tags": {
              "foreignKey": "id",
              "nullable": true,
              "target": "tags",
              "through": {
                "sourceFk": "post",
                "table": "posts_tags",
                "targetFk": "tag",
              },
              "type": "many-to-many",
            },
            "title": {
              "nullable": false,
              "type": "varchar",
            },
            "updated_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
          },
          "posts_tags": {
            "created_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
            "id": {
              "increments": true,
              "nullable": false,
              "primary": true,
              "type": "integer",
            },
            "post": {
              "foreignKey": "id",
              "nullable": true,
              "onDelete": "CASCADE",
              "onUpdate": "CASCADE",
              "target": "posts",
              "type": "belongs-to",
            },
            "tag": {
              "foreignKey": "id",
              "nullable": true,
              "onDelete": "CASCADE",
              "onUpdate": "CASCADE",
              "target": "tags",
              "type": "belongs-to",
            },
            "updated_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
          },
          "profiles": {
            "created_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
            "display_name": {
              "nullable": false,
              "type": "varchar",
            },
            "id": {
              "increments": true,
              "nullable": false,
              "primary": true,
              "type": "integer",
            },
            "updated_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
            "user": {
              "foreignKey": "id",
              "nullable": true,
              "onDelete": "CASCADE",
              "onUpdate": "CASCADE",
              "target": "users",
              "type": "belongs-to",
            },
          },
          "roles": {
            "created_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
            "id": {
              "increments": true,
              "nullable": false,
              "primary": true,
              "type": "integer",
            },
            "name": {
              "nullable": false,
              "type": "varchar",
              "unique": true,
            },
            "policies": {
              "foreignKey": "id",
              "nullable": true,
              "target": "policies",
              "through": {
                "sourceFk": "role",
                "table": "roles_policies",
                "targetFk": "policy",
              },
              "type": "many-to-many",
            },
            "updated_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
          },
          "roles_policies": {
            "created_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
            "id": {
              "increments": true,
              "nullable": false,
              "primary": true,
              "type": "integer",
            },
            "policy": {
              "foreignKey": "id",
              "nullable": true,
              "onDelete": "CASCADE",
              "onUpdate": "CASCADE",
              "target": "policies",
              "type": "belongs-to",
            },
            "role": {
              "foreignKey": "id",
              "nullable": true,
              "onDelete": "CASCADE",
              "onUpdate": "CASCADE",
              "target": "roles",
              "type": "belongs-to",
            },
            "updated_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
          },
          "tags": {
            "created_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
            "id": {
              "increments": true,
              "nullable": false,
              "primary": true,
              "type": "integer",
            },
            "name": {
              "nullable": false,
              "type": "varchar",
              "unique": true,
            },
            "updated_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
          },
          "users": {
            "created_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
            "email": {
              "nullable": false,
              "type": "varchar",
              "unique": true,
            },
            "id": {
              "increments": true,
              "nullable": false,
              "primary": true,
              "type": "integer",
            },
            "posts": {
              "foreignKey": "author",
              "nullable": true,
              "target": "posts",
              "type": "has-many",
            },
            "profile": {
              "foreignKey": "user",
              "nullable": true,
              "target": "profiles",
              "type": "has-one",
            },
            "roles": {
              "foreignKey": "id",
              "nullable": true,
              "target": "roles",
              "through": {
                "sourceFk": "user",
                "table": "users_roles",
                "targetFk": "role",
              },
              "type": "many-to-many",
            },
            "status": {
              "nullable": true,
              "type": "varchar",
            },
            "updated_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
          },
          "users_roles": {
            "created_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
            "id": {
              "increments": true,
              "nullable": false,
              "primary": true,
              "type": "integer",
            },
            "role": {
              "foreignKey": "id",
              "nullable": true,
              "onDelete": "CASCADE",
              "onUpdate": "CASCADE",
              "target": "roles",
              "type": "belongs-to",
            },
            "updated_at": {
              "default": "{now}",
              "nullable": false,
              "type": "timestamp",
            },
            "user": {
              "foreignKey": "id",
              "nullable": true,
              "onDelete": "CASCADE",
              "onUpdate": "CASCADE",
              "target": "users",
              "type": "belongs-to",
            },
          },
        }
      `)
   })
})

/* eslint-disable ts/no-empty-object-type */
import type { TableColumnNames } from './columns'
import type { FieldName } from './fields'
import type { BelongsToRelationDefinition, HasManyRelationDefinition, HasOneRelationDefinition, ManyToManyRelationDefinition, TableRelation, TableRelationNames } from './relations'
import type { Schema, TableItem, TableNames } from './schema'

/**
 * Split a dot-notation path into an array of segments
 */
type SplitPath<P extends string> = P extends `${infer First}.${infer Rest}`
   ? [First, ...SplitPath<Rest>]
   : [P]

/**
 * Merge two object types
 */
type Merge<T, U> = {
   [K in keyof T | keyof U]: K extends keyof T ? T[K] : K extends keyof U ? U[K] : never
}

/**
 * Process a single field name (column) at the current level
 * Uses TableItem with Deep=false to get only column values, not relation objects
 */
type ProcessColumn<
   S extends Schema,
   N extends TableNames<S>,
   ColName extends keyof TableItem<S, N, false>,
> = {
   [K in ColName]: TableItem<S, N, false>[K]
}

/**
 * Process a relation path - handles nested relations
 */
type ProcessRelationPath<
   S extends Schema,
   N extends TableNames<S>,
   RelName extends TableRelationNames<S, N>,
   RestPath extends string[],
> = TableRelation<S, N, RelName> extends infer TR
   ? TR extends HasManyRelationDefinition | ManyToManyRelationDefinition
      ? ResolvePath<S, TR['table'], RestPath> extends infer U
         ? U[]
         : never
      : TR extends BelongsToRelationDefinition
         ? ResolvePath<S, TR['table'], RestPath> extends infer U
            ? TR extends { nullable?: boolean }
               ? TR['nullable'] extends false
                  ? U
                  : U | null
               : U | null
            : never
         : TR extends HasOneRelationDefinition
            ? ResolvePath<S, TR['table'], RestPath> extends infer U
               ? TR extends { nullable?: boolean }
                  ? TR['nullable'] extends false
                     ? U
                     : U | null
                  : U | null
               : never
            : ResolvePath<S, TR['table'], RestPath>
   : never

/**
 * Process a wildcard segment - handles *, *.*, *.*.*, etc.
 */
type ProcessWildcard<
   S extends Schema,
   N extends TableNames<S>,
   RestPath extends string[],
> = RestPath extends [infer Next, ...infer Remaining]
   ? Next extends '*'
      ? Remaining extends []
         ? TableItem<S, N>
         : ProcessWildcard<S, N, Remaining extends string[] ? Remaining : []>
      : ResolvePath<S, N, RestPath>
   : TableItem<S, N, false>

/**
 * Resolve a path array to an object type
 */
type ResolvePath<
   S extends Schema,
   N extends TableNames<S>,
   Path extends string[],
> = Path extends [infer First, ...infer Rest]
   ? First extends '*'
      ? ProcessWildcard<S, N, Rest extends string[] ? Rest : []>
      : First extends keyof TableItem<S, N>
         ? Rest extends []
            ? First extends TableColumnNames<S, N>
               ? ProcessColumn<S, N, First>
               : First extends TableRelationNames<S, N>
                  ? ProcessColumn<S, N, First>
                  : never
            : First extends TableRelationNames<S, N>
               ? ProcessRelationPath<S, N, First, Rest extends string[] ? Rest : []> extends infer U
                  ? {
                        [K in First]: U
                     }
                  : never
               : never
         : never
   : {}

/**
 * Process a single field string (e.g., "id", "posts.title", "posts.*")
 */
type ProcessField<
   S extends Schema,
   N extends TableNames<S>,
   Field extends string,
> = ResolvePath<S, N, SplitPath<Field>>

/**
 * Convert tuple to union of processed fields, then merge via intersection
 */
type FieldsToUnion<
   S extends Schema,
   N extends TableNames<S>,
   Fields extends FieldName<S, N>[],
> = Fields[number] extends infer F
   ? F extends FieldName<S, N>
      ? ProcessField<S, N, F & string>
      : never
   : never

/**
 * Turn a union into an object via intersection
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

type MergeUnionToObject<T> = UnionToIntersection<T> extends infer U
   ? {
         [K in keyof U]: U[K]
      }
   : never

/**
 * Pick properties from a nested object using dot notation paths and convert to a nested object.
 */
export type PickTableItemDotNotation<
   S extends Schema,
   N extends TableNames<S>,
   Fields extends FieldName<S, N>[] = [],
> = [Fields] extends [readonly FieldName<S, N>[]]
   ? Fields['length'] extends 0
      ? {}
      : MergeUnionToObject<FieldsToUnion<S, N, Fields>>
   : {}

/* eslint-disable ts/no-empty-object-type */
import type { TableColumnNames } from './columns'
import type { FieldName } from './fields'
import type { Prettify } from './helpers'
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
 * RestPath contains remaining path segments to apply to the relation's table
 * RootTable is kept constant throughout recursion
 * N is passed as ParentTable to the next level
 */
type ProcessRelationPath<
   S extends Schema,
   N extends TableNames<S>,
   RelName extends TableRelationNames<S, N>,
   RestPath extends string[],
   RootTable extends TableNames<S>,
> = TableRelation<S, N, RelName> extends infer TR
   ? TR extends HasManyRelationDefinition | ManyToManyRelationDefinition
      ? ResolvePathWithRoot<S, TR['table'], RestPath, RootTable, N> extends infer U
         ? U[]
         : never
      : TR extends BelongsToRelationDefinition
         ? ResolvePathWithRoot<S, TR['table'], RestPath, RootTable, N> extends infer U
            ? TR extends { nullable?: boolean }
               ? TR['nullable'] extends false
                  ? U
                  : U | null
               : U | null
            : never
         : TR extends HasOneRelationDefinition
            ? ResolvePathWithRoot<S, TR['table'], RestPath, RootTable, N> extends infer U
               ? TR extends { nullable?: boolean }
                  ? TR['nullable'] extends false
                     ? U
                     : U | null
                  : U | null
               : never
            : ResolvePathWithRoot<S, TR['table'], RestPath, RootTable, N>
   : never

/**
 * Helper to resolve path on a relation's table while maintaining RootTable and ParentTable
 */
type ResolvePathWithRoot<
   S extends Schema,
   N extends TableNames<S>,
   Path extends string[],
   RootTable extends TableNames<S>,
   ParentTable extends TableNames<S>,
> = Path extends [infer First, ...infer Rest]
   ? First extends '*'
      ? ProcessWildcard<S, N, Rest extends string[] ? Rest : [], RootTable, ParentTable>
      : First extends keyof TableItem<S, N>
         ? Rest extends []
            ? First extends TableColumnNames<S, N>
               ? ProcessColumn<S, N, First>
               : First extends TableRelationNames<S, N>
                  ? ProcessColumn<S, N, First>
                  : never
            : First extends TableRelationNames<S, N>
               ? ProcessRelationPath<S, N, First, Rest extends string[] ? Rest : [], RootTable> extends infer U
                  ? {
                        [K in First]: U
                     }
                  : never
               : never
         : never
   : {}

/**
 * Process all relations with remaining wildcards
 * Exclude relations pointing to Root or ParentTable (the table we came from)
 */
type ProcessAllRelationsWithPath<
   S extends Schema,
   N extends TableNames<S>,
   RestPath extends string[],
   RootTable extends TableNames<S>,
   ParentTable extends TableNames<S>,
> = {
   [K in TableRelationNames<S, N> as TableRelation<S, N, K>['table'] extends (RootTable | ParentTable) ? never : K]:
   ProcessRelationPath<S, N, K, RestPath, RootTable>
}

/**
 * Merge base columns with expanded relations, overriding BelongsTo foreign keys
 */
type MergeColumnsAndRelations<Base, Relations> = Prettify<{
   [K in keyof Base | keyof Relations]: K extends keyof Relations
      ? Relations[K]
      : K extends keyof Base
         ? Base[K]
         : never
}>

/**
 * Process a wildcard segment - handles *, *.*, *.*.*, etc.
 * RestPath contains the remaining wildcards (NOT including current one being processed)
 * RootTable is the original starting table to prevent circular references
 * ParentTable is the table we came from (defaults to N if we're at the root)
 */
type ProcessWildcard<
   S extends Schema,
   N extends TableNames<S>,
   RestPath extends string[],
   RootTable extends TableNames<S> = N,
   ParentTable extends TableNames<S> = N,
> = RestPath extends []
   ? TableItem<S, N, false>
   : MergeColumnsAndRelations<
      TableItem<S, N, false>,
      ProcessAllRelationsWithPath<S, N, RestPath, RootTable, ParentTable>
   >

/**
 * Resolve a path array to an object type
 */
type ResolvePath<
   S extends Schema,
   N extends TableNames<S>,
   Path extends string[],
> = Path extends [infer First, ...infer Rest]
   ? First extends '*'
      ? ProcessWildcard<S, N, Rest extends string[] ? Rest : [], N, N>
      : First extends keyof TableItem<S, N>
         ? Rest extends []
            ? First extends TableColumnNames<S, N>
               ? ProcessColumn<S, N, First>
               : First extends TableRelationNames<S, N>
                  ? ProcessColumn<S, N, First>
                  : never
            : First extends TableRelationNames<S, N>
               ? ProcessRelationPath<S, N, First, Rest extends string[] ? Rest : [], N> extends infer U
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

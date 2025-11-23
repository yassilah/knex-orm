/* eslint-disable ts/no-empty-object-type */
import type { TableColumnNames } from './columns'
import type { FieldName } from './fields'
import type { Prettify } from './helpers'
import type { BelongsToRelationDefinition, HasManyRelationDefinition, HasOneRelationDefinition, ManyToManyRelationDefinition, TableRelation, TableRelationNames } from './relations'
import type { Schema, TableItem, TableNames } from './schema'

/** Split dot-notation path into segments */
type SplitPath<P extends string> = P extends `${infer First}.${infer Rest}`
   ? [First, ...SplitPath<Rest>]
   : [P]

/** Pick a single column from table */
type ProcessColumn<
   S extends Schema,
   N extends TableNames<S>,
   ColName extends keyof TableItem<S, N, false>,
> = Pick<TableItem<S, N, false>, ColName>

/** Apply nullable based on relation definition */
type ApplyNullable<U, TR> = TR extends { nullable?: boolean }
   ? TR['nullable'] extends false ? U : U | null
   : U | null

/** Process a relation path - handles nested relations */
type ProcessRelationPath<
   S extends Schema,
   N extends TableNames<S>,
   RelName extends TableRelationNames<S, N>,
   RestPath extends string[],
   RootTable extends TableNames<S>,
> = TableRelation<S, N, RelName> extends infer TR
   ? TR extends HasManyRelationDefinition | ManyToManyRelationDefinition
      ? ResolvePathWithRoot<S, TR['table'], RestPath, RootTable, N>[]
      : TR extends BelongsToRelationDefinition | HasOneRelationDefinition
         ? ApplyNullable<ResolvePathWithRoot<S, TR['table'], RestPath, RootTable, N>, TR>
         : ResolvePathWithRoot<S, TR['table'], RestPath, RootTable, N>
   : never

/** Resolve path on a relation's table while maintaining RootTable and ParentTable */
type ResolvePathWithRoot<
   S extends Schema,
   N extends TableNames<S>,
   Path extends string[],
   RootTable extends TableNames<S>,
   ParentTable extends TableNames<S>,
> = Path extends [infer First extends string, ...infer Rest extends string[]]
   ? First extends '*'
      ? ProcessWildcard<S, N, Rest, RootTable, ParentTable>
      : First extends TableRelationNames<S, N>
         ? Rest extends []
            ? ProcessColumn<S, N, First>
            : { [K in First]: ProcessRelationPath<S, N, K, Rest, RootTable> }
         : First extends TableColumnNames<S, N>
            ? ProcessColumn<S, N, First>
            : never
   : {}

/** Process all non-circular relations with remaining wildcards */
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

/** Merge columns with relations, letting relations override BelongsTo foreign keys */
type MergeColumnsAndRelations<Base, Relations> = Prettify<
   { [K in keyof Base | keyof Relations]: K extends keyof Relations ? Relations[K] : Base[K] }
>

/** Process wildcard: * returns columns, *.* and deeper expand relations recursively */
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

/** Resolve a path array to an object type */
type ResolvePath<
   S extends Schema,
   N extends TableNames<S>,
   Path extends string[],
> = Path extends [infer First extends string, ...infer Rest extends string[]]
   ? First extends '*'
      ? ProcessWildcard<S, N, Rest, N, N>
      : First extends TableRelationNames<S, N>
         ? Rest extends []
            ? ProcessColumn<S, N, First>
            : { [K in First]: ProcessRelationPath<S, N, K, Rest, N> }
         : First extends TableColumnNames<S, N>
            ? ProcessColumn<S, N, First>
            : never
   : {}

/** Process a single field string (e.g., "id", "posts.title", "posts.*") */
type ProcessField<S extends Schema, N extends TableNames<S>, Field extends string>
   = ResolvePath<S, N, SplitPath<Field>>

/** Convert field tuple to union of processed types */
type FieldsToUnion<S extends Schema, N extends TableNames<S>, Fields extends FieldName<S, N>[]>
   = ProcessField<S, N, Fields[number] & string>

/** Turn union into object via intersection */
type UnionToIntersection<U>
   = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

/** Merge union types into single object */
type MergeUnionToObject<T>
   = { [K in keyof UnionToIntersection<T>]: UnionToIntersection<T>[K] }

/** Pick properties from table using dot notation paths */
export type PickTableItemDotNotation<
   S extends Schema,
   N extends TableNames<S>,
   Fields extends FieldName<S, N>[] = [],
> = Fields['length'] extends 0
   ? {}
   : MergeUnionToObject<FieldsToUnion<S, N, Fields>>

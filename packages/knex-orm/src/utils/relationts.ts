import type { BelongsToRelationDefinition, HasManyRelationDefinition, HasOneRelationDefinition, ManyToManyRelationDefinition, RelationDefinition } from '../types/schema'

/**
 * Check if a relation is a many-to-many relation.
 */
export function isManyToMany(relation: RelationDefinition): relation is ManyToManyRelationDefinition {
   return relation.type === 'manyToMany'
}

/**
 * Check if a relation is a has one relation.
 */
export function isHasOne(relation: RelationDefinition): relation is HasOneRelationDefinition {
   return relation.type === 'hasOne'
}

/**
 * Check if a relation is a has many relation.
 */
export function isHasMany(relation: RelationDefinition): relation is HasManyRelationDefinition {
   return relation.type === 'hasMany'
}

/**
 * Check if a relation is a belongs to relation.
 */
export function isBelongsTo(relation: RelationDefinition): relation is BelongsToRelationDefinition {
   return relation.type === 'belongsTo'
}

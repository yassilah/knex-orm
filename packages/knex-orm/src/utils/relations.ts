import type { BelongsToRelationDefinition, FieldDefinition, HasManyRelationDefinition, HasOneRelationDefinition, ManyToManyRelationDefinition } from '../types/schema'

/**
 * Check if a relation is a many-to-many relation.
 */
export function isManyToMany(relation: FieldDefinition): relation is ManyToManyRelationDefinition {
   return relation.type === 'many-to-many'
}

/**
 * Check if a relation is a has one relation.
 */
export function isHasOne(relation: FieldDefinition): relation is HasOneRelationDefinition {
   return relation.type === 'has-one'
}

/**
 * Check if a relation is a has many relation.
 */
export function isHasMany(relation: FieldDefinition): relation is HasManyRelationDefinition {
   return relation.type === 'has-many'
}

/**
 * Check if a relation is a belongs to relation.
 */
export function isBelongsTo(relation: FieldDefinition): relation is BelongsToRelationDefinition {
   return relation.type === 'belongs-to'
}

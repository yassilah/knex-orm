import type { Knex } from 'knex'
import type { Buffer } from 'node:buffer'
import type { z } from 'zod'
import type { FieldDefinition } from '@/types/schema'
import type { Operator } from '@/utils/operators'
import { OPERATORS } from '@/utils/operators'
import binary from './binary'
import boolean from './boolean'
import date from './date'
import json from './json'
import number from './number'
import string from './string'

export const DATA_TYPES = {
   string,
   number,
   boolean,
   date,
   json,
   binary,
} satisfies DataTypeGroupDefinitions

/**
 * Get the data type group for a given data type.
 */
export function getDataTypeGroup<T extends DataTypes>(type: T) {
   for (const group of Object.keys(DATA_TYPES)) {
      if (type in DATA_TYPES[group as keyof typeof DATA_TYPES].types) {
         return group as DataTypeGroup<T>
      }
   }

   throw new Error(`Unsupported data type: ${type}`)
}

/**
 * Get the data type group definition for a given data type.
 */
export function getDataTypeGroupDefinition<T extends DataTypes>(type: T) {
   return DATA_TYPES[getDataTypeGroup(type)] as DataTypeGroupDefinition<T>
}

/**
 * Get the data type definition for a given data type.
 */
export function getDataTypeDefinition<T extends DataTypes>(type: T) {
   const types = getDataTypeGroupDefinition(type).types
   if (!(type in types)) throw new Error(`Unsupported data type: ${type}`)
   return types[type] as DataTypeDefinition<T>
}

/**
 * Get the data type validator for a given data type.
 */
export function getDataTypeValidator<T extends DataTypes>(type: T) {
   return getDataTypeDefinition(type).validate
}

/**
 * Get the data type creator for a given data type.
 */
export function getDataTypeCreator<T extends DataTypes>(type: T) {
   return getDataTypeDefinition(type).create
}

/**
 * Get the data type before create hook for a given data type.
 */
export function getDataTypeBeforeCreate<T extends DataTypes>(type: T) {
   return getDataTypeDefinition(type).beforeCreate
}

/**
 * Get the data type after create hook for a given data type.
 */
export function getDataTypeAfterCreate<T extends DataTypes>(type: T) {
   return getDataTypeDefinition(type).afterCreate
}

/**
 * Get the data type after remove hook for a given data type.
 */
export function getDataTypeAfterRemove<T extends DataTypes>(type: T) {
   return getDataTypeDefinition(type).afterRemove
}

/**
 * Get the data type before remove hook for a given data type.
 */
export function getDataTypeBeforeRemove<T extends DataTypes>(type: T) {
   return getDataTypeDefinition(type).beforeRemove
}

/**
 * Get the data type operators for a given data type.
 */
export function getDataTypeOperators<T extends DataTypes>(type: T): Operator[] {
   return getDataTypeDefinition(type).operators
      ?? getDataTypeGroupDefinition(type).operators
      ?? Object.keys(OPERATORS) as Operator[]
}

/**
 * Define a data type.
 */
export function defineDataType(group: keyof typeof DATA_TYPES, type: string, definition: DataTypeProps) {
   Object.assign(DATA_TYPES[group].types, {
      [type]: definition,
   })
}

export type DataTypeGroupDefinitions = Record<string, DataTypeGroupProps>

export interface DataTypeGroupProps {
   types: DataTypeDefinitions
   operators?: Operator[]
}

export type DataTypeDefinitions = Record<string, DataTypeProps>

export interface DataTypeProps {
   create: (obj: { knex: Knex, builder: Knex.CreateTableBuilder | Knex.AlterTableBuilder, columnName: string, definition: FieldDefinition, tableName: string }) => Knex.ColumnBuilder
   beforeCreate?: (obj: { knex: Knex, columnName: string, tableName: string, definition: FieldDefinition }) => Promise<void> | void
   afterCreate?: (obj: { knex: Knex, columnName: string, tableName: string, definition: FieldDefinition }) => Promise<void> | void
   beforeRemove?: (obj: { knex: Knex, columnName: string, tableName: string }) => Promise<void> | void
   afterRemove?: (obj: { knex: Knex, columnName: string, tableName: string }) => Promise<void> | void
   validate: (obj: { z: typeof z, columnName: string, definition: FieldDefinition, tableName: string }) => z.ZodTypeAny
   operators?: Operator[]
}

export type DataTypeGroupDefinition<T extends DataTypes> = (typeof DATA_TYPES)[DataTypeGroup<T>] extends infer U extends DataTypeGroupProps ? U : never
export type DataTypeDefinition<T extends DataTypes> = DataTypeGroupDefinition<T>['types'][T] extends infer U extends DataTypeProps ? U : never
export type DataTypeValidator<T extends DataTypes> = ReturnType<DataTypeDefinition<T>['validate']>
export type DataTypeCreator<T extends DataTypes> = ReturnType<DataTypeDefinition<T>['create']>

export type DataType<T extends DataTypes> = (DataTypeGroup<T> extends infer U
   ? U extends 'number' ? number
      : U extends 'string' ? string
         : U extends 'boolean' ? boolean
            : U extends 'date' ? Date | string
               : U extends 'json' ? unknown
                  : U extends 'bigint' ? bigint | string
                     : U extends 'binary' ? Buffer
                        : never
   : never) extends infer V ? T extends `${string}-array` ? unknown[] : V : never

type BuiltInDataTypes = {
   [K in keyof typeof DATA_TYPES]: keyof (typeof DATA_TYPES)[K]['types']
}[keyof typeof DATA_TYPES] extends infer U ? U extends string ? U : never : never

type BuiltInDataTypesMap = {
   [K in BuiltInDataTypes]: true
}

export interface DataTypesMap extends BuiltInDataTypesMap {}

type DataTypeGroup<T extends keyof DataTypesMap> = {
   [K in keyof typeof DATA_TYPES]: T extends keyof (typeof DATA_TYPES)[K]['types'] ? K : never
}[keyof typeof DATA_TYPES] extends infer U ? U extends string ? U : never : never

export type DataTypes = keyof DataTypesMap

import type { Knex } from 'knex'
import type { Buffer } from 'node:buffer'
import type { z } from 'zod'
import type { FieldDefinition } from '../types/schema'
import type { Operator } from '../utils/operators'
import { OPERATORS } from '../utils/operators'
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
 * Get the data type remover for a given data type.
 */
export function getDataTypeRemover<T extends DataTypes>(type: T) {
   return getDataTypeDefinition(type).remove
}

/**
 * Get the data type operators for a given data type.
 */
export function getDataTypeOperators<T extends DataTypes>(type: T): Operator[] {
   return getDataTypeDefinition(type).operators
      ?? getDataTypeGroupDefinition(type).operators
      ?? Object.keys(OPERATORS) as Operator[]
}

export type DataTypeGroupDefinitions = Record<string, DataTypeGroupProps>

export interface DataTypeGroupProps {
   types: DataTypeDefinitions
   operators?: Operator[]
}

export type DataTypeDefinitions = Record<string, DataTypeProps>

export interface DataTypeProps {
   create: (obj: { knex: Knex, builder: Knex.CreateTableBuilder | Knex.AlterTableBuilder, columnName: string, definition: FieldDefinition, tableName: string }) => Promise<Knex.ColumnBuilder> | Knex.ColumnBuilder
   remove?: (obj: { knex: Knex, columnName: string, tableName: string }) => Promise<void> | void
   validate: (obj: { columnName: string, definition: FieldDefinition, tableName: string }) => z.ZodTypeAny
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
   : never) extends infer V ? T extends `${string}-array` ? V[] : V : never

export type DataTypeGroup<T extends DataTypes> = {
   [K in keyof typeof DATA_TYPES]: T extends keyof (typeof DATA_TYPES)[K]['types'] ? K : never
}[keyof typeof DATA_TYPES] extends infer U ? U extends string ? U : never : never

export type DataTypes = {
   [K in keyof typeof DATA_TYPES]: keyof (typeof DATA_TYPES)[K]['types']
}[keyof typeof DATA_TYPES] extends infer U ? U extends string ? U : never : never

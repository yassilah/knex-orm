export type Prettify<T> = {
   -readonly [K in keyof T]: T[K] extends object ? Prettify<T[K]> : T[K]
} & {}

export type Merge<T, U> = {
   [K in keyof T | keyof U]: K extends keyof T ? T[K] : K extends keyof U ? U[K] : never
}

type DeepPartialUnion<T> = T extends any
   ? T extends (infer U)[]
      ? Prettify<DeepPartial<U>>[]
      : T extends object
         ? Prettify<DeepPartial<T>>
         : T
   : never

export type DeepPartial<T extends object> = {
   [P in keyof T]?: T[P] extends (infer U)[]
      ? Prettify<DeepPartial<U>>[]
      : T[P] extends object
         ? Prettify<DeepPartial<T[P]>>
         : DeepPartialUnion<T[P]>
}

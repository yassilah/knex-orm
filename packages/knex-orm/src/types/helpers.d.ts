export type Prettify<T> = {
   [K in keyof T]: T[K]
} & {}

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

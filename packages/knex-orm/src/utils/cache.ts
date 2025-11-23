/**
 * Create a simple cache manager with multiple stores.
 * Each store is a Map or WeakMap for automatic garbage collection.
 */
function createGlobalCache(options?: { enabled?: boolean }) {
   const stores = new Map<string, Map<any, any> | WeakMap<object, any>>()
   const enabled = options?.enabled ?? true

   function getStore(store: string) {
      if (!stores.has(store)) stores.set(store, new Map())
      return stores.get(store)!
   }

   function useCache<T>(storeName: string, key: any, fn: () => T) {
      if (!enabled) return fn()
      const store = getStore(storeName)
      if (!store.has(key)) {
         store.set(key, fn())
      }
      return store.get(key) as T
   }

   function clear() {
      stores.forEach((store) => {
         if (store instanceof Map) store.clear()
      })
   }

   return {
      useCache,
      clear,
   }
}

/**
 * Global cache instance (default).
 * Can be replaced with a custom instance via ORM configuration.
 */
export const globalCache = createGlobalCache()

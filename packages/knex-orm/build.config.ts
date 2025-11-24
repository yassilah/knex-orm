import { resolve } from 'node:path'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
   clean: true,
   declaration: true,
   entries: [{
      input: 'src/index.ts',
      outDir: 'dist',
      format: 'esm',
   }, {
      input: 'src/extensions/index.ts',
      outDir: 'dist/extensions',
      format: 'esm',
   }, {
      input: 'src/bin/orm-migrate.ts',
      outDir: 'dist/bin',
      format: 'cjs',
   }],
   alias: {
      '@': resolve(__dirname, './src'),
   },
})

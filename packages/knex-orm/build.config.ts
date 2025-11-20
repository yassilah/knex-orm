import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
   clean: true,
   declaration: true,
   entries: [
      {
         builder: 'mkdist',
         input: './src/',
         outDir: './dist',
         format: 'esm',
         ext: 'js',
      },
   ],
   rollup: {
      emitCJS: false,
   },
})

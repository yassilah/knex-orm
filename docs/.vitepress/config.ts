import { defineConfig } from 'vitepress'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')?.[1]
const docsBase =
  process.env.DOCS_BASE ??
  (repositoryName ? `/${repositoryName}/` : '/')

export default defineConfig({
  title: '@yassidev/knex-orm',
  description: 'TypeScript ORM on top of Knex with schema definition and migrations',
  base: docsBase,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/instance' },
      { text: 'Examples', link: '/examples/basic-usage' },
    ],
    
    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/getting-started' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' },
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Schema Definition', link: '/guide/schema-definition' },
            { text: 'Data Types', link: '/guide/data-types' },
            { text: 'Relations', link: '/guide/relations' },
          ],
        },
        {
          text: 'Querying',
          items: [
            { text: 'Finding Records', link: '/guide/finding-records' },
            { text: 'Filters', link: '/guide/filters' },
            { text: 'Selecting Columns', link: '/guide/selecting-columns' },
          ],
        },
        {
          text: 'Mutations',
          items: [
            { text: 'Creating Records', link: '/guide/creating-records' },
            { text: 'Updating Records', link: '/guide/updating-records' },
            { text: 'Deleting Records', link: '/guide/deleting-records' },
            { text: 'Nested Mutations', link: '/guide/nested-mutations' },
          ],
        },
        {
          text: 'Migrations',
          items: [
            { text: 'Schema Migrations', link: '/guide/migrations' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Instance', link: '/api/instance' },
            { text: 'Query Methods', link: '/api/query-methods' },
            { text: 'Mutation Methods', link: '/api/mutation-methods' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Basic Usage', link: '/examples/basic-usage' },
            { text: 'Relations', link: '/examples/relations' },
            { text: 'Complex Queries', link: '/examples/complex-queries' },
          ],
        },
      ],
    },
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/yassi/knex-orm' },
    ],
    
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Yassi Lah',
    },
  },
})


import { createInstance, defineSchema, withDefaults } from '@yassidev/knex-orm'

const schema = defineSchema({
    users: withDefaults({
        email: { type: 'varchar', unique: true, nullable: false },
        name: { type: 'varchar', nullable: false },
        posts: { type: 'has-many', foreignKey: 'author', table: 'posts' },
        status: { type: 'enum', options: ['active', 'inactive'], nullable: false },
    }),
    posts: withDefaults({
        title: { type: 'varchar', nullable: false },
        content: { type: 'text', nullable: false },
        author: { type: 'belongs-to', foreignKey: 'id', table: 'users' },
        tags: { type: 'many-to-many', foreignKey: 'id', table: 'tags', through: { table: 'posts_tags', sourceFk: 'post', tableFk: 'tag' } },
    }),
    tags: withDefaults({
        name: { type: 'enum-array', options: ['tag1', 'tag2', 'tag3'], nullable: false },
    }),
    posts_tags: withDefaults({
        post: { type: 'belongs-to', foreignKey: 'id', table: 'posts' },
        tag: { type: 'belongs-to', foreignKey: 'id', table: 'tags' },
    }),
})


const orm = createInstance(schema, {
    client: 'sqlite3',
    connection: { filename: ':memory:' },
})

const users = await orm.find('users', {
    columns: ['posts.*.*']
})
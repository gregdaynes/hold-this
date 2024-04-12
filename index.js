import connect, { sql } from '@databases/sqlite-sync'

const db = connect()

console.log(db.query(sql`SELECT * FROM users;`))

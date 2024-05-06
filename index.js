import connect, { sql } from '@databases/sqlite-sync'
import serialize from 'serialize-javascript'

/**
 * @class KVStore
 * A simple key-value store that uses SQLite as the backend.
 * @param {string} [location=':memory:'] The path to the SQLite file.
 *
 * @example
 * const store = new KVStore()
 * store.set('topic', 'key', 'value')
 * store.get('topic', 'key')
 *
 * @example
 * const store = new KVStore()
 * store.set('topic', 'account-123:user-456', 'value')
 * store.get('topic', 'account-123:*')
 * => [['account-123:user-456', 'value']]
 */
export class KVStore {
  /**
   * The topics that have been initialized.
   * @type {Object.<string, boolean>}
   */
  #topics = {}

  /**
   * The SQLite connection.
   * @type {import('@databases/sqlite-sync').SQLiteDatabase}
   */
  #connection = null

  /**
   * Create a new key-value store.
   * @param {string} location The location of the SQLite file.
   * @param {Object} options The options for the key-value store.
   * @param {boolean} [options.enableWAL=true] Enable the Write-Ahead Logging for the SQLite store.
   * @param {boolean} [options.exposeConnection=false] Expose the connection to the SQLite store.
   * @returns {void}
   */
  constructor (location, { enableWAL = true, exposeConnection = false, turbo = false } = {}) {
    this.#connection = connect(location)
    this.#topics = {}
    this.turbo = turbo

    if (enableWAL && location !== ':memory:') {
      this.#connection.query(sql`PRAGMA journal_mode = WAL`)
      this.#connection.query(sql`PRAGMA synchronous = OFF`)

      // Recommended optimizations, but not found to be beneficial in benchmarking
      // this.#connection.query(sql`PRAGMA temp_store = memory`)
      // this.#connection.query(sql`PRAGMA mmap_size = 30000000000`)
      // this.#connection.query(sql`pragma page_size = 32768`)
      // this.#connection.query(sql`PRAGMA cache_size=1000`)
    }

    if (exposeConnection) {
      this.connection = this.#connection
      this.sql = sql
    }
  }

  /**
   * Initialize a topic.
   * @param {string} topic The topic to initialize.
   * @param {string} key The key to initialize.
   * @returns {KVStore} The KVStore instance.
   */
  init (topic = 'topic', key = 'key') {
    const query = this.#parseKey(key, ([i]) => sql`${sql.ident(`col${i}`)} TEXT NOT NULL`)
    query.push(sql`serialized BOOLEAN DEFAULT FALSE`)
    query.push(sql`value TEXT NOT NULL`)
    query.push(sql`ttl DATETIME DEFAULT NULL`)

    if (!this.turbo) {
      const unique = this.#parseKey(key, ([i]) => sql`${sql.__dangerous__rawValue(`col${i}`)}`)
      query.push(sql`UNIQUE (${sql.join(unique, ', ')})`)
    }

    this.#connection.tx((transaction) => {
      transaction.query(sql`
        CREATE TABLE IF NOT EXISTS ${sql.ident(topic)} (
          ${sql.join(query, ', ')}
        );
      `)

      if (!this.turbo) {
        transaction.query(sql`
          CREATE INDEX idx_${sql.__dangerous__rawValue(topic)}_ttl
          ON ${sql.__dangerous__rawValue(topic)} (ttl);
        `)
      }
    })

    this.#topics[topic] = true

    return this
  }

  /**
   * Prepare a query to set a value in the key-value store.
   * @param {string} topic The topic to set the value in.
   * @param {string} key The key to set the value for.
   * @param {string} value The value to set.
   * @param {Object} [options] The options for operation.
   * @param {number} [options.ttl] The time-to-live for the value in milliseconds.
   * @returns {import('@databases/sqlite-sync').SQLQuery} The query to set the value.
   */
  prepare (topic, key, rawValue, options) {
    const columns = this.#parseKey(key, ([i]) => sql`${sql.ident(`col${i}`)}`)

    const values = this.#parseKey(key, (key) => sql`${key[1]}`)

    const conditions = this.#parseKey(key,
      ([i, column]) => sql`${sql.ident(`col${i}`)} = ${column}`)

    let value = rawValue; let serialized = 'false'
    if (typeof rawValue !== 'string') {
      value = serialize(value, { isJSON: options?.isJSON })
      serialized = 'true'
    }

    if (options?.ttl >= 0) {
      const ttl = new Date(Date.now() + options.ttl).toISOString()
      columns.push(sql`ttl`)
      values.push(sql`${ttl}`)
    }

    let query = sql`
      INSERT INTO ${sql.ident(topic)} (${sql.join(columns, ',')}, value, serialized)
      VALUES (${sql.join(values, ', ')}, ${value}, ${sql.__dangerous__rawValue(serialized)})
    `

    if (!this.turbo) {
      query = sql.join([query, sql`ON CONFLICT DO UPDATE SET ${sql.ident('value')} = ${value}, ${sql.ident('serialized')} = ${serialized} WHERE (${sql.join(conditions, ') AND (')});`])
    }

    return query
  }

  /**
   * Set a value in the key-value store.
   * @param {string} topic The topic to set the value in.
   * @param {string} key The key to set the value for.
   * @param {string} value The value to set.
   * @param {Object} [options] The options for operation.
   * @param {number} [options.ttl] The time-to-live for the value in milliseconds.
   * @returns {boolean|string} True if the value was set, an error otherwise.
   */
  set (topic = 'topic', key, rawValue, options) {
    if (!this.#topics[topic]) this.init(topic, key)

    const query = this.prepare(topic, key, rawValue, options)

    try {
      this.#connection.query(query)
      return true
    } catch (err) {
      return err
    }
  }

  /**
   * Set multiple values in the key-value store.
   * @param {string} topic The topic to set the values in.
   * @param {string} key The key to set the values for.
   * @param {Array.<Array.<string, string>>} entries The entries to set. Each entry should be a valid sql query.
   * @returns {boolean} True if the values were set.
   */
  setBulk (topic = 'topic', key, entries) {
    if (!this.#topics[topic]) this.init(topic, key)

    this.#connection.tx((transaction) => {
      for (const entry of entries) {
        transaction.query(entry)
      }
    })

    return true
  }

  /**
   * Get a value from the key-value store.
   * @param {string} topic The topic to get the value from.
   * @param {string} key The key to get the value for.
   * @returns {Array.<Array.<string, string>>|null} The value if it exists, null otherwise.
   */
  get (topic = 'topic', key) {
    if (!this.#topics[topic]) return null

    const conditions = this.#parseKey(key, ([i, column]) => {
      if (column.includes('*')) return

      return sql`${sql.ident(`col${i}`)} = ${column}`
    })

    let query = sql`
      SELECT *
      FROM ${sql.ident(topic)}
      WHERE (ttl IS NULL OR ttl > ${new Date().toISOString()})
    `

    if (key !== '*') {
      query = sql.join([query, sql`AND (${sql.join(conditions, ') AND (')})`])
    }

    const results = []
    for (const result of this.#connection.query(query)) {
      const { value, serialized, ttl, ...columns } = result
      // eslint-disable-next-line no-eval
      const deserialized = serialized ? eval(`(${value})`) : value

      results.push([Object.values(columns).join(':'), deserialized])
    }

    return results
  }

  /**
   * Bind a topic to the key-value store.
   * @param {string} topic The topic to bind.
   * @returns {Object} The bound methods.
   */
  bind (topic) {
    return {
      set: this.set.bind(this, topic),
      get: this.get.bind(this, topic)
    }
  }

  clean (topic = null) {
    if (this.#topics.length === 0) return

    this.#connection.tx((transaction) => {
      if (topic) {
        transaction.query(sql`
          DELETE FROM ${sql.ident(topic)}
          WHERE ttl < ${new Date().toISOString()}
        `)
      } else {
        for (const topic of Object.keys(this.#topics)) {
          transaction.query(sql`
          DELETE FROM ${sql.ident(topic)}
          WHERE ttl < ${new Date().toISOString()}
        `)
        }
      }
    })
  }

  #splitKey (key) {
    return key.split(':')
  }

  #parseKey (key, fn) {
    const values = []

    for (const entry of this.#splitKey(key).entries()) {
      const value = fn(entry)
      if (value) values.push(value)
    }

    return values
  }
}

/**
 * Create a new key-value store.
 * @param {Object} options The options for the key-value store.
 * @param {string} [options.location=':memory:'] The location of the SQLite file.
 * @param {boolean} [options.exposeConnection=false] Expose the connection to the SQLite store.
 * @param {boolean} [options.enableWAL=true] Enable the Write-Ahead Logging for the SQLite store.
 * @param {boolean} [options.turbo=false] Enable the turbo mode for the SQLite store. Turbo mode does not have indexes, constraints, or conflict checks.
 * @returns {KVStore} The key-value store.
 */
export default function factory ({ location = ':memory:', exposeConnection = false, enableWAL = true, turbo = false } = {}
) {
  return new KVStore(location, { exposeConnection, enableWAL, turbo })
}

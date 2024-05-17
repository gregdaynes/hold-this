import Database from 'better-sqlite3'
import serialize from 'serialize-javascript'

/**
 * @typedef {Object} SetResult
 * @property {number} changes The number of changes made.
 * @property {number} lastInsertRowid The last inserted row id.
 */

/**
 * @typedef {array} PreparedData
 * @property {string} query The prepared query and value tuple
 * @property {array} values The values to bind to the query
 */

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
   */
  #connection = null

  /**
   * Buffer configuration
   */
  #bufferThreshold = 1000
  #bufferTimeout = 500

  /**
   * Create a new key-value store.
   * @param {string} location The location of the SQLite file.
   * @param {Object} options The options for the key-value store.
   * @param {boolean} [options.enableWAL=true] Enable the Write-Ahead Logging for the SQLite store.
   * @param {boolean} [options.exposeConnection=false] Expose the connection to the internal connection for the SQLite store.
   * @returns {void}
   */
  constructor (location, { enableWAL = true, exposeConnection = false, turbo = false, bufferThreshold, bufferTimeout } = {}) {
    this.#connection = new Database(location)
    this.#topics = {}
    this.turbo = turbo

    if (enableWAL && location !== ':memory:') {
      this.#connection.pragma('journal_mode = WAL')
      this.#connection.pragma('synchronous = OFF')

      // Recommended optimizations, but not found to be beneficial in benchmarking
      // this.#connection.pragma('temp_store = memory')
      // this.#connection.pragma('mmap_size = 10000')
      this.#connection.pragma('page_size = 65536')
      // this.#connection.pragma('cache_size = 1000')
    }

    if (exposeConnection) {
      this.connection = this.#connection
    }

    if (bufferThreshold) {
      this.#bufferThreshold = bufferThreshold
    }

    if (bufferTimeout) {
      this.#bufferTimeout = bufferTimeout
    }
  }

  /**
   * Initialize a topic.
   * @param {string} topic The topic to initialize.
   * @param {string} key The key to initialize.
   * @returns {KVStore} The KVStore instance.
   */
  init (topic = 'topic', key = 'key') {
    const unique = `${!this.turbo ? `, UNIQUE (${this.#parseKey(key, ([i]) => `col${i}`).join(', ')})` : ''}`

    this.#connection.transaction(() => {
      this.#connection.exec(`
        CREATE TABLE IF NOT EXISTS \`${topic}\` (
          ${this.#parseKey(key, ([i]) => `col${i} TEXT NOT NULL`).join(',\n')},
          serialized BOOLEAN DEFAULT FALSE,
          value TEXT NOT NULL,
          ttl DATETIME DEFAULT NULL

          ${unique}
        );
      `)

      if (!this.turbo) {
        this.#connection.exec(`
          CREATE INDEX IF NOT EXISTS idx_${topic}_ttl
          ON ${topic} (ttl);
        `)
      }
    })()

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
   * @returns {PreparedData} The query and values in a tuple.
   */
  prepare (topic, key, rawValue, options) {
    const columns = this.#parseKey(key, ([i]) => `col${i}`)

    const values = this.#parseKey(key, (key) => key[1])

    if (options?.ttl >= 0) {
      const ttl = new Date(Date.now() + options.ttl).toISOString()
      columns.push('ttl')
      values.push(ttl)
    }

    let value = rawValue
    let serialized = 'false'
    if (typeof rawValue !== 'string') {
      value = serialize(value, { isJSON: options?.isJSON })
      serialized = 'true'
    }
    values.push(value)
    values.push(serialized)

    let query = `
      INSERT INTO \`${topic}\` (${columns.join(', ')}, value, serialized)
      VALUES (${Array(values.length).fill('?').join(', ')})
    `

    if (!this.turbo) {
      values.push(value)
      values.push(serialized)

      const conditions = this.#parseKey(key, ([i, column]) => {
        values.push(column)

        return `"col${i}" = ?`
      })

      query = [query, `ON CONFLICT DO UPDATE SET "value" = ?, "serialized" = ? WHERE (${conditions.join(') AND (')});`].join('\n')
    }

    return [
      this.#connection.prepare(query),
      values
    ]
  }

  /**
   * Set a value in the key-value store.
   * @param {string} topic The topic to set the value in.
   * @param {string} key The key to set the value for.
   * @param {string} value The value to set.
   * @param {Object} [options] The options for operation.
   * @param {number} [options.ttl] The time-to-live for the value in milliseconds.
   * @returns {SetResult} The result of the operation.
   */
  set (topic = 'topic', key, rawValue, options) {
    if (!this.#topics[topic]) this.init(topic, key)

    const [query, values] = this.prepare(topic, key, rawValue, options)

    return query.run(values)
  }

  /**
   * Set multiple values in the key-value store.
   * @param {string} topic The topic to set the values in.
   * @param {string} key The key to set the values for.
   * @param {PreparedData} entries The prepared data to set. Each entry should be a tuple with querystring and values.
   * @returns {boolean} True if the values were set.
   */
  setBulk (topic = 'topic', key, entries) {
    if (!this.#topics[topic]) this.init(topic, key)

    this.#connection.transaction((transaction) => {
      for (const [query, values] of entries) {
        query.run(values)
      }
    })()

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

    const values = []

    const now = new Date().toISOString()
    values.push(now)

    const conditions = this.#parseKey(key, ([i, column]) => {
      if (column.includes('*')) return
      values.push(column)

      return `"col${i}" = ?`
    })

    let query = `
      SELECT *
      FROM \`${topic}\`
      WHERE ("ttl" IS NULL OR "ttl" > ?)
    `

    if (key !== '*') {
      query = [query, `AND (${conditions.join(') AND (')})`].join(' ')
    }

    const prepared = this.#connection.prepare(query)

    const results = []
    for (const row of prepared.iterate(values)) {
      let { value, serialized, ttl, ...columns } = row
      serialized = serialized === 'true'

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

  /**
   * Clean the key-value store removing expired records from all topics or the specified.
   * @param {string} [topic=null] The topic to clean. defaults to all
   * @returns {void}
   */
  clean (topic = null) {
    if (this.#topics.length === 0) return
    const topics = topic ? [topic] : Object.keys(this.#topics)

    const date = new Date().toISOString()

    this.#connection.transaction(() => {
      for (const topic of topics) {
        this.#connection.exec(`
          DELETE FROM \`${topic}\`
          WHERE "ttl" < '${date}';
        `)
      }
    })()
  }

  /**
   * Use a buffer to collect records and insert them in bulk.
   * when the buffer reaches a count threshold of records or timeout
   * the buffer is drained through a transactional insert in bulk.
   * @param {string} topic The topic to buffer.
   * @param {string} key The key to buffer.
   * @param {string} value The value to buffer.
   * @returns {void}
   */
  setBuffered (topic, key, value) {
    if (this.timeOut) clearTimeout(this.timeOut)
    if (!this.#topics[topic]) this.init(topic, key)

    this.buffer = (this.buffer || []).concat([this.prepare(topic, key, value)])

    if (this.buffer.length >= this.#bufferThreshold) {
      this.#drainBuffer(topic, key, this.buffer)
      return
    }

    this.timeOut = setTimeout(() => {
      this.#drainBuffer(topic, key, this.buffer)
    }, this.#bufferTimeout)
  }

  #drainBuffer (topic, key, entries) {
    this.setBulk(topic, key, entries)
    this.buffer = []
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
 * @param {number} [options.bufferTimeout=500] The timeout in milliseconds to wait before draining the buffer.
 * @param {number} [options.bufferThreshold=1000] The threshold count of records to wait before draining the buffer.
 * @returns {KVStore} The key-value store.
 */
export default function factory ({ location = ':memory:', exposeConnection = false, enableWAL = true, turbo = false, bufferTimeout, bufferThreshold } = {}
) {
  return new KVStore(location, { exposeConnection, enableWAL, turbo, bufferTimeout, bufferThreshold })
}

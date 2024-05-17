Hold This
=========

A simple key-value store that uses SQLite as the backend.
It is designed to be used in a single-threaded synchronous environment.

Getting Started
---------------

```js
npm install --save hold-this
```

### Use in-memory store

```js
import hold from 'hold-this'

const holder = hold()
holder.set('accounts', 'account-123:user-123:name', 'Alice')
holder.set('accounts', 'account-123:user-456:name', 'Bob')

console.log(holder.get('accounts', 'account-123:*:name'))
// => [['account-123:user-123:name', 'Alice'], ['account-123:user-456:name', 'Bob']]
```

Other Examples
--------------

### File based store

Pass an object with a key `location` and a path to a file. This will be the filepath that hold-this utilizes to write to disk.

```js
import hold from 'hold-this'

const holder = holder({ location: './holder.sqlite' })
holder.set('accounts', 'account-123:user-123:name', 'Alice')
holder.set('accounts', 'account-123:user-456:name', 'Bob')

console.log(holder.get('accounts', 'account-123:*:name'))
// => [['account-123:user-123:name', 'Alice'], ['account-123:user-456:name', 'Bob']]
```

File based store defaults to using WAL for performance purposes. This can be disabled by setting `{ enableWAL: false}` when creating the instance.

> [!CAUTION]
> This will severely decrease write performance for File based storage.

```js
import hold from 'hold-this'

const holder = holder({ location: './holder.sqlite', enableWAL: false })
```

> [!TIP]
> You can benchmark by running `npm run test:bench`

| Task Name                           | ops/sec | Average Time (ns)  | Margin | Samples |
|-------------------------------------|---------|--------------------|----------|-------|
| SET: disk                           | 4,479   | 223243.780         | ±3.51% | 2241    |
| SET: diskWAL                        | 46,920  |  21312.531         | ±1.13% | 23461   |
| SET: memory                         | 97,835  |  10221.214         | ±2.13% | 48918   |
| SET: memory:serialization:json      | 88,712  |  11272.352         | ±2.78% | 44357   |
| SET: memory:serialization:json:fast | 88,407  |  11311.238         | ±3.97% | 44204   |
| SET: memory:complex-key             | 72,309  |  13829.498         | ±4.37% | 36155   |
| SET: buffered                       | 83,829  |  11928.928         | ±6.39% | 41915   |
| SET: buffered + turbo               | 189,670 |   5272.298         | ±4.92% | 94836   |
| GET: disk                           | 51,374  |  19464.797         | ±5.57% | 25688   |
| GET: diskWAL                        | 86,877  |  11510.509         | ±5.00% | 43439   |
| GET: memory                         | 87,775  |  11392.719         | ±7.03% | 43888   |
| GET: memory:serialization:json      | 82,347  |  12143.596         | ±6.20% | 41174   |
| GET: memory:serialization:json:fast | 81,565  |  12260.154         | ±6.61% | 40972   |
| GET: memory:complex-key             | 67,595  |  14793.962         | ±6.60% | 33798   |

_Performed on Macbook Pro M1 with 16 GB Memory_

### Bind Topic / Shorthand

Calling `.bind('myTopic')` on your hold-this instance, will return a modified instance that has topic already defined on set/get methods.

```js
import hold from 'hold-this'

const holder = holder().bind('accounts')
holder.set('account-123:user-123:name', 'Alice')
holder.get('account-123:user-456:name', 'Bob')

console.log(holder.get('account-123:*:name'))
// => [['account-123:user-123:name', 'Alice'], ['account-123:user-456:name', 'Bob']]
```

### Serialization

When passing the value with `.set`, if the value is not a string, the data will be serialized with `serialize-javascript` and then stored.
Passing an options object like `{ isJSON: true }`, with a proper JSON object, will signal to the serializer to use a faster mechanism.

```js
import hold from 'hold-this'

const holder = holder().bind('accounts')
holder.set('account-123:user-123:name', { firstName: 'Alice' }, { isJSON: true })
holder.get('account-123:user-456:name', 'Bob')

console.log(holder.get('account-123:*:name'))
// => [['account-123:user-123:name', { firstName: 'Alice' }], ['account-123:user-456:name', 'Bob']]
```

### TTTL / Expiring Records

When setting a record, specifying in a options object `{ ttl: 1000 }` will set a date in the future where the record will no longer be retrievable.
Note: TTL value is set in milliseconds.

```js
import hold from 'hold-this'

const holder = hold()
holder.set('accounts', 'account-123:user-123:name', 'Alice', { ttl: 1000 })
holder.set('accounts', 'account-123:user-456:name', 'Bob', { ttl: 0 })

console.log(holder.get('accounts', 'account-123:*:name'))
// => [['account-123:user-123:name', 'Alice']]
```

After a period of time, it is recommended to clean out expired records from the store.
This can be achieved by calling `.clean()` on the instance which will remove all expired records from all topics.
If a topic parameter is provided `.clean('myTopic')`, only this topic's expired records will be removed.

```js
import hold from 'hold-this'

const holder = hold()
holder.set('accounts', 'account-123:user-123:name', 'Alice', { ttl: 1000 })

holder.clean()
```

### Turbo Mode

If speed of insertion is a priority, turbo mode can be enabled.
When turbo mode is used, the table is not indexed, and unique keys are disabled.

> [!TIP]
> It is recommended to run turbo mode on an instance of hold-this away from the rest of your data.

> [!WARNING]
> Turbo mode removes table constraints and indexes.
> Fetching data with turbo mode enabled will be much slower.

```js
import hold from 'hold-this'

const holder = hold({ turbo: true })
holder.set('accounts', 'account-123:user-123:name', 'Alice')

console.log(holder.get('accounts', 'account-123:*:name'))
// => [['account-123:user-123:name', 'Alice']]
```

### Bulk Insertion

Bulk insertion leverages transactions to insert a batch of records, prepared ahead of time.

> [!CAUTION]
> When using transactions, if one insert fails, the batch is discarded.

```js
import hold from 'hold-this'

const holder = hold({ turbo: true })

const entries = Array.from(Array(3))
	.map((_, i) => holder.prepare('bulk', `key:${i}`, `value${i}`))

holder.setBulk('bulk', 'key', entries)

console.log(holder.get('bulk', 'key:*'))
// => [['key:0', 'value0'], ['key:1', 'value1'], ['key:2', 'value2']]
```

| Run | Time (ms) | Record Count | Records (per ms)|
|-----|-----------|--------------|-----------------|
| 9   | 309.484   | 402861       | 1301.718        |
| 3   | 290.291   | 377501       | 1300.425        |
| 5   | 295.262   | 377501       | 1278.528        |

_Using Turbo Mode_
_Performed on Macbook Pro M1 with 16 GB Memory_

### Buffered Insertion

Like bulk insertion, buffered insertion uses transactions, but handles _everything_ for you.

Everything is:
- preparation of the insert statement. Like `set`
- draining at threshold
- draining after time threshold

> [!CAUTION]
> When using transactions, if one insert fails, the batch is discarded.

> [!INFO]
> Records in the buffer are not queryable.

```js
import hold from 'hold-this'

const holder = hold({ turbo: true, bufferThreshold: 1000, bufferTimeout: 500 })

for (let i = 0; i < 1000; i++) {
	holder.setBuffered('buffer', 'key', `value${i}`)
}

// If 1000 records are not set in the buffer within the timeout of 500 ms, the buffer is drained.

console.log(holder.get('buffer', 'key:*'))
// => [['key:0', 'value0'], ['key:1', 'value1'], ...]
```

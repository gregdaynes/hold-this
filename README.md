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
holder.set('accounts', 'account-123:user-123:name', 'Alice', { ttl:  })

holder.clean()
````

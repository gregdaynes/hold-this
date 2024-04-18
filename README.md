Hold This
=========

A simple key-value store that uses SQLite as the backend.
It is designed to be used in a single-threaded synchronous environment.

```js
// install
npm install --save hold-this
```

```js
// In Memory Store
import hold from 'hold-this'

const holder = hold()
holder.set('accounts', 'account-123:user-123:name', 'Alice')
holder.set('accounts', 'account-123:user-456:name', 'Bob')

console.log(holder.get('accounts', 'account-123:*:name'))
// => [['account-123:user-123:name', 'Alice'], ['account-123:user-456:name', 'Bob']]
```

```js
// File based store
import hold from 'hold-this'

const holder = holder({ location: './holder.sqlite' })
holder.set('accounts', 'account-123:user-123:name', 'Alice')
holder.set('accounts', 'account-123:user-456:name', 'Bob')

console.log(holder.get('accounts', 'account-123:*:name'))
// => [['account-123:user-123:name', 'Alice'], ['account-123:user-456:name', 'Bob']]
```

```js
// Binding topic to get/set
import hold from 'hold-this'

const holder = holder().bind('accounts')
holder.set('account-123:user-123:name', 'Alice')
holder.get('account-123:user-456:name', 'Bob')

console.log(holder.get('account-123:*:name'))
// => [['account-123:user-123:name', 'Alice'], ['account-123:user-456:name', 'Bob']]
```

```js
// Serialization
import hold from 'hold-this'

const holder = holder().bind('accounts')
holder.set('account-123:user-123:name', { firstName: 'Alice' }, { isJSON: true })
holder.get('account-123:user-456:name', 'Bob')

console.log(holder.get('account-123:*:name'))
// => [['account-123:user-123:name', { firstName: 'Alice' }], ['account-123:user-456:name', 'Bob']]
```

```js
// TTL Records
import hold from 'hold-this'

const holder = hold()
holder.set('accounts', 'account-123:user-123:name', 'Alice', { ttl: 1000 })
holder.set('accounts', 'account-123:user-456:name', 'Bob', { ttl: 0 })

console.log(holder.get('accounts', 'account-123:*:name'))
// => [['account-123:user-123:name', 'Alice']]
```

```js
// Clean TTL Records
import hold from 'hold-this'

const holder = hold()
holder.set('accounts', 'account-123:user-123:name', 'Alice', { ttl:  })

holder.clean()
````

SQLite KV Store
===============

This is a simple key-value store that uses SQLite as the backend.
It is designed to be used in a single-threaded synchronous environment.

```js
// In Memory Store
import KVStore from './index.js'

const kvstore = KVStore()
kvstore.set('accounts', 'account-123:user-123:name', 'Alice')
kvstore.set('accounts', 'account-123:user-456:name', 'Bob')

console.log(kvstore.get('accounts', 'account-123:*:name'))
// => [['account-123:user-123:name', 'Alice'], ['account-123:user-456:name', 'Bob']]
```

```js
// File based store
import KVStore from './index.js'

const kvstore = KVStore({ location: './kvstore.sqlite' })
kvstore.set('accounts', 'account-123:user-123:name', 'Alice')
kvstore.set('accounts', 'account-123:user-456:name', 'Bob')

console.log(kvstore.get('accounts', 'account-123:*:name'))
// => [['account-123:user-123:name', 'Alice'], ['account-123:user-456:name', 'Bob']]
```

```js
// Binding topic to get/set
import KVStore from './index.js'

const kvstore = KVStore().bind('accounts')
kvstore.set('account-123:user-123:name', 'Alice')
kvstore.get('account-123:user-456:name', 'Bob')

console.log(kvstore.get('account-123:*:name'))
// => [['account-123:user-123:name', 'Alice'], ['account-123:user-456:name', 'Bob']]
```

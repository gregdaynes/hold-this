SQLite KV Store
===============

This is a simple key-value store that uses SQLite as the backend.
It is designed to be used in a single-threaded synchronous environment.


```js
import kvstore from './index.js'

kvstore('accounts', 'account-123:user-123:name', 'Alice')
kvstore('accounts', 'account-123:user-456:name', 'Bob')

console.log(kvstore('accounts', 'account-123:*:name'))
// => [['account-123:user-123:name', 'Alice'], ['account-123:user-456:name', 'Bob']]
```


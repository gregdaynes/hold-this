import test from 'node:test'
import assert from 'node:assert/strict'
import KVStore from './index.js'

test('lib', async (t) => {
  await t.test('with a topic, set and retrieve a key and value', async (t) => {
    const store = KVStore()
    store.set('myTopic', 'key', 'value')

    const [result] = store.get('myTopic', 'key')

    assert.equal(result[0], 'key')
    assert.equal(result[1], 'value')
  })

  await t.test('without a topic, set and retrieve a key and value', async (t) => {
    const store = KVStore()
    store.set(undefined, 'key', 'value')

    const [result] = store.get(undefined, 'key')

    assert.equal(result[0], 'key')
    assert.equal(result[1], 'value')
  })

  await t.test('key with separators creates separate columns', async (t) => {
    const store = KVStore()
    store.set('multi', 'key:with:separators', 'value')

    const [result] = store.get('multi', 'key:with:separators')

    assert.equal(result[0], 'key:with:separators')
    assert.equal(result[1], 'value')
  })

  await t.test('can fetch with wildcards', async (t) => {
    const store = KVStore()
    store.set('wild', 'key:abc:separators', 'value')
    store.set('wild', 'key:def:separators', 'value')
    store.set('wild', 'key:abc:others', 'value')

    await t.test('key with single entry', async (t) => {
      const results = store.get('wild', '*:abc:separators')

      assert.equal(results.length, 1)
      assert.equal(results[0][0], 'key:abc:separators')
    })

    await t.test('key with multiple entries', async (t) => {
      const results = store.get('wild', 'key:*:separators')

      assert.equal(results.length, 2)
      assert.equal(results[0][0], 'key:abc:separators')
      assert.equal(results[1][0], 'key:def:separators')
    })

    await t.test('key with multiple entries', async (t) => {
      const results = store.get('wild', 'key:*:*')

      assert.equal(results.length, 3)
      assert.equal(results[0][0], 'key:abc:others')
      assert.equal(results[1][0], 'key:abc:separators')
      assert.equal(results[2][0], 'key:def:separators')
    })

    await t.test('all keys', async (t) => {
      const results = store.get('wild', '*')

      assert.equal(results.length, 3)
      assert.equal(results[2][0], 'key:abc:others')
      assert.equal(results[0][0], 'key:abc:separators')
      assert.equal(results[1][0], 'key:def:separators')
    })
  })

  await t.test('binding predefined topics', async (t) => {
    await t.test('binding topic, set and retrieve a key and value', async (t) => {
      const store = KVStore().bind('bound')
      store.set('key', 'value')
      const results = store.get('key')

      assert.equal(results[0][0], 'key')
      assert.equal(results[0][1], 'value')
    })

    await t.test('binding topic does not affect other topics', async (t) => {
      const store = KVStore()
      const bound = store.bind('bound')

      store.set('not_bound', 'key', 'value')
      bound.set('boundKey', 'boundValue')
      const results = store.get('not_bound', 'key')
      const boundResults = bound.get('boundKey')

      assert.equal(results[0][0], 'key')
      assert.equal(results[0][1], 'value')
      assert.equal(boundResults[0][0], 'boundKey')
      assert.equal(boundResults[0][1], 'boundValue')
    })
  })

  await t.test('serialization of non-string values', async (t) => {
    await t.test('object', async (t) => {
      const store = KVStore()
      store.set('object', 'key', { value: 'value' }, { isJSON: true })

      const [result] = store.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1].value, 'value')
    })

    await t.test('number', async (t) => {
      const store = KVStore()
      store.set('object', 'key', 123456)

      const [result] = store.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1], 123456)
    })

    await t.test('number', async (t) => {
      const store = KVStore()
      store.set('object', 'key', 123456)

      const [result] = store.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1], 123456)
    })

    await t.test('array', async (t) => {
      const store = KVStore()
      store.set('object', 'key', [1, 2, 3])

      const [result] = store.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.deepEqual(result[1], [1, 2, 3])
    })

    await t.test('boolean', async (t) => {
      const store = KVStore()
      store.set('object', 'key', true)

      const [result] = store.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1], true)
    })

    await t.test('null', async (t) => {
      const store = KVStore()
      store.set('object', 'key', null)

      const [result] = store.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1], null)
    })

    await t.test('undefined', async (t) => {
      const store = KVStore()
      store.set('object', 'key', undefined)

      const [result] = store.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1], undefined)
    })

    await t.test('bigint', async (t) => {
      const store = KVStore()
      store.set('object', 'key', BigInt(10))

      const [result] = store.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1], BigInt(10))
    })

    await t.test('infinity', async (t) => {
      const store = KVStore()
      store.set('object', 'key', Infinity)

      const [result] = store.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1], Infinity)
    })

    await t.test('date', async (t) => {
      const store = KVStore()
      store.set('object', 'key', new Date('Thu, 28 Apr 2016 22:02:17 GMT'))

      const [result] = store.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1].toISOString(), '2016-04-28T22:02:17.000Z')
    })

    await t.test('map', async (t) => {
      const store = KVStore()
      store.set('object', 'key', new Map([['hello', 'world']]))

      const [result] = store.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1].get('hello'), 'world')
    })

    await t.test('set', async (t) => {
      const store = KVStore()
      store.set('object', 'key', new Set([123, 456]))

      const [result] = store.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.deepEqual([...result[1]], [123, 456])
    })

    await t.test('regexp', async (t) => {
      const store = KVStore()
      store.set('object', 'key', /([^\s]+)/g)

      const [result] = store.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1].toString(), '/([^\\s]+)/g')
    })

    await t.test('function', async (t) => {
      const store = KVStore()
      store.set('object', 'key', function echo (arg) { return arg })

      const [result] = store.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1].toString(), 'function echo (arg) { return arg }')
    })

    await t.test('url', async (t) => {
      const store = KVStore()
      store.set('object', 'key', new URL('https://example.com/'))

      const [result] = store.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1].toString(), 'https://example.com/')
    })
  })
})

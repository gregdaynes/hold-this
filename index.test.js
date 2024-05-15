import test from 'node:test'
import assert from 'node:assert/strict'
import Hold from './index.js'
import { setTimeout as sleep } from 'node:timers/promises'

test('Hold This', async (t) => {
  await t.test('with a topic, set and retrieve a key and value', async (t) => {
    const holder = Hold()
    holder.set('myTopic', 'key', 'value')

    const [result] = holder.get('myTopic', 'key')

    assert.equal(result[0], 'key')
    assert.equal(result[1], 'value')
  })

  await t.test('without a topic, set and retrieve a key and value', async (t) => {
    const holder = Hold()
    holder.set(undefined, 'key', 'value')

    const [result] = holder.get(undefined, 'key')

    assert.equal(result[0], 'key')
    assert.equal(result[1], 'value')
  })

  await t.test('key with separators creates separate columns', async (t) => {
    const holder = Hold()
    holder.set('multi', 'key:with:separators', 'value')

    const [result] = holder.get('multi', 'key:with:separators')

    assert.equal(result[0], 'key:with:separators')
    assert.equal(result[1], 'value')
  })

  await t.test('can fetch with wildcards', async (t) => {
    const holder = Hold()
    holder.set('wild', 'key:abc:separators', 'value')
    holder.set('wild', 'key:def:separators', 'value')
    holder.set('wild', 'key:abc:others', 'value')

    await t.test('key with single entry', async (t) => {
      const results = holder.get('wild', '*:abc:separators')

      assert.equal(results.length, 1)
      assert.equal(results[0][0], 'key:abc:separators')
    })

    await t.test('key with multiple entries', async (t) => {
      const results = holder.get('wild', 'key:*:separators')

      assert.equal(results.length, 2)
      assert.equal(results[0][0], 'key:abc:separators')
      assert.equal(results[1][0], 'key:def:separators')
    })

    await t.test('key with multiple entries', async (t) => {
      const results = holder.get('wild', 'key:*:*')

      assert.equal(results.length, 3)
      assert.equal(results[0][0], 'key:abc:others')
      assert.equal(results[1][0], 'key:abc:separators')
      assert.equal(results[2][0], 'key:def:separators')
    })

    await t.test('all keys', async (t) => {
      const results = holder.get('wild', '*')

      assert.equal(results.length, 3)
      assert.equal(results[2][0], 'key:abc:others')
      assert.equal(results[0][0], 'key:abc:separators')
      assert.equal(results[1][0], 'key:def:separators')
    })
  })

  await t.test('binding predefined topics', async (t) => {
    await t.test('binding topic, set and retrieve a key and value', async (t) => {
      const holder = Hold().bind('bound')
      holder.set('key', 'value')
      const results = holder.get('key')

      assert.equal(results[0][0], 'key')
      assert.equal(results[0][1], 'value')
    })

    await t.test('binding topic does not affect other topics', async (t) => {
      const holder = Hold()
      const bound = holder.bind('bound')

      holder.set('not_bound', 'key', 'value')
      bound.set('boundKey', 'boundValue')
      const results = holder.get('not_bound', 'key')
      const boundResults = bound.get('boundKey')

      assert.equal(results[0][0], 'key')
      assert.equal(results[0][1], 'value')
      assert.equal(boundResults[0][0], 'boundKey')
      assert.equal(boundResults[0][1], 'boundValue')
    })
  })

  await t.test('serialization of non-string values', async (t) => {
    await t.test('object', async (t) => {
      const holder = Hold()
      holder.set('object', 'key', { value: 'value' }, { isJSON: true })

      const [result] = holder.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1].value, 'value')
    })

    await t.test('number', async (t) => {
      const holder = Hold()
      holder.set('object', 'key', 123456)

      const [result] = holder.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1], 123456)
    })

    await t.test('number', async (t) => {
      const holder = Hold()
      holder.set('object', 'key', 123456)

      const [result] = holder.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1], 123456)
    })

    await t.test('array', async (t) => {
      const holder = Hold()
      holder.set('object', 'key', [1, 2, 3])

      const [result] = holder.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.deepEqual(result[1], [1, 2, 3])
    })

    await t.test('boolean', async (t) => {
      const holder = Hold()
      holder.set('object', 'key', true)

      const [result] = holder.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1], true)
    })

    await t.test('null', async (t) => {
      const holder = Hold()
      holder.set('object', 'key', null)

      const [result] = holder.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1], null)
    })

    await t.test('undefined', async (t) => {
      const holder = Hold()
      holder.set('object', 'key', undefined)

      const [result] = holder.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1], undefined)
    })

    await t.test('bigint', async (t) => {
      const holder = Hold()
      holder.set('object', 'key', BigInt(10))

      const [result] = holder.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1], BigInt(10))
    })

    await t.test('infinity', async (t) => {
      const holder = Hold()
      holder.set('object', 'key', Infinity)

      const [result] = holder.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1], Infinity)
    })

    await t.test('date', async (t) => {
      const holder = Hold()
      holder.set('object', 'key', new Date('Thu, 28 Apr 2016 22:02:17 GMT'))

      const [result] = holder.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1].toISOString(), '2016-04-28T22:02:17.000Z')
    })

    await t.test('map', async (t) => {
      const holder = Hold()
      holder.set('object', 'key', new Map([['hello', 'world']]))

      const [result] = holder.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1].get('hello'), 'world')
    })

    await t.test('set', async (t) => {
      const holder = Hold()
      holder.set('object', 'key', new Set([123, 456]))

      const [result] = holder.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.deepEqual([...result[1]], [123, 456])
    })

    await t.test('regexp', async (t) => {
      const holder = Hold()
      holder.set('object', 'key', /([^\s]+)/g)

      const [result] = holder.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1].toString(), '/([^\\s]+)/g')
    })

    await t.test('function', async (t) => {
      const holder = Hold()
      holder.set('object', 'key', function echo (arg) { return arg })

      const [result] = holder.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1].toString(), 'function echo (arg) { return arg }')
    })

    await t.test('url', async (t) => {
      const holder = Hold()
      holder.set('object', 'key', new URL('https://example.com/'))

      const [result] = holder.get('object', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1].toString(), 'https://example.com/')
    })
  })

  await t.test('ttl records', async (t) => {
    await t.test('returns the value of a non-expired record', async (t) => {
      const holder = Hold()
      holder.set('ttl', 'key', 'value', { ttl: 100 })

      const [result] = holder.get('ttl', 'key')
      assert.equal(result[0], 'key')
      assert.equal(result[1], 'value')
    })

    await t.test('does not return expired entries', async (t) => {
      await t.test('short ttl', async (t) => {
        const holder = Hold()
        holder.set('ttl', 'key', 'value', { ttl: 5 })

        // artificial delay
        await sleep(5)

        const [result] = holder.get('ttl', 'key')
        assert.equal(result, undefined)
      })

      await t.test('zero ttl', async (t) => {
        const holder = Hold()
        holder.set('ttl', 'other', 'value', { ttl: 0 })

        const [result] = holder.get('ttl', 'other')
        assert.equal(result, undefined)
      })
    })

    await t.test('clean expired ttl records', async (t) => {
      const holder = Hold({
        exposeConnection: true
      })
      holder.set('other', 'key', 'value', { ttl: 0 })
      holder.set('ttl', 'key', 'value', { ttl: 0 })
      await sleep(0)

      holder.clean()
      const afterCleanTTL = holder.connection.prepare('SELECT * FROM ttl').all()
      const afterCleanOther = holder.connection.prepare('SELECT * FROM other').all()

      const [result] = holder.get('ttl', 'key')

      assert.equal(result, undefined)
      assert.equal(afterCleanTTL.length, 0)
      assert.equal(afterCleanOther.length, 0)
    })

    await t.test('clean expired ttl records for a topic', async (t) => {
      const holder = Hold({
        exposeConnection: true
      })
      holder.set('other', 'key', 'value', { ttl: 0 })
      holder.set('ttl', 'key', 'value', { ttl: 0 })
      await sleep(5)

      holder.clean('ttl')

      const afterClean = holder.connection.prepare('SELECT * FROM ttl').all()
      const afterCleanOther = holder.connection.prepare('SELECT * FROM other').all()

      const [result] = holder.get('ttl', 'key')
      assert.equal(result, undefined)
      assert.equal(afterClean.length, 0)
      assert.equal(afterCleanOther.length, 1)
    })
  })

  await t.test('bulk insert', async (t) => {
    const holder = Hold({ exposeConnection: true })
    holder.init('bulk', 'key', 'value')

    const entries = Array.from(Array(10)).map((_, i) => holder.prepare('bulk', `key${i}`, `value${i}`))
    holder.setBulk('bulk', 'key', entries)

    const results = holder.connection.prepare('SELECT * FROM bulk').all()
    assert.equal(results.length, 10)
  })

  await t.test('turbo mode', async (t) => {
    await t.test('turbo mode does not interfere when not enabled', async (t) => {
      const holder = Hold()
      holder.set('turbo', 'key', 'value')

      const [result] = holder.get('turbo', 'key')

      assert.equal(result[0], 'key')
      assert.equal(result[1], 'value')
    })

    await t.test('turbo mode enabled', async (t) => {
      const holder = Hold({ turbo: true })
      holder.set('turbo', 'key', 'value')

      const [result] = holder.get('turbo', 'key')

      assert.equal(result[0], 'key')
      assert.equal(result[1], 'value')
    })
  })
  })
})

import test from 'node:test'
import assert from 'node:assert/strict'
import lib from './index.js'

test('lib', async (t) => {
  await t.test('with a topic, set and retrieve a key and value', async (t) => {
    lib.set('myTopic', 'key', 'value')

    const [result] = lib.get('myTopic', 'key')

    assert.equal(result[0], 'key')
    assert.equal(result[1], 'value')
  })

  await t.test('without a topic, set and retrieve a key and value', async (t) => {
    lib.set(undefined, 'key', 'value')

    const [result] = lib.get(undefined, 'key')

    assert.equal(result[0], 'key')
    assert.equal(result[1], 'value')
  })

  await t.test('key with separators creates separate columns', async (t) => {
    lib.set('multi', 'key:with:separators', 'value')

    const [result] = lib.get('multi', 'key:with:separators')

    assert.equal(result[0], 'key:with:separators')
    assert.equal(result[1], 'value')
  })

  await t.test('can fetch with wildcards', async (t) => {
    lib.set('wild', 'key:abc:separators', 'value')
    lib.set('wild', 'key:def:separators', 'value')
    lib.set('wild', 'key:abc:others', 'value')

    await t.test('key with single entry', async (t) => {
      const results = lib.get('wild', '*:abc:separators')

      assert.equal(results.length, 1)
      assert.equal(results[0][0], 'key:abc:separators')
    })

    await t.test('key with multiple entries', async (t) => {
      const results = lib.get('wild', 'key:*:separators')

      assert.equal(results.length, 2)
      assert.equal(results[0][0], 'key:abc:separators')
      assert.equal(results[1][0], 'key:def:separators')
    })

    await t.test('key with multiple entries', async (t) => {
      const results = lib.get('wild', 'key:*:*')

      assert.equal(results.length, 3)
      assert.equal(results[0][0], 'key:abc:others')
      assert.equal(results[1][0], 'key:abc:separators')
      assert.equal(results[2][0], 'key:def:separators')
    })

    await t.test('all keys', async (t) => {
      const results = lib.get('wild', '*')

      assert.equal(results.length, 3)
      assert.equal(results[2][0], 'key:abc:others')
      assert.equal(results[0][0], 'key:abc:separators')
      assert.equal(results[1][0], 'key:def:separators')
    })
  })
})

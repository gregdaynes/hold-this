import { unlinkSync } from 'node:fs'
import { Bench } from 'tinybench'
import Hold from './index.js'

const warmupIterations = 1000
const bench = new Bench()

let memoryHolder; let memoryIdx = 0
let memorySerialJSONHolder; let memorySerialJSONIdx = 0
let memorySerialJSONFastHolder; let memorySerialJSONFastIdx = 0
let memoryComplexKeyHolder; let memoryComplexKeyIdx = 0
let diskHolder; let diskIdx = 0
let diskWALHolder; let diskWALIdx = 0

bench
  .add('disk', () => {
    diskHolder.set('disk', `key${diskIdx}`, 'value')
    diskIdx++
  }, {
    beforeAll () {
      diskHolder = Hold({ location: './bench.db', enableWAL: false, exposeConnection: true })

      for (let i = 0; i < warmupIterations; i++) {
        diskHolder.set('disk', `key${i}`, 'value')
      }
    },
    afterAll () {
      diskHolder.connection.dispose()
      diskHolder = null
      unlinkSync('./bench.db')
    }
  })
  .add('diskWAL', () => {
    diskWALHolder.set('diskWAL', `key${diskWALIdx}`, 'value')
    diskWALIdx++
  }, {
    beforeAll () {
      diskWALHolder = Hold({ location: './bench-wal.db', exposeConnection: true })

      for (let i = 0; i < warmupIterations; i++) {
        diskWALHolder.set('diskWAL', `key${i}`, 'value')
      }
    },
    afterAll () {
      diskWALHolder.connection.dispose()
      diskWALHolder = null
      unlinkSync('./bench-wal.db')
    }
  })
  .add('memory', () => {
    memoryHolder.set('memory', `key${memoryIdx}`, 'value')
    memoryIdx++
  }, {
    beforeAll () {
      memoryHolder = Hold({ exposeConnection: true })

      for (let i = 0; i < warmupIterations; i++) {
        memoryHolder.set('memory', `key${i}`, 'value')
      }
    },
    afterAll () {
      memoryHolder.connection.dispose()
      memoryHolder = null
    }
  })
  .add('memory:serialization:json', () => {
    memorySerialJSONHolder.set('memorySerialJSON', `key${memorySerialJSONIdx}`, { str: 'value', num: 123, fn: () => 'xyz' }, { isJSON: true })
    memorySerialJSONIdx++
  }, {
    beforeAll () {
      memorySerialJSONHolder = Hold({ exposeConnection: true })

      for (let i = 0; i < warmupIterations; i++) {
        memorySerialJSONHolder.set('memorySerialJSON', `key${i}`, { str: 'value', num: 123, fn: () => 'xyz' }, { isJSON: true })
      }
    },
    afterAll () {
      memorySerialJSONHolder.connection.dispose()
      memorySerialJSONHolder = null
    }
  })
  .add('memory:serialization:json:fast', () => {
    memorySerialJSONFastHolder.set('memorySerialJSONFast', `key${memorySerialJSONFastIdx}`, { value: 'value', num: 123 }, { isJSON: true })
    memorySerialJSONFastIdx++
  }, {
    beforeAll () {
      memorySerialJSONFastHolder = Hold({ exposeConnection: true })

      for (let i = 0; i < warmupIterations; i++) {
        memorySerialJSONFastHolder.set('memorySerialJSONFast', `key${i}`, { value: 'value', num: 123 }, { isJSON: true })
      }
    },
    afterAll () {
      memorySerialJSONFastHolder.connection.dispose()
      memorySerialJSONFastHolder = null
    }
  })
  .add('memory:complex-key', () => {
    memoryComplexKeyHolder.set('memoryComplexKey', `key:${memoryComplexKeyIdx}:${memoryComplexKeyIdx}`, 'value')
    memoryComplexKeyIdx++
  }, {
    beforeAll () {
      memoryComplexKeyHolder = Hold({ exposeConnection: true })

      for (let i = 0; i < warmupIterations; i++) {
        memoryComplexKeyHolder.set('memoryComplexKey', `key:${i}:${i}`, 'value')
      }
    },
    afterAll () {
      memoryComplexKeyHolder.connection.dispose()
      memoryComplexKeyHolder = null
    }
  })

await bench.run()

console.table(bench.table())

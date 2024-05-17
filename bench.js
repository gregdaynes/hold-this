import { unlinkSync } from 'node:fs'
import { Bench } from 'tinybench'
import Hold from './index.js'
import benchTurbo from './bench-turbo.js'

const warmupIterations = 1000
const bench = new Bench()

let memoryHolder; let memoryIdx = 0
let memorySerialJSONHolder; let memorySerialJSONIdx = 0
let memorySerialJSONFastHolder; let memorySerialJSONFastIdx = 0
let memoryComplexKeyHolder; let memoryComplexKeyIdx = 0
let diskHolder; let diskIdx = 0
let diskWALHolder; let diskWALIdx = 0
let bufferHolder; let bufferIdx = 0
let bufferedTurboHolder; let bufferedTurboIdx = 0

bench
  .add('SET: disk', () => {
    diskHolder.set('disk', `key${diskIdx}`, 'value')
    diskIdx++
  }, {
    beforeAll () {
      diskHolder = Hold({ location: './bench.sqlite', enableWAL: false, exposeConnection: true })

      for (let i = 0; i < warmupIterations; i++) {
        diskHolder.set('disk', `key${i}`, 'value')
      }
    },
    afterAll () {
      unlinkSync('./bench.sqlite')
    }
  })
  .add('SET: diskWAL', () => {
    diskWALHolder.set('diskWAL', `key${diskWALIdx}`, 'value')
    diskWALIdx++
  }, {
    beforeAll () {
      diskWALHolder = Hold({ location: './bench-wal.sqlite', exposeConnection: true })

      for (let i = 0; i < warmupIterations; i++) {
        diskWALHolder.set('diskWAL', `key${i}`, 'value')
      }
    },
    afterAll () {
      unlinkSync('./bench-wal.sqlite')
    }
  })
  .add('SET: memory', () => {
    memoryHolder.set('memory', `key${memoryIdx}`, 'value')
    memoryIdx++
  }, {
    beforeAll () {
      memoryHolder = Hold({ exposeConnection: true })

      for (let i = 0; i < warmupIterations; i++) {
        memoryHolder.set('memory', `key${i}`, 'value')
      }
    }
  })
  .add('SET: memory:serialization:json', () => {
    memorySerialJSONHolder.set('memorySerialJSON', `key${memorySerialJSONIdx}`, { str: 'value', num: 123, fn: () => 'xyz' }, { isJSON: true })
    memorySerialJSONIdx++
  }, {
    beforeAll () {
      memorySerialJSONHolder = Hold({ exposeConnection: true })

      for (let i = 0; i < warmupIterations; i++) {
        memorySerialJSONHolder.set('memorySerialJSON', `key${i}`, { str: 'value', num: 123, fn: () => 'xyz' }, { isJSON: true })
      }
    }
  })
  .add('SET: memory:serialization:json:fast', () => {
    memorySerialJSONFastHolder.set('memorySerialJSONFast', `key${memorySerialJSONFastIdx}`, { value: 'value', num: 123 }, { isJSON: true })
    memorySerialJSONFastIdx++
  }, {
    beforeAll () {
      memorySerialJSONFastHolder = Hold({ exposeConnection: true })

      for (let i = 0; i < warmupIterations; i++) {
        memorySerialJSONFastHolder.set('memorySerialJSONFast', `key${i}`, { value: 'value', num: 123 }, { isJSON: true })
      }
    }
  })
  .add('SET: memory:complex-key', () => {
    memoryComplexKeyHolder.set('memoryComplexKey', `key:${memoryComplexKeyIdx}:${memoryComplexKeyIdx}`, 'value')
    memoryComplexKeyIdx++
  }, {
    beforeAll () {
      memoryComplexKeyHolder = Hold({ exposeConnection: true })

      for (let i = 0; i < warmupIterations; i++) {
        memoryComplexKeyHolder.set('memoryComplexKey', `key:${i}:${i}`, 'value')
      }
    }
  })
  .add('SET: buffered', () => {
    bufferHolder.setBuffered('buffer', `key${bufferIdx}`, Buffer.from('value'))
    bufferIdx++
  }, {
    beforeAll () {
      bufferHolder = Hold({ exposeConnection: true })

      for (let i = 0; i < warmupIterations; i++) {
        bufferHolder.set('buffer', `key${i}`, 'value')
      }
    }
  })
  .add('SET: buffered + turbo', () => {
    bufferedTurboHolder.setBuffered('buffer_turbo', `key${bufferIdx}`, 'value')
    bufferedTurboIdx++
  }, {
    beforeAll () {
      bufferedTurboHolder = Hold({ exposeConnection: true, turbo: true })

      for (let i = 0; i < warmupIterations; i++) {
        bufferedTurboHolder.set('buffer', `key${i}`, 'value')
      }
    }
  })
  .add('GET: disk', () => {
    diskHolder.get('disk', 'key5')
  })
  .add('GET: diskWAL', () => {
    diskWALHolder.set('diskWAL', 'key5', 'value')
  })
  .add('GET: memory', () => {
    memoryHolder.get('memory', 'key5')
  })
  .add('GET: memory:serialization:json', () => {
    memorySerialJSONHolder.get('memorySerialJSON', 'key5')
  })
  .add('GET: memory:serialization:json:fast', () => {
    memorySerialJSONFastHolder.get('memorySerialJSONFast', 'key5')
  })
  .add('GET: memory:complex-key', () => {
    memoryComplexKeyHolder.get('memoryComplexKey', 'key:5:5')
  })

console.info('Running Bechnmarks')
await bench.run()
console.table(bench.table())

console.info('Running Max Thoroughput Benchmark')
console.table(benchTurbo())

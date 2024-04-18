import { unlinkSync } from 'node:fs'
import { Bench } from 'tinybench'
import Hold from './index.js'

const warmupIterations = 1000
const bench = new Bench()

let memoryHolder; let memoryIdx = 0
let diskHolder; let diskIdx = 0
let diskWALHolder; let diskWALIdx = 0

bench
  .add('memory', () => {
    memoryHolder.set('memory', `key${memoryIdx}`, 'value')
    memoryIdx++
  }, {
    beforeAll () {
      memoryHolder = Hold({ exposeConnection: true })
      memoryHolder.set('memory', 'key', 'value')

      for (let i = 0; i < warmupIterations; i++) {
        memoryHolder.set('memory', `key${i}`, 'value')
      }
    },
    afterAll () {
      memoryHolder.connection.dispose()
      memoryHolder = null
    }
  })
  .add('disk', () => {
    diskHolder.set('disk', `key${diskIdx}`, 'value')
    diskIdx++
  }, {
    beforeAll () {
      diskHolder = Hold({ location: './bench.db', enableWAL: false, exposeConnection: true })
      diskHolder.set('memory', 'key', 'value')

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
      diskWALHolder.set('memory', 'key', 'value')

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

await bench.run()

console.table(bench.table())

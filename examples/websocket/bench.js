import { Bench } from 'tinybench'
import { Client, Server } from './index.js'
import { randomUUID } from 'node:crypto'

// disable console.info when running benchmarks
console.info = function () {}

const bench = new Bench()

const server = Server()
const client = await Client()

server.holder.set('socket', 'foo', 'bar')

bench
  .add('GET through WebSocket', async () => {
    const id = randomUUID()

    await new Promise((resolve) => {
      client.messages.once(`get:${id}`, resolve)
      client.send(JSON.stringify({ id, cmd: 'get', data: { topic: 'socket', key: 'foo' } }))
    })
  })
  .add('GET local connection', () => {
    server.holder.get('socket', 'foo')
  })

await bench.run()
console.table(bench.table())
client.close()
server.close()

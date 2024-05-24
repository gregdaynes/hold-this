import { stdout } from 'node:process'
import autocannon from 'autocannon'
import { Server } from './index.js'

const server = Server()

server.holder.set('http', 'foo', 'bar')

autocannon({
  url: 'http://localhost:3000',
  connections: 10,
  pipelining: 10,
  duration: 10,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    cmd: 'get', topic: 'http', key: 'test'
  })

}, (err, result) => {
  if (err) throw err

  stdout.write(autocannon.printResult(result))
  server.close()
})

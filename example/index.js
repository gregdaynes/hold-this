/* global WebSocket */
import { randomUUID } from 'node:crypto'
import EventEmitter from 'node:events'
import { WebSocketServer } from 'ws'
import Hold from 'hold-this'

/**
 * Creates a WebSocket server decorated with an instance of the data store
 *
 * The server is dependent on WebSocketServer provided by the ws package.
 *
 * @param {Object} options - server options
 * @param {number} options.port - port number to listen on
 * @returns {WebSocketServer}
 * @example
 * const server = Server()
 */
export function Server ({ port = 3000 } = {}) {
  const server = new WebSocketServer({ port })
  server.holder = Hold()

  server.on('connection', function connection (ws) {
    ws.on('error', console.error)

    ws.on('message', function message (payload) {
      const message = JSON.parse(payload)
      console.info('Server Rx', message)

      const { id, cmd, data: { topic, key, value, options } } = message
      const data = server.holder[cmd](topic, key, value, options)

      ws.send(JSON.stringify({ id, cmd, data }))
    })

    ws.send('connected')
  })

  return server
}

/**
 * Creates a WebSocket client that connects to the server.
 * The client is decorated with an EventEmitter to handle receiving response messages from the
 * server initialized by a previous request. This is done by listening to the `get:${id}` event.
 *
 * Client uses the WebSocket API provided by Node 22.0.0.
 * @param {Object} options - client options
 * @param {string} options.url - server url to connect to
 * @returns {Promise<WebSocket>}
 * @example
 * const client = await Client()
 * client.send(JSON.stringify({ id: '123', cmd: 'get', data: { topic: 'socket', key
 */
export function Client ({ name, url = 'ws://localhost:3000' } = {}) {
  const client = new WebSocket(url)
  client.messages = new EventEmitter()

  client.post = async function send (cmd, data) {
    const request = Promise.withResolvers()
    const id = randomUUID()
    client.send(JSON.stringify({ id, cmd, data }))
    client.messages.on(`${cmd}:${id}`, (data) => request.resolve(data))

    return request.promise
  }

  return new Promise(function (resolve, reject) {
    client.addEventListener('error', (err) => {
      console.error(err)

      // If error on connection, reject the promise to make the client unavailable
      return reject(err)
    })

    client.addEventListener('message', (message) => {
      // Handle connection message, resolving the promise when connected, enabling
      // the await Client() initialization api.
      if (message.data === 'connected') {
        console.info(`Client[${name}] connected`)
        return resolve(client)
      }

      const { id, cmd, data } = JSON.parse(message.data)
      console.info(`Client[${name}] Rx`, id, data)

      client.messages.emit(`${cmd}:${id}`, data)
    })
  })
}

// When this file is run directly from node (main module)
// setup a server and two clients, and run a test demonstrating
// the use of the Server and Client functions.
if (process.argv[1] === import.meta.filename) {
  const server = Server()
  const A = await Client({ name: 'A' })
  const B = await Client({ name: 'B' })

  await A.post('set', { topic: 'socket', key: 'a', value: 'a' })
  await B.post('set', { topic: 'socket', key: 'b', value: 'b' })

  await Promise.all([
    A.post('get', { topic: 'socket', key: 'a' }),
    B.post('get', { topic: 'socket', key: 'b' })
  ])
    .then(() => {
      A.close()
      B.close()
      server.close()
    })
}

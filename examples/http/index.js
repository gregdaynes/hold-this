import { createServer } from 'node:http'
import Hold from 'hold-this'

/**
 * Creates a HTTP server decorated with an instance of the data store
 *
 * @param {Object} options - server options
 * @param {number} options.port - port number to listen on
 * @returns {http.Server}
 * @example
 * const server = Server()
 */
export function Server ({ port = 3000 } = {}) {
  const server = createServer()
  server.holder = Hold()

  server.on('request', (req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' })
      res.end('Method Not Allowed\n')
      return false
    }

    if (req.headers['content-type'] !== 'application/json') {
      res.writeHead(415, { 'Content-Type': 'application/json' })
      res.end('Unsupported Media Type\n')
      return false
    }

    let body = ''
    req.on('data', (chunk) => { body += chunk })

    req.on('end', () => {
      const parsedBody = JSON.parse(body)

      const { cmd, topic, key, value, options } = parsedBody
      const data = server.holder[cmd](topic, key, value, options)

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(data))
    })
  })

  server.listen(port)

  return server
}

// When this file is run directly from node (main module)
// setup a server, and run a test demonstrating using fetch to set and
// get data from the server
if (process.argv[1] === import.meta.filename) {
  Server()

  // Write the record that we'll be fetching
  await fetch('http://localhost:3000', {
    headers: {
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({
      cmd: 'set', topic: 'http', key: 'test', value: 'test1'
    })
  })

  // Fetch the record previously set
  const response = await fetch('http://localhost:3000', {
    headers: {
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({
      cmd: 'get', topic: 'http', key: 'test'
    })
  }).then(response => response.json())

  console.log(response)
}

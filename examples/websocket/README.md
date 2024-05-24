Hold This Example: WebSocket
============================

This is an example application that runs Hold This behind a WebSocket server, and has multiple clients connect, write and read to the same instance.

>[!CAUTION]
>This is not a production ready example. Security, and failure modes must be considered, but are outside the scope of the example.

>[!NOTE]
>This example depends on the package `ws` to provide the WebSocket Server
>
>Requires Node 22.0.0
>- WebSocket Client
>- Promise.withResolvers
>- import.meta.filename

Getting Started
---------------

1. Install dependency

		npm install

2. Run Example

		npm start

3. Run Benchmark

		npm run test:bench

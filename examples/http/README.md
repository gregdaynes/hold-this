Hold This Example: HTTP
=======================

This is an example application that runs Hold This behind an HTTP server.

>[!CAUTION]
>This is not a production ready example. Security, and failure modes must be considered, but are outside the scope of the example.

>[!NOTE]
>This example depends on the package `autocannon` to benchmark the server.
>
>Requires Node 22.0.0
>- import.meta.filename

Getting Started
---------------

1. Install dependency

		npm install

2. Run Example

		npm start

3. Run Benchmark

		npm run test:bench

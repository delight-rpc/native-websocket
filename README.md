# @delight-rpc/websocket-browser
## Install
```sh
npm install --save @delight-rpc/websocket-browser
# or
yarn add @delight-rpc/websocket-browser
```

## API
### createClient
```ts
function createClient<IAPI extends object>(
  socket: WebSocket
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void]
```

### createServer
```ts
function createServer<IAPI extends object>(
  api: IAPI
, socket: WebSocket
): () => void
```

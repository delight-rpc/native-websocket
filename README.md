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
, parameterValidators?: DelightRPC.ParameterValidators<IAPI>
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void]
```

### createServer
```ts
function createServer<IAPI extends object>(
  api: DelightRPC.ImplementationOf<IAPI>
, socket: WebSocket
, parameterValidators?: DelightRPC.ParameterValidators<IAPI>
): () => void
```

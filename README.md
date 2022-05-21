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
, options?: {
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    expectedVersion?: `${number}.${number}.${number}`
    channel?: string
  }
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void]
```

### createBatchClient
```ts
function createBatchClient(
  socket: WebSocket
, options?: {
    expectedVersion?: `${number}.${number}.${number}`
    channel?: string
  }
): [client: DelightRPC.BatchClient, close: () => void]
```

### createServer
```ts
function createServer<IAPI extends object>(
  api: DelightRPC.ImplementationOf<IAPI>
, socket: WebSocket
, options?: {
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    version?: `${number}.${number}.${number}`
    channel?: string
    ownPropsOnly?: boolean
  }
): () => void
```

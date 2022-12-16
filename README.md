# @delight-rpc/native-websocket
## Install
```sh
npm install --save @delight-rpc/native-websocket
# or
yarn add @delight-rpc/native-websocket
```

## API
### createClient
```ts
function createClient<IAPI extends object>(
  socket: WebSocket
, options?: {
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    expectedVersion?: string
    channel?: string
    timeout?: number
  }
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void]
```

### createBatchClient
```ts
function createBatchClient(
  socket: WebSocket
, options?: {
    expectedVersion?: string
    channel?: string
    timeout?: number
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
    channel?: string | RegExp | AnyChannel
    ownPropsOnly?: boolean
  }
): () => void
```

import * as DelightRPC from 'delight-rpc'
import { getResult } from 'return-style'

export function createServer<IAPI extends object>(
  api: DelightRPC.ImplementationOf<IAPI>
, socket: WebSocket
, parameterValidators?: DelightRPC.ParameterValidators<IAPI>
, version?: `${number}.${number}.${number}`
): () => void {
  socket.addEventListener('message', handler)
  return () => socket.removeEventListener('message', handler)

  async function handler(event: MessageEvent): Promise<void> {
    const req = getResult(() => JSON.parse(event.data))
    if (DelightRPC.isRequest(req) || DelightRPC.isBatchRequest(req)) {
      const result = await DelightRPC.createResponse(
        api
      , req
      , parameterValidators
      , version
      )

      socket.send(JSON.stringify(result))
    }
  }
}

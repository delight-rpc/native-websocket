import * as DelightRPC from 'delight-rpc'
import { getResult } from 'return-style'
import { isntNull } from '@blackglory/prelude'

export function createServer<IAPI extends object>(
  api: DelightRPC.ImplementationOf<IAPI>
, socket: WebSocket
, { parameterValidators, version, channel, ownPropsOnly }: {
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    version?: `${number}.${number}.${number}`
    channel?: string | RegExp | typeof DelightRPC.AnyChannel
    ownPropsOnly?: boolean
  } = {}
): () => void {
  socket.addEventListener('message', handler)
  return () => socket.removeEventListener('message', handler)

  async function handler(event: MessageEvent): Promise<void> {
    const request = getResult(() => JSON.parse(event.data))
    if (DelightRPC.isRequest(request) || DelightRPC.isBatchRequest(request)) {
      const response = await DelightRPC.createResponse(
        api
      , request
      , {
          parameterValidators
        , version
        , channel
        , ownPropsOnly
        }
      )

      if (isntNull(response)) {
        socket.send(JSON.stringify(response))
      }
    }
  }
}

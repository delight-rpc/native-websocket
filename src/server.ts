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
  const idToController: Map<string, AbortController> = new Map()

  socket.addEventListener('message', handler)
  socket.addEventListener('close', () => {
    for (const controller of idToController.values()) {
      controller.abort()
    }

    idToController.clear()
  })

  return () => socket.removeEventListener('message', handler)

  async function handler(event: MessageEvent): Promise<void> {
    const payload = getResult(() => JSON.parse(event.data))
    if (DelightRPC.isRequest(payload) || DelightRPC.isBatchRequest(payload)) {
      const response = await DelightRPC.createResponse(
        api
      , payload
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
    } else if (DelightRPC.isAbort(payload)) {
      if (DelightRPC.matchChannel(payload, channel)) {
        idToController.get(payload.id)?.abort()
        idToController.delete(payload.id)
      }
    }
  }
}

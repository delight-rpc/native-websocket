import * as DelightRPC from 'delight-rpc'
import { getResult } from 'return-style'
import { isntNull } from '@blackglory/prelude'
import { AbortController } from 'extra-abort'
import { HashMap } from '@blackglory/structures'
import { SyncDestructor } from 'extra-defer'

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
  const destructor = new SyncDestructor()

  const channelIdToController: HashMap<
    {
      channel?: string
    , id: string
    }
  , AbortController
  > = new HashMap(({ channel, id }) => JSON.stringify([channel, id]))
  destructor.defer(abortAllPendings)

  socket.addEventListener('message', receive)
  destructor.defer(() => socket.removeEventListener('message', receive))

  socket.addEventListener('close', close)
  destructor.defer(() => socket.removeEventListener('close', close))

  return close

  async function receive(event: MessageEvent): Promise<void> {
    const message = getResult(() => JSON.parse(event.data))
    if (DelightRPC.isRequest(message) || DelightRPC.isBatchRequest(message)) {
      const destructor = new SyncDestructor()

      const controller = new AbortController()
      channelIdToController.set(message, controller)
      destructor.defer(() => channelIdToController.delete(message))

      try {
        const response = await DelightRPC.createResponse(
          api
        , message
        , {
            parameterValidators
          , version
          , channel
          , ownPropsOnly
          , signal: controller.signal
          }
        )

        if (isntNull(response)) {
          socket.send(JSON.stringify(response))
        }
      } finally {
        destructor.execute()
      }
    } else if (DelightRPC.isAbort(message)) {
      if (DelightRPC.matchChannel(message, channel)) {
        channelIdToController.get(message)?.abort()
        channelIdToController.delete(message)
      }
    }
  }

  function close(): void {
    destructor.execute()
  }

  function abortAllPendings(): void {
    for (const controller of channelIdToController.values()) {
      controller.abort()
    }

    channelIdToController.clear()
  }
}

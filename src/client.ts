import * as DelightRPC from 'delight-rpc'
import { Deferred } from 'extra-promise'
import { CustomError } from '@blackglory/errors'
import { getResult } from 'return-style'

export function createClient<IAPI extends object>(
  socket: WebSocket
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void] {
  const pendings: { [id: string]: Deferred<DelightRPC.IResponse<any>> } = {}

  socket.addEventListener('message', handler)

  const client = DelightRPC.createClient<IAPI>(
    async function send(request) {
      const res = new Deferred<DelightRPC.IResponse<any>>()
      pendings[request.id] = res
      try {
        socket.send(JSON.stringify(request))
        return await res
      } finally {
        delete pendings[request.id]
      }
    }
  )

  return [client, close]

  function close(): void {
    socket.removeEventListener('message', handler as any)
    for (const [key, deferred] of Object.entries(pendings)) {
      deferred.reject(new ClientClosed())
      delete pendings[key]
    }
  }

  function handler(event: MessageEvent) {
    const res = getResult(() => JSON.parse(event.data))
    if (DelightRPC.isResult(res)) {
      pendings[res.id].resolve(res)
    } else if (DelightRPC.isError(res)) {
      pendings[res.id].reject(res)
    }
  }
}

export class ClientClosed extends CustomError {}

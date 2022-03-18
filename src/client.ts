import * as DelightRPC from 'delight-rpc'
import { Deferred } from 'extra-promise'
import { CustomError } from '@blackglory/errors'
import { getResult } from 'return-style'

export function createClient<IAPI extends object>(
  socket: WebSocket
, parameterValidators?: DelightRPC.ParameterValidators<IAPI>
, expectedVersion?: `${number}.${number}.${number}`
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void] {
  const pendings: { [id: string]: Deferred<DelightRPC.IResponse<unknown>> } = {}

  socket.addEventListener('message', handler)

  const client = DelightRPC.createClient<IAPI>(
    async function send(request) {
      const res = new Deferred<DelightRPC.IResponse<unknown>>()
      pendings[request.id] = res
      try {
        socket.send(JSON.stringify(request))
        return await res
      } finally {
        delete pendings[request.id]
      }
    }
  , parameterValidators
  , expectedVersion
  )

  return [client, close]

  function close(): void {
    socket.removeEventListener('message', handler as any)
    for (const [key, deferred] of Object.entries(pendings)) {
      deferred.reject(new ClientClosed())
      delete pendings[key]
    }
  }

  function handler(event: MessageEvent): void {
    const res = getResult(() => JSON.parse(event.data))
    if (DelightRPC.isResult(res) || DelightRPC.isError(res)) {
      pendings[res.id].resolve(res)
    }
  }
}

export function createBatchClient(
  socket: WebSocket
, expectedVersion?: `${number}.${number}.${number}`
): [client: DelightRPC.BatchClient, close: () => void] {
  const pendings: {
    [id: string]: Deferred<
    | DelightRPC.IError
    | DelightRPC.IBatchResponse<unknown>
    >
  } = {}

  socket.addEventListener('message', handler)

  const client = new DelightRPC.BatchClient(
    async function send(request) {
      const res = new Deferred<
      | DelightRPC.IError
      | DelightRPC.IBatchResponse<unknown>
      >()
      pendings[request.id] = res
      try {
        socket.send(JSON.stringify(request))
        return await res
      } finally {
        delete pendings[request.id]
      }
    }
  , expectedVersion
  )

  return [client, close]

  function close(): void {
    socket.removeEventListener('message', handler as any)
    for (const [key, deferred] of Object.entries(pendings)) {
      deferred.reject(new ClientClosed())
      delete pendings[key]
    }
  }

  function handler(event: MessageEvent): void {
    const res = getResult(() => JSON.parse(event.data))
    if (DelightRPC.isError(res) || DelightRPC.isBatchResponse(res)) {
      pendings[res.id].resolve(res)
    }
  }
}

export class ClientClosed extends CustomError {}

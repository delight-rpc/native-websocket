import * as DelightRPC from 'delight-rpc'
import { Deferred } from 'extra-promise'
import { CustomError } from '@blackglory/errors'
import { getResult } from 'return-style'
import { IResponse, IError, IBatchResponse } from '@delight-rpc/protocol'
import { withAbortSignal, timeoutSignal } from 'extra-abort'
import { isUndefined } from '@blackglory/prelude'

export function createClient<IAPI extends object>(
  socket: WebSocket
, { parameterValidators, expectedVersion, channel, timeout }: {
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    expectedVersion?: string
    channel?: string
    timeout?: number
  } = {}
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void] {
  const pendings: Record<
    string
  , | Deferred<IResponse<unknown>>
    | undefined
  > = {}

  socket.addEventListener('message', handler)

  const client = DelightRPC.createClient<IAPI>(
    async function send(request) {
      const res = new Deferred<IResponse<unknown>>()
      pendings[request.id] = res
      try {
        socket.send(JSON.stringify(request))
        if (isUndefined(timeout)) {
          return await res
        } else {
          return await withAbortSignal(timeoutSignal(timeout), () => res)
        }
      } finally {
        delete pendings[request.id]
      }
    }
  , {
      parameterValidators
    , expectedVersion
    , channel
    }
  )

  return [client, close]

  function close(): void {
    socket.removeEventListener('message', handler as any)
    for (const [key, deferred] of Object.entries(pendings)) {
      deferred!.reject(new ClientClosed())
      delete pendings[key]
    }
  }

  function handler(event: MessageEvent): void {
    const res = getResult(() => JSON.parse(event.data))
    if (DelightRPC.isResult(res) || DelightRPC.isError(res)) {
      pendings[res.id]?.resolve(res)
    }
  }
}

export function createBatchClient(
  socket: WebSocket
, { expectedVersion, channel, timeout }: {
    expectedVersion?: string
    channel?: string
    timeout?: number
  } = {}
): [client: DelightRPC.BatchClient, close: () => void] {
  const pendings: Record<
    string
  , | Deferred<IError | IBatchResponse<unknown>>
    | undefined
  > = {}

  socket.addEventListener('message', handler)

  const client = new DelightRPC.BatchClient(
    async function send(request) {
      const res = new Deferred<
      | IError
      | IBatchResponse<unknown>
      >()
      pendings[request.id] = res
      try {
        socket.send(JSON.stringify(request))
        if (isUndefined(timeout)) {
          return await res
        } else {
          return await withAbortSignal(timeoutSignal(timeout), () => res)
        }
      } finally {
        delete pendings[request.id]
      }
    }
  , {
      expectedVersion
    , channel
    }
  )

  return [client, close]

  function close(): void {
    socket.removeEventListener('message', handler as any)
    for (const [key, deferred] of Object.entries(pendings)) {
      deferred!.reject(new ClientClosed())
      delete pendings[key]
    }
  }

  function handler(event: MessageEvent): void {
    const res = getResult(() => JSON.parse(event.data))
    if (DelightRPC.isError(res) || DelightRPC.isBatchResponse(res)) {
      pendings[res.id]?.resolve(res)
    }
  }
}

export class ClientClosed extends CustomError {}

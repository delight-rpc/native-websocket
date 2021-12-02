import { Server, Client } from 'mock-socket'
import { waitForEventTarget } from '@blackglory/wait-for'
import { isString } from '@blackglory/types'
import { createServer } from '@src/server'
import { createClient } from '@src/client'
import * as DelightRPC from 'delight-rpc'
import { Deferred } from 'extra-promise'
import { getResult } from 'return-style'

interface IAPI {
  eval(code: string): Promise<unknown>
}

const SERVER_URL = 'ws://localhost:8080'

let mockServer: Server
beforeEach(() => {
  mockServer = new Server(SERVER_URL)
  mockServer.on('connection', socket => {
    const client = createTestClient<IAPI>(socket)

    // mock-socket is buggy, `socket.addEventListener` cannot work!
    socket.on('message', async data => {
      if (isString(data)) {
        const req = JSON.parse(data)
        if (DelightRPC.isRequest(req)) {
          const res = await DelightRPC.createResponse<IAPI>({
            async eval(code) {
              const result = await eval(code)
              return result
            }
          }, req)
          socket.send(JSON.stringify(res))
        }
      }
    })
  })
})
afterEach(() => {
  mockServer.close()
})

describe('createServer', () => {
  it('echo', async () => {
    const api = {
      echo(message: string): string {
        return message
      }
    }
    const wsClient = new WebSocket(SERVER_URL)
    await waitForEventTarget(wsClient, 'open')

    const cancelServer = createServer(api, wsClient)
    const [client, close] = createClient<IAPI>(wsClient)
    try {
      const result = await client.eval('client.echo("hello")')
      expect(result).toEqual('hello')
    } finally {
      cancelServer()
    }
  })
})

function createTestClient<IAPI extends object>(
  socket: Client
): DelightRPC.ClientProxy<IAPI> {
  const pendings: { [id: string]: Deferred<DelightRPC.IResponse<any>> } = {}

  // mock-socket is buggy, `socket.addEventListener` cannot work!
  socket.on('message', handler)

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

  return client

  function handler(data: string | Blob | ArrayBuffer | ArrayBufferView) {
    if (isString(data)) {
      const res = getResult(() => JSON.parse(data))
      if (DelightRPC.isResult(res)) {
        pendings[res.id].resolve(res)
      } else if (DelightRPC.isError(res)) {
        pendings[res.id].reject(res)
      }
    }
  }
}

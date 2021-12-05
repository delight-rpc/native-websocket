import { Server, Client } from 'mock-socket'
import { waitForEventTarget } from '@blackglory/wait-for'
import { isString } from '@blackglory/types'
import { createServer } from '@src/server'
import { createClient } from '@src/client'
import * as DelightRPC from 'delight-rpc'
import { Deferred } from 'extra-promise'
import { getResult, getErrorPromise } from 'return-style'

interface IAPI {
  eval(code: string): Promise<unknown>
}

const SERVER_URL = 'ws://localhost:8080'

const api = {
  echo(message: string): string {
    return message
  }
, error(message: string): never {
    throw new Error(message)
  }
}

let mockServer: Server
beforeEach(() => {
  mockServer = new Server(SERVER_URL)
  mockServer.on('connection', socket => {
    const client = createTestClient(socket)

    // mock-socket is buggy, `socket.addEventListener` cannot work!
    socket.on('message', async data => {
      if (isString(data)) {
        const req = JSON.parse(data)
        if (DelightRPC.isRequest(req)) {
          const res = await DelightRPC.createResponse<IAPI>({
            async eval(code) {
              return await eval(code)
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
  test('echo', async () => {
    const wsClient = new WebSocket(SERVER_URL)
    await waitForEventTarget(wsClient, 'open')

    const cancelServer = createServer(api, wsClient)
    const [client, close] = createClient<IAPI>(wsClient)
    try {
      const result = await client.eval('client.echo("hello")')
      expect(result).toBe('hello')
    } finally {
      cancelServer()
    }
  })

  test('error', async () => {
    const wsClient = new WebSocket(SERVER_URL)
    await waitForEventTarget(wsClient, 'open')

    const cancelServer = createServer(api, wsClient)
    const [client, close] = createClient<IAPI>(wsClient)
    try {
      const err = await getErrorPromise(client.eval('client.error("hello")'))
      expect(err).toBeInstanceOf(Error)
      expect(err!.message).toMatch('Error: hello')
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
      if (DelightRPC.isResult(res) || DelightRPC.isError(res)) {
        pendings[res.id].resolve(res)
      }
    }
  }
}

import { Server } from 'mock-socket'
import { createClient } from '@src/client'
import { waitForEventTarget } from '@blackglory/wait-for'
import * as DelightRPC from 'delight-rpc'
import { isString } from '@blackglory/types'
import { getResult, getErrorPromise } from 'return-style'

interface IAPI {
  echo(message: string): string
  error(message: string): never
}

const SERVER_URL = 'ws://localhost:8080'

let mockServer: Server
beforeEach(() => {
  mockServer = new Server(SERVER_URL)
  mockServer.on('connection', socket => {
    // mock-socket is buggy, `socket.addEventListener` cannot work!
    socket.on('message', async data => {
      if (isString(data)) {
        const req = getResult(() => JSON.parse(data))
        if (DelightRPC.isRequest(req)) {
          const res = await DelightRPC.createResponse<IAPI>({
            echo(message) {
              return message
            }
          , error(message) {
              throw new Error(message)
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

describe('createClient', () => {
  test('echo', async () => {
    const wsClient = new WebSocket(SERVER_URL)
    await waitForEventTarget(wsClient, 'open')

    const [client] = createClient<IAPI>(wsClient)
    const result = await client.echo('hello')

    expect(result).toBe('hello')
  })

  test('error', async () => {
    const wsClient = new WebSocket(SERVER_URL)
    await waitForEventTarget(wsClient, 'open')

    const [client] = createClient<IAPI>(wsClient)
    const err = await getErrorPromise(client.error('hello'))

    expect(err).toBeInstanceOf(Error)
    expect(err!.message).toMatch('hello')
  })
})

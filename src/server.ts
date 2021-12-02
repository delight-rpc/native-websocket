import * as DelightRPC from 'delight-rpc'
import { getResult } from 'return-style'

export function createServer<IAPI extends object>(
  api: IAPI
, socket: WebSocket
): () => void {
  socket.addEventListener('message', handler)
  return () => socket.removeEventListener('message', handler)

  async function handler(event: MessageEvent): Promise<void> {
    const req = getResult(() => JSON.parse(event.data))
    if (DelightRPC.isRequest(req)) {
      const result = await DelightRPC.createResponse(api, req)

      socket.send(JSON.stringify(result))
    }
  }
}

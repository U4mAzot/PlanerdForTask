import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { subscribe } from "@/lib/sse"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return new Response("Unauthorized", { status: 401 })

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  })
  if (!member) return new Response("Forbidden", { status: 403 })

  const encoder = new TextEncoder()
  let unsub: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      // Send a heartbeat immediately so the client knows it's connected
      controller.enqueue(encoder.encode(`: connected\n\n`))

      unsub = subscribe(workspaceId, (data) => {
        try {
          controller.enqueue(encoder.encode(data))
        } catch {
          // Client disconnected
        }
      })

      // Heartbeat every 25s to keep the connection alive
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          clearInterval(interval)
        }
      }, 25_000)

      req.signal.addEventListener("abort", () => {
        clearInterval(interval)
        unsub?.()
        controller.close()
      })
    },
    cancel() {
      unsub?.()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}

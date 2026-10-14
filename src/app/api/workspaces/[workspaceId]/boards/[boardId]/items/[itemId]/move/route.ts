import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { broadcast } from "@/lib/sse"
import { z } from "zod"

const schema = z.object({
  groupId: z.string(),
  order: z.number().int().min(0),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; boardId: string; itemId: string }> }
) {
  const { workspaceId, boardId, itemId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  })
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Verify item belongs to this board/workspace
  const item = await prisma.item.findFirst({
    where: { id: itemId, group: { boardId, board: { workspaceId } } },
  })
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const { groupId, order } = parsed.data

  // Verify target group belongs to the same board
  const targetGroup = await prisma.itemGroup.findFirst({
    where: { id: groupId, boardId },
  })
  if (!targetGroup) return NextResponse.json({ error: "Invalid group" }, { status: 400 })

  await prisma.item.updateMany({
    where: { groupId, order: { gte: order }, id: { not: itemId } },
    data: { order: { increment: 1 } },
  })

  const updated = await prisma.item.update({
    where: { id: itemId },
    data: { groupId, order },
  })

  broadcast(workspaceId, { type: "board_updated" })
  return NextResponse.json(updated)
}

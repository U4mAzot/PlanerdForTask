import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { broadcast } from "@/lib/sse"
import { z } from "zod"

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  groupId: z.string().optional(),
  columnId: z.string().optional(),
  value: z.any().optional(),
})

async function getMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  })
}

async function getItem(itemId: string, boardId: string, workspaceId: string) {
  return prisma.item.findFirst({
    where: { id: itemId, group: { boardId, board: { workspaceId } } },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; boardId: string; itemId: string }> }
) {
  const { workspaceId, boardId, itemId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await getMember(workspaceId, session.user.id)
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const item = await getItem(itemId, boardId, workspaceId)
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  if (parsed.data.columnId !== undefined) {
    await prisma.itemColumnValue.upsert({
      where: { itemId_columnId: { itemId, columnId: parsed.data.columnId } },
      create: { itemId, columnId: parsed.data.columnId, value: parsed.data.value },
      update: { value: parsed.data.value },
    })
  }

  const updateData: { title?: string; description?: string; groupId?: string } = {}
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description
  if (parsed.data.groupId !== undefined) updateData.groupId = parsed.data.groupId

  const updated = await prisma.item.update({
    where: { id: itemId },
    data: updateData,
    include: { columnValues: true, assignees: { include: { user: true } } },
  })

  broadcast(workspaceId, { type: "board_updated" })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; boardId: string; itemId: string }> }
) {
  const { workspaceId, boardId, itemId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await getMember(workspaceId, session.user.id)
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const item = await getItem(itemId, boardId, workspaceId)
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.item.delete({ where: { id: itemId } })
  broadcast(workspaceId, { type: "board_updated" })
  return NextResponse.json({ ok: true })
}

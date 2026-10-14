import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { broadcast } from "@/lib/sse"
import { z } from "zod"

const patchSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
  collapsed: z.boolean().optional(),
  order: z.number().int().optional(),
})

async function getMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; boardId: string; groupId: string }> }
) {
  const { workspaceId, groupId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await getMember(workspaceId, session.user.id)
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const group = await prisma.itemGroup.update({
    where: { id: groupId },
    data: parsed.data,
  })

  broadcast(workspaceId, { type: "board_updated" })
  return NextResponse.json(group)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; boardId: string; groupId: string }> }
) {
  const { workspaceId, groupId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await getMember(workspaceId, session.user.id)
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await prisma.itemGroup.delete({ where: { id: groupId } })
  broadcast(workspaceId, { type: "board_updated" })
  return NextResponse.json({ ok: true })
}

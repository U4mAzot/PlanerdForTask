import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
})

async function getMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; boardId: string }> }
) {
  const { workspaceId, boardId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await getMember(workspaceId, session.user.id)
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const board = await prisma.board.update({
    where: { id: boardId, workspaceId },
    data: parsed.data,
  })

  return NextResponse.json(board)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; boardId: string }> }
) {
  const { workspaceId, boardId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await getMember(workspaceId, session.user.id)
  if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.board.delete({ where: { id: boardId, workspaceId } })
  return NextResponse.json({ ok: true })
}

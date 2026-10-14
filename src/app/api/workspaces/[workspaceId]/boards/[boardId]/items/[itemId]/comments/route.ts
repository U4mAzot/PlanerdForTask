import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { broadcast } from "@/lib/sse"
import { z } from "zod"

type Params = { params: Promise<{ workspaceId: string; boardId: string; itemId: string }> }

async function verifyItemAccess(workspaceId: string, boardId: string, itemId: string, userId: string) {
  const [member, item] = await Promise.all([
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    }),
    prisma.item.findFirst({
      where: { id: itemId, group: { boardId, board: { workspaceId } } },
    }),
  ])
  return { member, item }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { workspaceId, boardId, itemId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { member, item } = await verifyItemAccess(workspaceId, boardId, itemId, session.user.id)
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const comments = await prisma.comment.findMany({
    where: { itemId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(comments)
}

export async function POST(req: NextRequest, { params }: Params) {
  const { workspaceId, boardId, itemId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { member, item } = await verifyItemAccess(workspaceId, boardId, itemId, session.user.id)
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const parsed = z.object({ content: z.string().min(1).max(2000) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const comment = await prisma.comment.create({
    data: { itemId, userId: session.user.id, content: parsed.data.content },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  })

  broadcast(workspaceId, { type: "comment_added", itemId, comment })
  return NextResponse.json(comment, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { workspaceId, boardId, itemId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { member, item } = await verifyItemAccess(workspaceId, boardId, itemId, session.user.id)
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { commentId } = body

  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      itemId,
      // Allow own comments OR workspace admin/owner to moderate
      ...(member.role === "MEMBER" || member.role === "GUEST"
        ? { userId: session.user.id }
        : {}),
    },
  })
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.comment.delete({ where: { id: commentId } })
  broadcast(workspaceId, { type: "comment_deleted", itemId, commentId })
  return NextResponse.json({ ok: true })
}

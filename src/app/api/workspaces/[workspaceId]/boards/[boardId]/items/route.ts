import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { broadcast } from "@/lib/sse"
import { z } from "zod"

const createSchema = z.object({
  title: z.string().min(1).max(255),
  groupId: z.string(),
  parentId: z.string().optional(),
})

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  groupId: z.string().optional(),
  order: z.number().optional(),
})

async function getMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; boardId: string }> }
) {
  const { workspaceId, boardId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await getMember(workspaceId, session.user.id)
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const lastItem = await prisma.item.findFirst({
    where: { groupId: parsed.data.groupId },
    orderBy: { order: "desc" },
  })

  const item = await prisma.item.create({
    data: {
      title: parsed.data.title,
      groupId: parsed.data.groupId,
      parentId: parsed.data.parentId,
      createdById: session.user.id,
      order: (lastItem?.order ?? -1) + 1,
    },
    include: {
      columnValues: true,
      assignees: { include: { user: true } },
      subItems: true,
    },
  })

  broadcast(workspaceId, { type: "board_updated" })
  return NextResponse.json(item, { status: 201 })
}

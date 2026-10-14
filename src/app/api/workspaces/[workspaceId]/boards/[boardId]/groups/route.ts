import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  title: z.string().min(1).max(100),
  color: z.string().optional(),
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

  const lastGroup = await prisma.itemGroup.findFirst({
    where: { boardId },
    orderBy: { order: "desc" },
  })

  const group = await prisma.itemGroup.create({
    data: {
      boardId,
      title: parsed.data.title,
      color: parsed.data.color ?? "#6366f1",
      order: (lastGroup?.order ?? -1) + 1,
    },
  })

  return NextResponse.json(group, { status: 201 })
}

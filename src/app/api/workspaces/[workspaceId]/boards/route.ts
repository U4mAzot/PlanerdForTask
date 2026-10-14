import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().optional(),
})

async function getMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await getMember(workspaceId, session.user.id)
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const boards = await prisma.board.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(boards)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await getMember(workspaceId, session.user.id)
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const board = await prisma.board.create({
    data: {
      workspaceId,
      name: parsed.data.name,
      description: parsed.data.description,
      color: parsed.data.color ?? "#6366f1",
      groups: {
        create: [
          { title: "To Do", color: "#6366f1", order: 0 },
          { title: "In Progress", color: "#f59e0b", order: 1 },
          { title: "Done", color: "#10b981", order: 2 },
        ],
      },
      columns: {
        create: [
          { title: "Status", type: "STATUS", order: 0, width: 120, settings: {
            statusOptions: [
              { label: "Not Started", color: "#94a3b8" },
              { label: "In Progress", color: "#f59e0b" },
              { label: "Done", color: "#10b981" },
              { label: "Stuck", color: "#ef4444" },
            ],
          }},
          { title: "Owner", type: "PERSON", order: 1, width: 120 },
          { title: "Due Date", type: "DATE", order: 2, width: 120 },
          { title: "Priority", type: "PRIORITY", order: 3, width: 100, settings: {
            statusOptions: [
              { label: "Low", color: "#10b981" },
              { label: "Medium", color: "#f59e0b" },
              { label: "High", color: "#ef4444" },
              { label: "Critical", color: "#7c3aed" },
            ],
          }},
        ],
      },
    },
  })

  return NextResponse.json(board, { status: 201 })
}

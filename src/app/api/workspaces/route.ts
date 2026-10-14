import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, or hyphens"),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: session.user.id } } },
    include: { _count: { select: { members: true, boards: true } } },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(workspaces)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const existing = await prisma.workspace.findUnique({ where: { slug: parsed.data.slug } })
  if (existing) return NextResponse.json({ error: "Slug already taken" }, { status: 409 })

  const workspace = await prisma.workspace.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
    },
  })

  return NextResponse.json(workspace, { status: 201 })
}

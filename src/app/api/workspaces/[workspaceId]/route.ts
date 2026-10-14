import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const patchSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  color: z.string().optional(),
})

async function getOwnerOrAdmin(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findFirst({
    where: { workspaceId, userId, role: { in: ["OWNER", "ADMIN"] } },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await getOwnerOrAdmin(workspaceId, session.user.id)
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  if (parsed.data.slug) {
    const existing = await prisma.workspace.findFirst({
      where: { slug: parsed.data.slug, NOT: { id: workspaceId } },
    })
    if (existing) return NextResponse.json({ error: "Slug already taken" }, { status: 409 })
  }

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: parsed.data,
  })

  return NextResponse.json(workspace)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, role: "OWNER" },
  })
  if (!member) return NextResponse.json({ error: "Forbidden — only owner can delete" }, { status: 403 })

  await prisma.workspace.delete({ where: { id: workspaceId } })
  return NextResponse.json({ ok: true })
}

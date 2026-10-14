import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const patchSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER", "GUEST"]),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  const { workspaceId, memberId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const actor = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } },
  })
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  // Prevent changing owner's role
  const target = await prisma.workspaceMember.findUnique({ where: { id: memberId } })
  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 })
  if (target.role === "OWNER") return NextResponse.json({ error: "Cannot change owner role" }, { status: 403 })

  const member = await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role: parsed.data.role },
    include: { user: true },
  })

  return NextResponse.json(member)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  const { workspaceId, memberId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const actor = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } },
  })
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const target = await prisma.workspaceMember.findUnique({ where: { id: memberId } })
  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 })
  if (target.role === "OWNER") return NextResponse.json({ error: "Cannot remove the owner" }, { status: 403 })

  await prisma.workspaceMember.delete({ where: { id: memberId } })
  return NextResponse.json({ ok: true })
}

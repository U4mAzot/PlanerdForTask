import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateApiKey, hashApiKey, getApiKeyHint } from "@/lib/api-key"

async function getMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findFirst({
    where: { workspaceId, userId, role: { in: ["OWNER", "ADMIN"] } },
  })
}

// Never expose the key hash — return only safe metadata
function sanitize(k: { id: string; name: string; hint: string; createdAt: Date }) {
  return { id: k.id, name: k.name, hint: k.hint, createdAt: k.createdAt }
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

  const keys = await prisma.apiKey.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, hint: true, createdAt: true },
  })

  return NextResponse.json(keys)
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

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Default key"

  const rawKey = generateApiKey()
  const keyHash = hashApiKey(rawKey)
  const hint = getApiKeyHint(rawKey)

  const record = await prisma.apiKey.create({
    data: { workspaceId, name, key: keyHash, hint },
    select: { id: true, name: true, hint: true, createdAt: true },
  })

  // rawKey is returned ONCE here — never stored in plaintext, never returned again
  return NextResponse.json({ ...record, rawKey }, { status: 201 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await getMember(workspaceId, session.user.id)
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { keyId } = body
  if (!keyId) return NextResponse.json({ error: "keyId required" }, { status: 400 })

  // Confirm the key belongs to this workspace before deleting
  const existing = await prisma.apiKey.findFirst({ where: { id: keyId, workspaceId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.apiKey.delete({ where: { id: keyId } })
  return NextResponse.json({ ok: true })
}

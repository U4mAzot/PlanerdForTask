import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hashApiKey } from "@/lib/api-key"
import { z } from "zod"

const createSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  aiModel: z.string().optional(),
  tags: z.array(z.string()).optional(),
  date: z.string().optional(),
})

async function resolveAuth(req: NextRequest, workspaceId: string) {
  const authHeader = req.headers.get("authorization")
  if (authHeader?.startsWith("Bearer kc_")) {
    const rawKey = authHeader.slice(7)
    const keyHash = hashApiKey(rawKey)
    const apiKey = await prisma.apiKey.findUnique({ where: { key: keyHash } })
    if (apiKey && apiKey.workspaceId === workspaceId) {
      return { type: "apikey" as const, apiKeyId: apiKey.id }
    }
    return null
  }

  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  })
  if (!member) return null
  return { type: "session" as const, apiKeyId: undefined }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params

  const auth = await resolveAuth(req, workspaceId)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100)
  const offset = Number(url.searchParams.get("offset") ?? 0)

  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { workspaceId },
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
      include: { apiKey: { select: { name: true } } },
    }),
    prisma.journalEntry.count({ where: { workspaceId } }),
  ])

  return NextResponse.json({ entries, total })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params

  const auth = await resolveAuth(req, workspaceId)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 })
  }

  const { title, content, aiModel, tags, date } = parsed.data

  const entry = await prisma.journalEntry.create({
    data: {
      workspaceId,
      apiKeyId: auth.type === "apikey" ? auth.apiKeyId : undefined,
      title,
      content,
      aiModel,
      tags: tags ?? [],
      date: date ? new Date(date) : new Date(),
    },
    include: { apiKey: { select: { name: true } } },
  })

  return NextResponse.json(entry, { status: 201 })
}

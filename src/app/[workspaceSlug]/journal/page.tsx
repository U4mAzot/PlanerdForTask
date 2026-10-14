import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { JournalPage } from "@/components/journal/journal-page"

export default async function WorkspaceJournalPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: { members: true },
  })
  if (!workspace) notFound()

  const isMember = workspace.members.some(
    (m: { userId: string }) => m.userId === session.user.id
  )
  if (!isMember) redirect("/")

  const entries = await prisma.journalEntry.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { date: "desc" },
    take: 50,
    include: { apiKey: { select: { name: true } } },
  })

  return (
    <JournalPage
      workspace={workspace}
      entries={entries}
      currentUserId={session.user.id}
    />
  )
}

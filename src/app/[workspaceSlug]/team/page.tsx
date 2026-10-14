import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { TeamPage } from "@/components/workspace/team-page"

export default async function WorkspaceTeamPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: { members: { include: { user: true } } },
  })
  if (!workspace) notFound()

  const isMember = workspace.members.some((m: { userId: string }) => m.userId === session.user.id)
  if (!isMember) redirect("/")

  const userRole = workspace.members.find((m: { userId: string; role: string }) => m.userId === session.user.id)?.role

  return (
    <TeamPage
      workspace={workspace}
      members={workspace.members}
      currentUserId={session.user.id}
      currentUserRole={userRole ?? "MEMBER"}
    />
  )
}

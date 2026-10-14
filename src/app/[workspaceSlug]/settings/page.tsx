import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { SettingsPage } from "@/components/workspace/settings-page"

export default async function WorkspaceSettingsPage({
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

  const userMember = workspace.members.find(
    (m: { userId: string }) => m.userId === session.user.id
  )
  if (!userMember) redirect("/")

  return (
    <SettingsPage
      workspace={workspace}
      currentUserRole={userMember.role}
    />
  )
}

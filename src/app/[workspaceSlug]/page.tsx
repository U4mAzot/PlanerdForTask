import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { WorkspaceHome } from "@/components/workspace/workspace-home"

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      boards: { orderBy: { createdAt: "asc" } },
      members: { include: { user: true } },
    },
  })

  if (!workspace) notFound()

  return <WorkspaceHome workspace={workspace} currentUserId={session.user.id} />
}

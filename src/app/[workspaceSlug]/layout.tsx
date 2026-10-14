import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar"

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      members: { include: { user: true } },
      boards: { orderBy: { createdAt: "asc" } },
    },
  })

  if (!workspace) notFound()

  const isMember = workspace.members.some((m: { userId: string }) => m.userId === session.user.id)
  if (!isMember) redirect("/")

  return (
    <div className="flex h-screen overflow-hidden">
      <WorkspaceSidebar workspace={workspace} currentUserId={session.user.id} />
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  )
}

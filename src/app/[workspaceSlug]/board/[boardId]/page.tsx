import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { BoardView } from "@/components/board/board-view"

export default async function BoardPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; boardId: string }>
}) {
  const { workspaceSlug, boardId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: { members: true },
  })
  if (!workspace) notFound()

  const isMember = workspace.members.some((m: { userId: string }) => m.userId === session.user.id)
  if (!isMember) redirect("/")

  const board = await prisma.board.findUnique({
    where: { id: boardId, workspaceId: workspace.id },
    include: {
      columns: { orderBy: { order: "asc" } },
      groups: {
        orderBy: { order: "asc" },
        include: {
          items: {
            where: { parentId: null },
            orderBy: { order: "asc" },
            include: {
              columnValues: true,
              assignees: { include: { user: true } },
              subItems: {
                orderBy: { order: "asc" },
                include: {
                  columnValues: true,
                  assignees: { include: { user: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!board) notFound()

  const workspaceMembers = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: { user: true },
  })

  return (
    <BoardView
      board={board}
      workspaceMembers={workspaceMembers}
      workspaceSlug={workspaceSlug}
      currentUserId={session.user.id}
    />
  )
}

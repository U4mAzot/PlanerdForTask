"use client"

import { useState } from "react"
import Link from "next/link"
import type { Workspace, Board, WorkspaceMember, User } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreateBoardDialog } from "@/components/workspace/create-board-dialog"
import { Plus, LayoutGrid, Users } from "lucide-react"

type WorkspaceWithDetails = Workspace & {
  boards: Board[]
  members: (WorkspaceMember & { user: User })[]
}

export function WorkspaceHome({
  workspace,
  currentUserId,
}: {
  workspace: WorkspaceWithDetails
  currentUserId: string
}) {
  const [createBoardOpen, setCreateBoardOpen] = useState(false)

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{workspace.name}</h1>
        <p className="text-muted-foreground mt-1">
          {workspace.members.length} member{workspace.members.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" /> Boards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{workspace.boards.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{workspace.members.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Boards</h2>
          <Button size="sm" onClick={() => setCreateBoardOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New board
          </Button>
        </div>

        {workspace.boards.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-12 text-center">
            <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-1">No boards yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create your first board to start tracking work.
            </p>
            <Button onClick={() => setCreateBoardOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create board
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspace.boards.map((board: Board) => (
              <Link key={board.id} href={`/${workspace.slug}/board/${board.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <div className="h-2 rounded-t-lg" style={{ backgroundColor: board.color }} />
                  <CardContent className="pt-4">
                    <h3 className="font-semibold truncate">{board.name}</h3>
                    {board.description && (
                      <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                        {board.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
            <button
              onClick={() => setCreateBoardOpen(true)}
              className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary hover:text-primary transition-colors text-muted-foreground"
            >
              <Plus className="h-6 w-6 mx-auto mb-2" />
              <span className="text-sm font-medium">New board</span>
            </button>
          </div>
        )}
      </div>

      <CreateBoardDialog
        open={createBoardOpen}
        onOpenChange={setCreateBoardOpen}
        workspaceId={workspace.id}
        workspaceSlug={workspace.slug}
      />
    </div>
  )
}

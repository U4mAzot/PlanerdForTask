"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { useState } from "react"
import type { Workspace, Board, WorkspaceMember, User } from "@/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreateBoardDialog } from "@/components/workspace/create-board-dialog"
import {
  Users,
  Settings,
  Plus,
  ChevronDown,
  LogOut,
  Home,
  Bot,
} from "lucide-react"
import { cn } from "@/lib/utils"

type WorkspaceWithDetails = Workspace & {
  boards: Board[]
  members: (WorkspaceMember & { user: User })[]
}

export function WorkspaceSidebar({
  workspace,
  currentUserId,
}: {
  workspace: WorkspaceWithDetails
  currentUserId: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [createBoardOpen, setCreateBoardOpen] = useState(false)
  const currentUser = workspace.members.find(
    (m: WorkspaceMember & { user: User }) => m.userId === currentUserId
  )?.user

  const navItems = [
    { label: "Home", href: `/${workspace.slug}`, icon: Home },
    { label: "Team", href: `/${workspace.slug}/team`, icon: Users },
    { label: "AI Journal", href: `/${workspace.slug}/journal`, icon: Bot },
    { label: "Settings", href: `/${workspace.slug}/settings`, icon: Settings },
  ]

  return (
    <aside className="w-60 flex flex-col border-r bg-sidebar h-full shrink-0">
      {/* Workspace header */}
      <div className="p-3 border-b">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-accent transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: workspace.color }}
              >
                {workspace.name[0].toUpperCase()}
              </div>
              <span className="font-semibold text-sm truncate">{workspace.name}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => router.push("/onboarding")}>
              Create workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nav links */}
      <nav className="p-2 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
              pathname === href
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <Separator className="my-2" />

      {/* Boards */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="flex items-center justify-between px-2 py-1 mb-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Boards
          </span>
          <button
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent transition-colors"
            onClick={() => setCreateBoardOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-0.5">
          {workspace.boards.map((board: Board) => (
            <Link
              key={board.id}
              href={`/${workspace.slug}/board/${board.id}`}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
                pathname === `/${workspace.slug}/board/${board.id}`
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: board.color }}
              />
              <span className="truncate">{board.name}</span>
            </Link>
          ))}
        </div>

        {workspace.boards.length === 0 && (
          <button
            onClick={() => setCreateBoardOpen(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
            New board
          </button>
        )}
      </div>

      {/* User footer */}
      <div className="p-2 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-accent transition-colors">
            <Avatar className="h-7 w-7">
              <AvatarImage src={currentUser?.image ?? undefined} />
              <AvatarFallback className="text-xs">
                {currentUser?.name?.[0]?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm truncate">{currentUser?.name ?? currentUser?.email}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-52">
            <DropdownMenuItem disabled>
              <span className="text-xs text-muted-foreground truncate">{currentUser?.email}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CreateBoardDialog
        open={createBoardOpen}
        onOpenChange={setCreateBoardOpen}
        workspaceId={workspace.id}
        workspaceSlug={workspace.slug}
      />
    </aside>
  )
}

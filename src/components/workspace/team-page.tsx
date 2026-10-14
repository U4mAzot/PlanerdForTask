"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Workspace, WorkspaceMember, User, WorkspaceRole } from "@/types"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { InviteMemberDialog } from "@/components/workspace/invite-member-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserPlus, MoreHorizontal, ShieldCheck, UserMinus } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

type MemberWithUser = WorkspaceMember & { user: User }

const roleBadgeClass: Record<WorkspaceRole, string> = {
  OWNER: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  MEMBER: "bg-green-100 text-green-700",
  GUEST: "bg-gray-100 text-gray-700",
}

const ROLES: Array<{ value: Exclude<WorkspaceRole, "OWNER">; label: string }> = [
  { value: "ADMIN", label: "Admin" },
  { value: "MEMBER", label: "Member" },
  { value: "GUEST", label: "Guest" },
]

export function TeamPage({
  workspace,
  members,
  currentUserId,
  currentUserRole,
}: {
  workspace: Workspace
  members: MemberWithUser[]
  currentUserId: string
  currentUserRole: string
}) {
  const router = useRouter()
  const [inviteOpen, setInviteOpen] = useState(false)
  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN"

  async function handleChangeRole(memberId: string, role: string) {
    const res = await fetch(`/api/workspaces/${workspace.id}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })
    if (res.ok) {
      toast.success("Role updated")
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? "Failed to update role")
    }
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!confirm(`Remove ${memberName} from the workspace?`)) return
    const res = await fetch(`/api/workspaces/${workspace.id}/members/${memberId}`, {
      method: "DELETE",
    })
    if (res.ok) {
      toast.success("Member removed")
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? "Failed to remove member")
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground mt-1">
            {members.length} member{members.length !== 1 ? "s" : ""} in {workspace.name}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite member
          </Button>
        )}
      </div>

      <div className="border rounded-lg divide-y">
        {members.map((member) => {
          const isCurrentUser = member.userId === currentUserId
          const isOwner = member.role === "OWNER"
          const canModify = canManage && !isOwner && !isCurrentUser

          return (
            <div key={member.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={member.user.image ?? undefined} />
                  <AvatarFallback>
                    {member.user.name?.[0]?.toUpperCase() ?? member.user.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {member.user.name ?? member.user.email}
                    {isCurrentUser && (
                      <span className="text-muted-foreground text-sm ml-2">(you)</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{member.user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground hidden sm:block">
                  Joined {format(new Date(member.joinedAt), "MMM d, yyyy")}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleBadgeClass[member.role]}`}>
                  {member.role}
                </span>

                {canModify && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <div className="px-2 py-1 text-xs text-muted-foreground font-medium">Change role</div>
                      {ROLES.map((r) => (
                        <DropdownMenuItem
                          key={r.value}
                          onClick={() => handleChangeRole(member.id, r.value)}
                          className={member.role === r.value ? "font-semibold" : ""}
                        >
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          {r.label}
                          {member.role === r.value && " ✓"}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleRemoveMember(member.id, member.user.name ?? member.user.email)}
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        Remove from workspace
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        workspaceId={workspace.id}
      />
    </div>
  )
}

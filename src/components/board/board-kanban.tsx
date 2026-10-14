"use client"

import { useState } from "react"
import type { BoardWithDetails, WorkspaceMemberWithUser, ColumnSettings } from "@/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus } from "lucide-react"

type Group = BoardWithDetails["groups"][number]
type Item = Group["items"][number]

function KanbanCard({
  item,
  statusColumn,
  members,
}: {
  item: Item
  statusColumn: BoardWithDetails["columns"][number] | undefined
  members: WorkspaceMemberWithUser[]
}) {
  const settings = statusColumn?.settings as ColumnSettings | null
  const statusValue = item.columnValues.find(
    (v: Item["columnValues"][number]) => v.columnId === statusColumn?.id
  )?.value
  const statusOpt = settings?.statusOptions?.find((o) => o.label === statusValue)

  const ownerCol = item.columnValues.find(
    (v: Item["columnValues"][number]) =>
      typeof v.value === "string" && members.some((m: WorkspaceMemberWithUser) => m.userId === v.value)
  )
  const owner = ownerCol
    ? members.find((m: WorkspaceMemberWithUser) => m.userId === ownerCol.value)
    : undefined

  return (
    <div className="bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <p className="text-sm font-medium mb-2">{item.title}</p>
      <div className="flex items-center justify-between">
        {statusOpt && (
          <span
            className="text-xs px-2 py-0.5 rounded font-medium text-white"
            style={{ backgroundColor: statusOpt.color }}
          >
            {statusOpt.label}
          </span>
        )}
        {owner && (
          <Avatar className="h-5 w-5 ml-auto">
            <AvatarImage src={owner.user.image ?? undefined} />
            <AvatarFallback className="text-xs">{owner.user.name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  )
}

export function BoardKanban({
  board,
  workspaceMembers,
  onAddItem,
  onUpdateValue,
}: {
  board: BoardWithDetails
  workspaceMembers: WorkspaceMemberWithUser[]
  onAddItem: (groupId: string, title: string) => Promise<void>
  onUpdateValue: (itemId: string, columnId: string, value: unknown) => Promise<void>
}) {
  const statusColumn = board.columns.find((c: BoardWithDetails["columns"][number]) => c.type === "STATUS")
  const [addingGroup, setAddingGroup] = useState<string | null>(null)
  const [newItemTitle, setNewItemTitle] = useState("")

  async function handleAdd(groupId: string) {
    if (!newItemTitle.trim()) return
    await onAddItem(groupId, newItemTitle.trim())
    setNewItemTitle("")
    setAddingGroup(null)
  }

  return (
    <div className="p-4 flex gap-4 overflow-x-auto h-full">
      {board.groups.map((group: Group) => (
        <div key={group.id} className="w-72 shrink-0 flex flex-col">
          {/* Column header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: group.color }} />
            <span className="font-semibold text-sm">{group.title}</span>
            <span className="text-xs text-muted-foreground ml-auto">{group.items.length}</span>
          </div>

          {/* Cards */}
          <div className="flex-1 space-y-2 min-h-0">
            {group.items.map((item: Item) => (
              <KanbanCard
                key={item.id}
                item={item}
                statusColumn={statusColumn}
                members={workspaceMembers}
              />
            ))}
          </div>

          {/* Add item */}
          {addingGroup === group.id ? (
            <div className="mt-2 space-y-2">
              <Input
                autoFocus
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Item name"
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd(group.id)
                  if (e.key === "Escape") { setAddingGroup(null); setNewItemTitle("") }
                }}
              />
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={() => handleAdd(group.id)}>Add</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => { setAddingGroup(null); setNewItemTitle("") }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              className="mt-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setAddingGroup(group.id)}
            >
              <Plus className="h-4 w-4" />
              Add item
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

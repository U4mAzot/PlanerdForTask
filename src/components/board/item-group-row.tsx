"use client"

import { useState } from "react"
import type { BoardWithDetails, WorkspaceMemberWithUser } from "@/types"
import { ItemRow } from "@/components/board/item-row"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useDroppable } from "@dnd-kit/core"

type Group = BoardWithDetails["groups"][number]
type Column = BoardWithDetails["columns"][number]
type Item = Group["items"][number]

export function ItemGroupRow({
  group,
  columns,
  workspaceId,
  boardId,
  workspaceMembers,
  onAddItem,
  onUpdateValue,
  onUpdateTitle,
  onDeleteItem,
  onDeleteGroup,
  onOpenItem,
}: {
  group: Group
  columns: Column[]
  workspaceId: string
  boardId: string
  workspaceMembers: WorkspaceMemberWithUser[]
  onAddItem: (groupId: string, title: string, parentId?: string) => Promise<void>
  onUpdateValue: (itemId: string, columnId: string, value: unknown) => Promise<void>
  onUpdateTitle: (itemId: string, title: string) => Promise<void>
  onDeleteItem: (itemId: string) => Promise<void>
  onDeleteGroup: (groupId: string) => Promise<void>
  onOpenItem: (item: Item) => void
}) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [newItemTitle, setNewItemTitle] = useState("")
  const [editingTitle, setEditingTitle] = useState(false)
  const [groupTitle, setGroupTitle] = useState(group.title)

  // Make the group a drop target for cross-group moves
  const { setNodeRef, isOver } = useDroppable({ id: group.id })

  async function handleAddItem() {
    if (!newItemTitle.trim()) return
    await onAddItem(group.id, newItemTitle.trim())
    setNewItemTitle("")
    setAddingItem(false)
  }

  async function handleRenameGroup() {
    if (!groupTitle.trim() || groupTitle === group.title) { setEditingTitle(false); return }
    const res = await fetch(`/api/workspaces/${workspaceId}/boards/${boardId}/groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: groupTitle.trim() }),
    })
    setEditingTitle(false)
    if (!res.ok) { toast.error("Failed to rename group"); setGroupTitle(group.title); return }
    router.refresh()
  }

  return (
    <div>
      {/* Group header */}
      <div className="flex items-center gap-1 mb-1 group/header">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1.5 flex-1 min-w-0"
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          }
          <span className="h-3 w-3 rounded-sm inline-block shrink-0" style={{ backgroundColor: group.color }} />
          {editingTitle ? (
            <Input
              autoFocus
              className="h-6 text-sm font-semibold w-40"
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              onBlur={handleRenameGroup}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameGroup()
                if (e.key === "Escape") { setEditingTitle(false); setGroupTitle(group.title) }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="font-semibold text-sm ml-0.5">{groupTitle}</span>
          )}
          <span className="text-xs text-muted-foreground ml-1">{group.items.length}</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover/header:opacity-100 hover:bg-muted transition-all">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingTitle(true)}>
              <Pencil className="h-4 w-4 mr-2" /> Rename group
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => { if (confirm(`Delete group "${groupTitle}" and all its items?`)) onDeleteGroup(group.id) }}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!collapsed && (
        <div
          ref={setNodeRef}
          className={`border rounded-lg overflow-hidden transition-colors ${isOver ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
        >
          {/* Column headers */}
          <div className="flex border-b bg-muted/50 text-xs font-medium text-muted-foreground">
            <div className="flex-1 min-w-0 px-3 py-2">Task</div>
            {columns.map((col) => (
              <div key={col.id} className="px-3 py-2 shrink-0" style={{ width: col.width }}>
                {col.title}
              </div>
            ))}
            <div className="w-10" />
          </div>

          {/* Items */}
          {group.items.map((item: Item) => (
            <ItemRow
              key={item.id}
              item={item}
              columns={columns}
              workspaceMembers={workspaceMembers}
              onUpdateValue={onUpdateValue}
              onUpdateTitle={onUpdateTitle}
              onDeleteItem={onDeleteItem}
              onAddSubItem={(title) => onAddItem(group.id, title, item.id)}
              onOpenItem={onOpenItem}
            />
          ))}

          {/* Add item */}
          {addingItem ? (
            <div className="flex items-center gap-2 px-3 py-2 border-t">
              <Input
                autoFocus
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Item name"
                className="h-7 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddItem()
                  if (e.key === "Escape") { setAddingItem(false); setNewItemTitle("") }
                }}
              />
              <Button size="sm" className="h-7" onClick={handleAddItem}>Add</Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={() => { setAddingItem(false); setNewItemTitle("") }}>
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setAddingItem(true)}
              className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full border-t transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add item
            </button>
          )}
        </div>
      )}
    </div>
  )
}

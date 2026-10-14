"use client"

import { useState, useCallback } from "react"
import type { BoardWithDetails, WorkspaceMemberWithUser } from "@/types"
import { BoardTable } from "@/components/board/board-table"
import { BoardKanban } from "@/components/board/board-kanban"
import { ItemDetailPanel } from "@/components/board/item-detail-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { LayoutGrid, Table2, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useBoardRealtime } from "@/hooks/use-board-realtime"
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, DragStartEvent, DragEndEvent, DragOverEvent,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"

const GROUP_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#f59e0b", "#10b981", "#06b6d4",
]

type Item = BoardWithDetails["groups"][number]["items"][number]

export function BoardView({
  board,
  workspaceMembers,
  workspaceSlug,
  currentUserId,
}: {
  board: BoardWithDetails
  workspaceMembers: WorkspaceMemberWithUser[]
  workspaceSlug: string
  currentUserId: string
}) {
  const [view, setView] = useState<"table" | "kanban">("table")
  const router = useRouter()
  const workspaceId = workspaceMembers[0]?.workspaceId ?? board.workspaceId

  // Real-time updates
  useBoardRealtime(workspaceId)

  // Item detail panel
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  // Board rename
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameName, setRenameName] = useState(board.name)
  const [renaming, setRenaming] = useState(false)

  // Add group
  const [addGroupOpen, setAddGroupOpen] = useState(false)
  const [newGroupTitle, setNewGroupTitle] = useState("")
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0])
  const [addingGroup, setAddingGroup] = useState(false)

  // Drag state
  const [activeItem, setActiveItem] = useState<Item | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // ── Mutations ──────────────────────────────────────────────────────────────

  async function addItem(groupId: string, title: string, parentId?: string) {
    const res = await fetch(`/api/workspaces/${workspaceId}/boards/${board.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, groupId, parentId }),
    })
    if (!res.ok) toast.error("Failed to add item")
  }

  async function updateItemValue(itemId: string, columnId: string, value: unknown) {
    await fetch(`/api/workspaces/${workspaceId}/boards/${board.id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId, value }),
    })
  }

  async function updateItemTitle(itemId: string, title: string) {
    await fetch(`/api/workspaces/${workspaceId}/boards/${board.id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
  }

  async function deleteItem(itemId: string) {
    const res = await fetch(`/api/workspaces/${workspaceId}/boards/${board.id}/items/${itemId}`, { method: "DELETE" })
    if (res.ok) toast.success("Item deleted")
  }

  async function handleRenameBoard() {
    if (!renameName.trim()) return
    setRenaming(true)
    const res = await fetch(`/api/workspaces/${workspaceId}/boards/${board.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameName.trim() }),
    })
    setRenaming(false)
    if (!res.ok) { toast.error("Failed to rename board"); return }
    toast.success("Board renamed")
    setRenameOpen(false)
    router.refresh()
  }

  async function handleDeleteBoard() {
    const res = await fetch(`/api/workspaces/${workspaceId}/boards/${board.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Board deleted"); router.push(`/${workspaceSlug}`); router.refresh() }
    else toast.error("Failed to delete board")
  }

  async function handleAddGroup() {
    if (!newGroupTitle.trim()) return
    setAddingGroup(true)
    const res = await fetch(`/api/workspaces/${workspaceId}/boards/${board.id}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newGroupTitle.trim(), color: newGroupColor }),
    })
    setAddingGroup(false)
    if (!res.ok) { toast.error("Failed to add group"); return }
    toast.success("Group added")
    setNewGroupTitle("")
    setAddGroupOpen(false)
    router.refresh()
  }

  async function deleteGroup(groupId: string) {
    const res = await fetch(`/api/workspaces/${workspaceId}/boards/${board.id}/groups/${groupId}`, { method: "DELETE" })
    if (res.ok) toast.success("Group deleted")
    else toast.error("Failed to delete group")
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────────

  function onDragStart(event: DragStartEvent) {
    const draggedId = String(event.active.id)
    for (const group of board.groups) {
      const found = group.items.find((i) => i.id === draggedId)
      if (found) { setActiveItem(found); return }
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveItem(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // Find which group the active item belongs to
    let sourceGroupId = ""
    let targetGroupId = ""
    let targetOrder = 0

    for (const group of board.groups) {
      if (group.items.some((i) => i.id === activeId)) sourceGroupId = group.id
      if (group.items.some((i) => i.id === overId)) {
        targetGroupId = group.id
        const idx = group.items.findIndex((i) => i.id === overId)
        targetOrder = idx
      }
      // over could be the group container itself
      if (group.id === overId) {
        targetGroupId = group.id
        targetOrder = group.items.length
      }
    }

    if (!sourceGroupId || !targetGroupId) return

    await fetch(`/api/workspaces/${workspaceId}/boards/${board.id}/items/${activeId}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: targetGroupId, order: targetOrder }),
    })
    // broadcast fires server-side and triggers router.refresh() via SSE
  }

  const openItemDetail = useCallback((item: Item) => setSelectedItem(item), [])

  return (
    <div className="flex flex-col h-full">
      {/* Board header */}
      <div className="border-b px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-4 h-4 rounded shrink-0" style={{ backgroundColor: board.color }} />
          <h1 className="text-xl font-bold truncate">{board.name}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Tabs value={view} onValueChange={(v) => setView(v as "table" | "kanban")}>
            <TabsList className="h-8">
              <TabsTrigger value="table" className="h-7 px-2 text-xs gap-1">
                <Table2 className="h-3.5 w-3.5" /> Table
              </TabsTrigger>
              <TabsTrigger value="kanban" className="h-7 px-2 text-xs gap-1">
                <LayoutGrid className="h-3.5 w-3.5" /> Kanban
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setAddGroupOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add group
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded border hover:bg-muted transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setRenameName(board.name); setRenameOpen(true) }}>
                <Pencil className="h-4 w-4 mr-2" /> Rename board
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => { if (confirm(`Delete "${board.name}"? This cannot be undone.`)) handleDeleteBoard() }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Board content */}
      <div className="flex-1 overflow-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          {view === "table" ? (
            <BoardTable
              board={board}
              workspaceMembers={workspaceMembers}
              onAddItem={addItem}
              onUpdateValue={updateItemValue}
              onUpdateTitle={updateItemTitle}
              onDeleteItem={deleteItem}
              onDeleteGroup={deleteGroup}
              onOpenItem={openItemDetail}
              workspaceId={workspaceId}
              boardId={board.id}
            />
          ) : (
            <BoardKanban
              board={board}
              workspaceMembers={workspaceMembers}
              onAddItem={addItem}
              onUpdateValue={updateItemValue}
            />
          )}
          <DragOverlay>
            {activeItem && (
              <div className="bg-background border rounded shadow-lg px-3 py-2 text-sm font-medium opacity-90">
                {activeItem.title}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Item detail panel */}
      {selectedItem && (
        <ItemDetailPanel
          item={selectedItem}
          columns={board.columns}
          workspaceId={workspaceId}
          boardId={board.id}
          workspaceMembers={workspaceMembers}
          onClose={() => setSelectedItem(null)}
          onUpdateValue={updateItemValue}
        />
      )}

      {/* Rename board dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename board</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Board name</Label>
            <Input
              autoFocus value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRenameBoard() }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameBoard} disabled={renaming}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add group dialog */}
      <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add group</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Group name</Label>
              <Input
                autoFocus placeholder="e.g. Backlog"
                value={newGroupTitle}
                onChange={(e) => setNewGroupTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddGroup() }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {GROUP_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setNewGroupColor(c)}
                    className="w-6 h-6 rounded-full border-2 transition-all"
                    style={{ backgroundColor: c, borderColor: newGroupColor === c ? "black" : "transparent" }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddGroupOpen(false)}>Cancel</Button>
            <Button onClick={handleAddGroup} disabled={addingGroup || !newGroupTitle.trim()}>Add group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

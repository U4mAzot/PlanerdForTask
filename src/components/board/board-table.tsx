"use client"

import type { BoardWithDetails, WorkspaceMemberWithUser } from "@/types"
import { ItemGroupRow } from "@/components/board/item-group-row"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"

type Item = BoardWithDetails["groups"][number]["items"][number]

export function BoardTable({
  board,
  workspaceMembers,
  onAddItem,
  onUpdateValue,
  onUpdateTitle,
  onDeleteItem,
  onDeleteGroup,
  onOpenItem,
  workspaceId,
  boardId,
}: {
  board: BoardWithDetails
  workspaceMembers: WorkspaceMemberWithUser[]
  onAddItem: (groupId: string, title: string, parentId?: string) => Promise<void>
  onUpdateValue: (itemId: string, columnId: string, value: unknown) => Promise<void>
  onUpdateTitle: (itemId: string, title: string) => Promise<void>
  onDeleteItem: (itemId: string) => Promise<void>
  onDeleteGroup: (groupId: string) => Promise<void>
  onOpenItem: (item: Item) => void
  workspaceId: string
  boardId: string
}) {
  return (
    <div className="p-4 space-y-6">
      {board.groups.map((group: BoardWithDetails["groups"][number]) => (
        <SortableContext
          key={group.id}
          items={group.items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <ItemGroupRow
            group={group}
            columns={board.columns}
            workspaceId={workspaceId}
            boardId={boardId}
            workspaceMembers={workspaceMembers}
            onAddItem={onAddItem}
            onUpdateValue={onUpdateValue}
            onUpdateTitle={onUpdateTitle}
            onDeleteItem={onDeleteItem}
            onDeleteGroup={onDeleteGroup}
            onOpenItem={onOpenItem}
          />
        </SortableContext>
      ))}
    </div>
  )
}

"use client"

import { useState } from "react"
import type { BoardWithDetails, WorkspaceMemberWithUser, ColumnSettings } from "@/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MoreHorizontal, Trash2, Plus, ChevronDown, ChevronRight, GripVertical, ExternalLink } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

type Item = BoardWithDetails["groups"][number]["items"][number]
type Column = BoardWithDetails["columns"][number]

function StatusCell({ value, column, onUpdate }: { value: unknown; column: Column; onUpdate: (v: unknown) => void }) {
  const settings = column.settings as ColumnSettings | null
  const options = settings?.statusOptions ?? []
  const current = options.find((o) => o.label === value)

  return (
    <Popover>
      <PopoverTrigger
        className="w-full h-8 rounded text-xs font-medium transition-opacity hover:opacity-80"
        style={{ backgroundColor: current?.color ?? "#e2e8f0", color: current ? "white" : "inherit" }}
      >
        {current?.label ?? "—"}
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        {options.map((opt) => (
          <button
            key={opt.label}
            className="w-full text-left px-2 py-1.5 rounded text-xs font-medium hover:opacity-80 mb-0.5 text-white"
            style={{ backgroundColor: opt.color }}
            onClick={() => onUpdate(opt.label)}
          >
            {opt.label}
          </button>
        ))}
        <button
          className="w-full text-left px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-muted"
          onClick={() => onUpdate(null)}
        >
          Clear
        </button>
      </PopoverContent>
    </Popover>
  )
}

function PersonCell({ value, workspaceMembers, onUpdate }: { value: unknown; workspaceMembers: WorkspaceMemberWithUser[]; onUpdate: (v: unknown) => void }) {
  const assignedId = typeof value === "string" ? value : null
  const assigned = workspaceMembers.find((m) => m.userId === assignedId)

  return (
    <Popover>
      <PopoverTrigger className="flex items-center justify-center w-full h-8">
        {assigned ? (
          <Avatar className="h-6 w-6">
            <AvatarImage src={assigned.user.image ?? undefined} />
            <AvatarFallback className="text-xs">{assigned.user.name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        {workspaceMembers.map((m) => (
          <button
            key={m.userId}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted"
            onClick={() => onUpdate(m.userId)}
          >
            <Avatar className="h-5 w-5">
              <AvatarImage src={m.user.image ?? undefined} />
              <AvatarFallback className="text-xs">{m.user.name?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
            <span className="truncate">{m.user.name ?? m.user.email}</span>
          </button>
        ))}
        <button
          className="w-full text-left px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-muted"
          onClick={() => onUpdate(null)}
        >
          Clear
        </button>
      </PopoverContent>
    </Popover>
  )
}

function DateCell({ value, onUpdate }: { value: unknown; onUpdate: (v: unknown) => void }) {
  return (
    <input
      type="date"
      className="w-full h-8 text-xs bg-transparent border-none outline-none px-1 text-foreground"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onUpdate(e.target.value || null)}
    />
  )
}

function TextCell({ value, onUpdate }: { value: unknown; onUpdate: (v: unknown) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(typeof value === "string" ? value : "")

  if (!editing) {
    return (
      <button
        className="w-full h-8 text-left px-1 text-xs text-muted-foreground hover:bg-muted rounded truncate"
        onClick={() => setEditing(true)}
      >
        {val || "—"}
      </button>
    )
  }

  return (
    <Input
      autoFocus
      className="h-7 text-xs"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => { setEditing(false); onUpdate(val) }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") { setEditing(false); onUpdate(val) }
      }}
    />
  )
}

export function ItemRow({
  item,
  columns,
  workspaceMembers,
  onUpdateValue,
  onUpdateTitle,
  onDeleteItem,
  onAddSubItem,
  onOpenItem,
}: {
  item: Item
  columns: Column[]
  workspaceMembers: WorkspaceMemberWithUser[]
  onUpdateValue: (itemId: string, columnId: string, value: unknown) => Promise<void>
  onUpdateTitle: (itemId: string, title: string) => Promise<void>
  onDeleteItem: (itemId: string) => Promise<void>
  onAddSubItem: (title: string) => Promise<void>
  onOpenItem: (item: Item) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(item.title)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  function getColValue(colId: string) {
    return item.columnValues.find((v: { columnId: string }) => v.columnId === colId)?.value ?? null
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center border-t group hover:bg-muted/30 transition-colors"
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="pl-2 pr-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* Expand toggle + title */}
        <div className="flex-1 min-w-0 flex items-center gap-1 px-2 py-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {expanded
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            }
          </button>
          {editingTitle ? (
            <Input
              autoFocus
              className="h-6 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                setEditingTitle(false)
                if (title.trim() && title !== item.title) onUpdateTitle(item.id, title.trim())
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setEditingTitle(false)
                  if (title.trim() && title !== item.title) onUpdateTitle(item.id, title.trim())
                }
                if (e.key === "Escape") { setEditingTitle(false); setTitle(item.title) }
              }}
            />
          ) : (
            <span
              className="text-sm truncate cursor-pointer hover:text-primary"
              onClick={() => setEditingTitle(true)}
            >
              {title}
            </span>
          )}
        </div>

        {/* Column values */}
        {columns.map((col) => (
          <div key={col.id} className="px-1 py-1 shrink-0" style={{ width: col.width }}>
            {(col.type === "STATUS" || col.type === "PRIORITY") && (
              <StatusCell value={getColValue(col.id)} column={col} onUpdate={(v) => onUpdateValue(item.id, col.id, v)} />
            )}
            {col.type === "PERSON" && (
              <PersonCell value={getColValue(col.id)} workspaceMembers={workspaceMembers} onUpdate={(v) => onUpdateValue(item.id, col.id, v)} />
            )}
            {col.type === "DATE" && (
              <DateCell value={getColValue(col.id)} onUpdate={(v) => onUpdateValue(item.id, col.id, v)} />
            )}
            {(col.type === "TEXT" || col.type === "NUMBER" || col.type === "TAGS") && (
              <TextCell value={getColValue(col.id)} onUpdate={(v) => onUpdateValue(item.id, col.id, v)} />
            )}
          </div>
        ))}

        {/* Actions */}
        <div className="w-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onOpenItem(item)}>
                <ExternalLink className="h-4 w-4 mr-2" /> Open detail
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDeleteItem(item.id)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Subitems */}
      {expanded && (
        <div className="bg-muted/20 pl-8">
          {item.subItems.map((sub: { id: string; title: string }) => (
            <div key={sub.id} className="flex items-center border-t px-3 py-1.5 text-sm text-muted-foreground">
              <span className="flex-1 truncate">{sub.title}</span>
            </div>
          ))}
          <AddSubItem onAdd={onAddSubItem} />
        </div>
      )}
    </>
  )
}

function AddSubItem({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const [adding, setAdding] = useState(false)
  const [val, setVal] = useState("")

  async function handleAdd() {
    if (!val.trim()) return
    await onAdd(val.trim())
    setVal("")
    setAdding(false)
  }

  if (!adding) {
    return (
      <button
        className="flex items-center gap-1 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground w-full border-t"
        onClick={() => setAdding(true)}
      >
        <Plus className="h-3 w-3" /> Add subitem
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-t">
      <Input
        autoFocus className="h-6 text-xs" value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Subitem name"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd()
          if (e.key === "Escape") { setAdding(false); setVal("") }
        }}
      />
      <Button size="sm" className="h-6 text-xs px-2" onClick={handleAdd}>Add</Button>
      <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => { setAdding(false); setVal("") }}>Cancel</Button>
    </div>
  )
}

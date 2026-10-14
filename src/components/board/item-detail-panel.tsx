"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import type { BoardWithDetails, WorkspaceMemberWithUser } from "@/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  X, MessageSquare, Send, Trash2, AlignLeft,
  Loader2, ChevronRight, Users,
} from "lucide-react"

type Item = BoardWithDetails["groups"][number]["items"][number]
type Column = BoardWithDetails["columns"][number]

type Comment = {
  id: string
  content: string
  createdAt: string
  user: { id: string; name: string | null; email: string; image: string | null }
}

const STATUS_COLORS: Record<string, string> = {
  "Not started": "bg-gray-200 text-gray-700",
  "In progress": "bg-blue-100 text-blue-700",
  "Done": "bg-green-100 text-green-700",
  "Stuck": "bg-red-100 text-red-700",
}

export function ItemDetailPanel({
  item,
  columns,
  workspaceId,
  boardId,
  workspaceMembers,
  onClose,
  onUpdateValue,
}: {
  item: Item
  columns: Column[]
  workspaceId: string
  boardId: string
  workspaceMembers: WorkspaceMemberWithUser[]
  onClose: () => void
  onUpdateValue: (itemId: string, columnId: string, value: unknown) => Promise<void>
}) {
  const router = useRouter()
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description ?? "")
  const [editingDesc, setEditingDesc] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState("")
  const [sendingComment, setSendingComment] = useState(false)
  const [loadingComments, setLoadingComments] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const apiBase = `/api/workspaces/${workspaceId}/boards/${boardId}/items/${item.id}`

  useEffect(() => {
    loadComments()
  }, [item.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [comments])

  async function loadComments() {
    setLoadingComments(true)
    const res = await fetch(`${apiBase}/comments`)
    if (res.ok) setComments(await res.json())
    setLoadingComments(false)
  }

  async function saveTitle() {
    if (title === item.title || !title.trim()) return
    await fetch(`${apiBase}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    })
    router.refresh()
  }

  async function saveDescription() {
    setEditingDesc(false)
    if (description === (item.description ?? "")) return
    await fetch(`${apiBase}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    })
    router.refresh()
  }

  async function sendComment() {
    if (!commentText.trim()) return
    setSendingComment(true)
    const res = await fetch(`${apiBase}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentText.trim() }),
    })
    setSendingComment(false)
    if (res.ok) {
      const comment = await res.json()
      setComments((c) => [...c, comment])
      setCommentText("")
    } else {
      toast.error("Failed to send comment")
    }
  }

  async function deleteComment(commentId: string) {
    const res = await fetch(`${apiBase}/comments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    })
    if (res.ok) setComments((c) => c.filter((x) => x.id !== commentId))
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Panel */}
      <div
        className="relative z-50 w-full max-w-xl h-full bg-background border-l shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ChevronRight className="h-4 w-4" />
            <span>Task detail</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Title */}
          <div className="px-5 pt-5 pb-3">
            <Input
              className="text-xl font-semibold border-none shadow-none px-0 focus-visible:ring-0 h-auto py-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur() } }}
            />
          </div>

          {/* Column values */}
          <div className="px-5 pb-4 space-y-2">
            {columns.map((col) => {
              const cv = item.columnValues.find((v) => v.columnId === col.id)
              const rawVal = cv?.value as string | null | undefined
              return (
                <div key={col.id} className="flex items-center gap-3 min-h-[28px]">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">{col.title}</span>
                  {col.type === "STATUS" || col.type === "PRIORITY" ? (
                    <select
                      className="text-xs border rounded px-2 py-0.5 bg-background"
                      value={rawVal ?? ""}
                      onChange={(e) => onUpdateValue(item.id, col.id, e.target.value)}
                    >
                      <option value="">—</option>
                      {col.type === "STATUS"
                        ? ["Not started", "In progress", "Done", "Stuck"].map((s) => (
                          <option key={s}>{s}</option>
                        ))
                        : ["Low", "Medium", "High", "Critical"].map((p) => (
                          <option key={p}>{p}</option>
                        ))
                      }
                    </select>
                  ) : col.type === "DATE" ? (
                    <input
                      type="date"
                      className="text-xs border rounded px-2 py-0.5 bg-background"
                      value={rawVal ?? ""}
                      onChange={(e) => onUpdateValue(item.id, col.id, e.target.value)}
                    />
                  ) : col.type === "CHECKBOX" ? (
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={rawVal === "true"}
                      onChange={(e) => onUpdateValue(item.id, col.id, String(e.target.checked))}
                    />
                  ) : (
                    <input
                      type={col.type === "NUMBER" ? "number" : "text"}
                      className="text-xs border rounded px-2 py-0.5 bg-background flex-1"
                      value={rawVal ?? ""}
                      onChange={(e) => onUpdateValue(item.id, col.id, e.target.value)}
                    />
                  )}
                </div>
              )
            })}
          </div>

          <Separator />

          {/* Assignees */}
          {item.assignees.length > 0 && (
            <>
              <div className="px-5 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Assignees</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {item.assignees.map((a) => (
                    <div key={a.userId} className="flex items-center gap-1.5 bg-muted rounded-full px-2 py-0.5">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={a.user.image ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {(a.user.name ?? a.user.email)[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{a.user.name ?? a.user.email}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Description */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <AlignLeft className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Description</span>
            </div>
            {editingDesc ? (
              <Textarea
                autoFocus
                className="min-h-[100px] text-sm resize-none"
                placeholder="Add a description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={saveDescription}
              />
            ) : (
              <div
                className="text-sm text-muted-foreground min-h-[40px] cursor-text rounded border border-transparent hover:border-input px-2 py-1.5 whitespace-pre-wrap"
                onClick={() => setEditingDesc(true)}
              >
                {description || <span className="italic">Click to add a description...</span>}
              </div>
            )}
          </div>

          <Separator />

          {/* Comments */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                Comments {comments.length > 0 && `(${comments.length})`}
              </span>
            </div>

            {loadingComments ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading...
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 group">
                    <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                      <AvatarImage src={comment.user.image ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {(comment.user.name ?? comment.user.email)[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium">
                          {comment.user.name ?? comment.user.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.createdAt), "MMM d, HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={() => deleteComment(comment.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>

        {/* Comment input */}
        <div className="px-5 py-3 border-t shrink-0">
          <div className="flex gap-2">
            <Input
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment() } }}
              className="flex-1"
            />
            <Button size="icon" onClick={sendComment} disabled={sendingComment || !commentText.trim()}>
              {sendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

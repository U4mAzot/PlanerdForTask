"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Workspace } from "@/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { format, isToday, isYesterday } from "date-fns"
import { Bot, Plus, Sparkles, Calendar, Tag, Loader2 } from "lucide-react"

type JournalEntryWithKey = {
  id: string
  title: string
  content: string
  aiModel: string | null
  tags: string[]
  date: Date
  createdAt: Date
  apiKey: { name: string } | null
}

const AI_MODEL_COLORS: Record<string, string> = {
  "Claude": "bg-orange-100 text-orange-700 border-orange-200",
  "Cursor": "bg-blue-100 text-blue-700 border-blue-200",
  "ChatGPT": "bg-green-100 text-green-700 border-green-200",
  "Copilot": "bg-purple-100 text-purple-700 border-purple-200",
}

function modelColor(model: string | null) {
  if (!model) return "bg-gray-100 text-gray-600 border-gray-200"
  for (const [key, cls] of Object.entries(AI_MODEL_COLORS)) {
    if (model.toLowerCase().includes(key.toLowerCase())) return cls
  }
  return "bg-gray-100 text-gray-600 border-gray-200"
}

function formatEntryDate(date: Date) {
  const d = new Date(date)
  if (isToday(d)) return "Today"
  if (isYesterday(d)) return "Yesterday"
  return format(d, "EEEE, MMMM d, yyyy")
}

function groupByDate(entries: JournalEntryWithKey[]) {
  const groups: Record<string, JournalEntryWithKey[]> = {}
  for (const entry of entries) {
    const key = format(new Date(entry.date), "yyyy-MM-dd")
    if (!groups[key]) groups[key] = []
    groups[key].push(entry)
  }
  return groups
}

export function JournalPage({
  workspace,
  entries: initialEntries,
  currentUserId,
}: {
  workspace: Workspace
  entries: JournalEntryWithKey[]
  currentUserId: string
}) {
  const router = useRouter()
  const [entries, setEntries] = useState(initialEntries)
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: "",
    content: "",
    aiModel: "",
    tags: "",
  })

  const groups = groupByDate(entries)
  const dateKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  async function handleAdd() {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required")
      return
    }
    setSaving(true)
    const res = await fetch(`/api/workspaces/${workspace.id}/journal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        content: form.content.trim(),
        aiModel: form.aiModel.trim() || undefined,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    })
    setSaving(false)

    if (!res.ok) { toast.error("Failed to add entry"); return }
    const newEntry = await res.json()
    toast.success("Journal entry added!")
    setAddOpen(false)
    setForm({ title: "", content: "", aiModel: "", tags: "" })
    setEntries((prev) => [newEntry, ...prev])
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            AI Dev Journal
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Daily logs from AI sessions — what was built, fixed, and shipped.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add entry
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-16 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No journal entries yet</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
            AI assistants can log what they built each session. Go to{" "}
            <strong>Settings → AI Journal</strong> to get your API key and setup instructions.
          </p>
          <Button variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add first entry manually
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {dateKeys.map((dateKey) => (
            <div key={dateKey}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-semibold text-sm">
                  {formatEntryDate(new Date(dateKey))}
                </span>
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">
                  {groups[dateKey].length} {groups[dateKey].length === 1 ? "entry" : "entries"}
                </span>
              </div>

              {/* Entries */}
              <div className="space-y-3 pl-7">
                {groups[dateKey].map((entry) => (
                  <JournalCard key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add entry dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" /> Add journal entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                placeholder="e.g. Added settings page and fixed board functionality"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>What was done</Label>
              <Textarea
                placeholder="Describe what was built, fixed, or changed..."
                rows={5}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>AI model (optional)</Label>
                <Input
                  placeholder="e.g. Claude Sonnet 4.6"
                  value={form.aiModel}
                  onChange={(e) => setForm((f) => ({ ...f, aiModel: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tags (comma separated)</Label>
                <Input
                  placeholder="feature, bugfix, refactor"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function JournalCard({ entry }: { entry: JournalEntryWithKey }) {
  const [expanded, setExpanded] = useState(false)
  const lines = entry.content.split("\n")
  const preview = lines.slice(0, 3).join("\n")
  const hasMore = lines.length > 3

  return (
    <Card className="overflow-hidden hover:shadow-sm transition-shadow">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-sm leading-snug">{entry.title}</h3>
          <span className="text-xs text-muted-foreground shrink-0">
            {format(new Date(entry.date), "HH:mm")}
          </span>
        </div>

        {/* Content */}
        <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {expanded ? entry.content : preview}
          {hasMore && !expanded && <span className="text-muted-foreground">...</span>}
        </div>
        {hasMore && (
          <button
            className="text-xs text-primary mt-1 hover:underline"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {entry.aiModel && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${modelColor(entry.aiModel)}`}>
              <Bot className="h-3 w-3" />
              {entry.aiModel}
            </span>
          )}
          {entry.apiKey && (
            <span className="text-xs text-muted-foreground">
              via {entry.apiKey.name}
            </span>
          )}
          {entry.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs py-0 h-5">
              <Tag className="h-2.5 w-2.5 mr-1" />
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

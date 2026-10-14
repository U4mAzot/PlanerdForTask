"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Workspace } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Loader2, AlertTriangle, Bot, Copy, Trash2, Plus, Key } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { format } from "date-fns"

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#f59e0b", "#10b981", "#06b6d4",
  "#3b82f6", "#64748b",
]

const generalSchema = z.object({
  name: z.string().min(2, "At least 2 characters").max(50),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
})
type GeneralFormData = z.infer<typeof generalSchema>

type ApiKeyRecord = {
  id: string
  name: string
  hint: string
  createdAt: string
}

export function SettingsPage({
  workspace,
  currentUserRole,
}: {
  workspace: Workspace
  currentUserRole: string
}) {
  const router = useRouter()
  const [color, setColor] = useState(workspace.color)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)

  // API keys
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([])
  const [keysLoading, setKeysLoading] = useState(false)
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")

  // Show the raw key once in a dialog after creation
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)

  const canEdit = currentUserRole === "OWNER" || currentUserRole === "ADMIN"
  const isOwner = currentUserRole === "OWNER"

  const { register, handleSubmit, formState: { errors } } = useForm<GeneralFormData>({
    resolver: zodResolver(generalSchema),
    defaultValues: { name: workspace.name, slug: workspace.slug },
  })

  const loadKeys = useCallback(async () => {
    setKeysLoading(true)
    const res = await fetch(`/api/workspaces/${workspace.id}/api-keys`)
    if (res.ok) setApiKeys(await res.json())
    setKeysLoading(false)
  }, [workspace.id])

  useEffect(() => {
    if (canEdit) loadKeys()
  }, [canEdit, loadKeys])

  async function onSaveGeneral(data: GeneralFormData) {
    setSaving(true)
    const res = await fetch(`/api/workspaces/${workspace.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, color }),
    })
    setSaving(false)

    if (!res.ok) {
      const { error } = await res.json()
      toast.error(error ?? "Failed to save")
      return
    }

    const updated = await res.json()
    toast.success("Workspace updated!")
    if (updated.slug !== workspace.slug) {
      router.replace(`/${updated.slug}/settings`)
    } else {
      router.refresh()
    }
  }

  async function handleDelete() {
    if (deleteConfirm !== workspace.name) { toast.error("Name doesn't match"); return }
    setDeleting(true)
    const res = await fetch(`/api/workspaces/${workspace.id}`, { method: "DELETE" })
    setDeleting(false)
    if (!res.ok) { toast.error("Failed to delete workspace"); return }
    toast.success("Workspace deleted")
    router.push("/")
    router.refresh()
  }

  async function handleCreateKey() {
    if (!newKeyName.trim()) { toast.error("Key name is required"); return }
    setCreatingKey(true)
    const res = await fetch(`/api/workspaces/${workspace.id}/api-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName.trim() }),
    })
    setCreatingKey(false)

    if (!res.ok) { toast.error("Failed to create key"); return }

    const data = await res.json()
    // Strip rawKey from the record before adding to list
    const { rawKey, ...record } = data as ApiKeyRecord & { rawKey: string }
    setApiKeys((prev) => [record, ...prev])
    setNewKeyName("")
    setNewlyCreatedKey(rawKey)
  }

  async function handleDeleteKey(keyId: string) {
    if (!confirm("Delete this API key? Any AI using it will stop working.")) return
    const res = await fetch(`/api/workspaces/${workspace.id}/api-keys`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId }),
    })
    if (res.ok) {
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId))
      toast.success("API key deleted")
    } else {
      toast.error("Failed to delete key")
    }
  }

  const claudeSnippet = `# KindCode AI Journal hook
# Add this to your CLAUDE.md to auto-log each session

## After completing work, post to the KindCode journal:
POST https://your-app-url/api/workspaces/${workspace.id}/journal
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "title": "<one-line summary of what was done>",
  "content": "<detailed notes — features added, bugs fixed, decisions made>",
  "aiModel": "Claude Sonnet 4.6",
  "tags": ["feature", "bugfix"]
}`

  return (
    <div className="p-8 max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Workspace Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your workspace configuration</p>
      </div>

      {/* General settings */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Update your workspace name, URL slug, and color</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSaveGeneral)} className="space-y-5">
            <div className="space-y-1.5">
              <Label>Workspace name</Label>
              <Input disabled={!canEdit} {...register("name")} />
              {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>URL slug</Label>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-sm shrink-0">kindcode.app/</span>
                <Input disabled={!canEdit} className="flex-1" {...register("slug")} />
              </div>
              {errors.slug && <p className="text-destructive text-xs">{errors.slug.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c} type="button" disabled={!canEdit}
                    onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-full border-2 transition-all disabled:opacity-50"
                    style={{ backgroundColor: c, borderColor: color === c ? "black" : "transparent" }}
                  />
                ))}
              </div>
            </div>
            {canEdit && (
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* AI Journal / API keys */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Journal API Keys
            </CardTitle>
            <CardDescription>
              Give Claude, Cursor, or any AI assistant an API key so it can automatically post
              daily session notes to your <strong>AI Dev Journal</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Create key */}
            <div className="flex gap-2">
              <Input
                placeholder="Key name (e.g. Claude Code, Cursor)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateKey() }}
                className="flex-1"
              />
              <Button onClick={handleCreateKey} disabled={creatingKey}>
                {creatingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Generate
              </Button>
            </div>

            {/* Keys list */}
            {keysLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading keys...
              </div>
            ) : apiKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No API keys yet. Generate one above to connect an AI assistant.
              </p>
            ) : (
              <div className="space-y-2">
                {apiKeys.map((k) => (
                  <div key={k.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <Key className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{k.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{k.hint}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {format(new Date(k.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteKey(k.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* CLAUDE.md snippet */}
            {apiKeys.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">CLAUDE.md setup snippet</Label>
                  <Button
                    variant="ghost" size="sm" className="h-7 text-xs"
                    onClick={() => { navigator.clipboard.writeText(claudeSnippet); toast.success("Snippet copied!") }}
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
                <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto leading-relaxed border">
                  {claudeSnippet}
                </pre>
                <p className="text-xs text-muted-foreground">
                  Replace <code className="bg-muted px-1 rounded">YOUR_API_KEY</code> with the key you
                  copied at creation time. Paste into your project&apos;s{" "}
                  <code className="bg-muted px-1 rounded">CLAUDE.md</code>.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Workspace info */}
      <Card>
        <CardHeader><CardTitle>Workspace Info</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Workspace ID</span>
            <span className="font-mono text-xs">{workspace.id}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Your role</span>
            <span className="font-medium capitalize">{currentUserRole.toLowerCase()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      {isOwner && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Danger Zone
            </CardTitle>
            <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Delete this workspace</p>
                <p className="text-muted-foreground text-xs mt-0.5">Permanently deletes all boards, items, and data.</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                Delete workspace
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workspace</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{workspace.name}</strong> and all its data.
              Type the workspace name to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Type <strong>{workspace.name}</strong> to confirm</Label>
            <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={workspace.name} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== workspace.name || deleting}
              onClick={handleDelete}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New API key — show raw key once */}
      <Dialog open={!!newlyCreatedKey} onOpenChange={() => setNewlyCreatedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy your API key</DialogTitle>
            <DialogDescription>
              This is the only time your full key will be shown. Copy it now — it cannot be retrieved again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border font-mono text-sm break-all">
              {newlyCreatedKey}
            </div>
            <Button
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(newlyCreatedKey ?? "")
                toast.success("Key copied!")
                setNewlyCreatedKey(null)
              }}
            >
              <Copy className="h-4 w-4 mr-2" /> Copy and close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

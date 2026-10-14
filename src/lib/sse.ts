type Listener = (data: string) => void

// In-memory pub/sub — scoped per workspaceId
const rooms = new Map<string, Set<Listener>>()

export function subscribe(workspaceId: string, listener: Listener): () => void {
  if (!rooms.has(workspaceId)) rooms.set(workspaceId, new Set())
  rooms.get(workspaceId)!.add(listener)
  return () => rooms.get(workspaceId)?.delete(listener)
}

export function broadcast(workspaceId: string, event: object) {
  const listeners = rooms.get(workspaceId)
  if (!listeners?.size) return
  const payload = `data: ${JSON.stringify(event)}\n\n`
  listeners.forEach((fn) => fn(payload))
}

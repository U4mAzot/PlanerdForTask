"use client"

import { useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"

export function useBoardRealtime(workspaceId: string) {
  const router = useRouter()
  const esRef = useRef<EventSource | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close()

    const es = new EventSource(`/api/workspaces/${workspaceId}/stream`)
    esRef.current = es

    es.onmessage = () => {
      // Any data event means something changed — refresh server components
      router.refresh()
    }

    es.onerror = () => {
      es.close()
      esRef.current = null
      // Reconnect after 3s on error
      retryRef.current = setTimeout(connect, 3000)
    }
  }, [workspaceId, router])

  useEffect(() => {
    connect()
    return () => {
      esRef.current?.close()
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, [connect])
}

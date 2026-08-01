import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Login } from './Login'
import { AppShell } from '@/components/AppShell'

export default function Index() {
  const [authed, setAuthed] = useState(pb.authStore.isValid)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = pb.authStore.onChange(() => {
      setAuthed(pb.authStore.isValid)
    })
    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .catch(() => {
          pb.authStore.clear()
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
    return () => {
      unsub()
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-sm text-muted-foreground">Carregando…</div>
      </div>
    )
  }

  if (!authed) {
    return <Login />
  }

  return <AppShell onLogout={() => pb.authStore.clear()} />
}

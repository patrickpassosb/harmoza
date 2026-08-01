/* HARMOZA — Hook de autenticação
   Gerencia login/cadastro/logout e expõe o usuário atual. */

import { useCallback, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'

export interface AuthUser {
  id: string
  email: string
  name?: string
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const rec = pb.authStore.record as { id?: string; email?: string; name?: string } | null
    if (rec && rec.id) return { id: rec.id, email: rec.email ?? '', name: rec.name }
    return null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = pb.authStore.onChange((_token, record) => {
      const r = record as { id?: string; email?: string; name?: string } | null
      setUser(r && r.id ? { id: r.id, email: r.email ?? '', name: r.name } : null)
    })
    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .catch(() => pb.authStore.clear())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
    return unsub
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    await pb.collection('users').authWithPassword(email.trim(), password)
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    await pb.collection('users').create({ name, email, password, passwordConfirm: password })
    await pb.collection('users').authWithPassword(email.trim(), password)
  }, [])

  const signOut = useCallback(() => {
    pb.authStore.clear()
  }, [])

  return { user, loading, signIn, signUp, signOut }
}

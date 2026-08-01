// HARMOZA — página principal: login (se não autenticado) ou app
import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Login } from './Login'
import { AppShell } from '@/components/AppShell'

const Index = () => {
  const [authed, setAuthed] = useState<boolean>(() => pb.authStore.isValid)

  useEffect(() => {
    // valida o token no boot; se falhar, limpa
    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .then(() => setAuthed(true))
        .catch(() => {
          pb.authStore.clear()
          setAuthed(false)
        })
    }
  }, [])

  if (!authed) return <Login onAuthed={() => setAuthed(true)} />

  return (
    <AppShell
      onLogout={() => {
        pb.authStore.clear()
        setAuthed(false)
      }}
    />
  )
}

export default Index

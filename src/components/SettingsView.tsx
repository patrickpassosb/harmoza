import { useState, useEffect } from 'react'
import { ArrowLeft, User, Palette, ShieldCheck, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'

import { ProfileSettings } from './settings/ProfileSettings'
import { PreferencesSettings } from './settings/PreferencesSettings'
import { SecuritySettings } from './settings/SecuritySettings'

interface SettingsViewProps {
  onBack: () => void
}

export function SettingsView({ onBack }: SettingsViewProps) {
  const user = pb.authStore.record
  const [name, setName] = useState(user?.name || '')
  const [email] = useState(user?.email || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [removeAvatarFlag, setRemoveAvatarFlag] = useState(false)

  const avatarUrl = user && user.avatar ? pb.files.getUrl(user, user.avatar) : null

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('harmoza.theme') as 'light' | 'dark' | 'system') || 'light'
  })
  const [language, setLanguage] = useState<'pt-BR' | 'en-US'>(() => {
    return (localStorage.getItem('harmoza.lang') as 'pt-BR' | 'en-US') || 'pt-BR'
  })
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (avatarFile) {
      const url = URL.createObjectURL(avatarFile)
      setAvatarPreview(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setAvatarPreview(null)
    }
  }, [avatarFile])

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    localStorage.setItem('harmoza.theme', newTheme)
    const root = document.documentElement
    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else if (newTheme === 'light') {
      root.classList.remove('dark')
    } else {
      const isDarkSystem = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', isDarkSystem)
    }
  }

  const handleLanguageChange = (newLang: 'pt-BR' | 'en-US') => {
    setLanguage(newLang)
    localStorage.setItem('harmoza.lang', newLang)
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      const userId = pb.authStore.record?.id
      if (!userId) throw new Error('Usuário não autenticado.')

      const formData = new FormData()
      formData.append('name', name)

      if (avatarFile) {
        formData.append('avatar', avatarFile)
      } else if (removeAvatarFlag) {
        formData.append('avatar', '')
      }

      await pb.collection('users').update(userId, formData)
      await pb.collection('users').authRefresh()

      toast.success('Configurações salvas com sucesso!')
      setAvatarFile(null)
      setRemoveAvatarFlag(false)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar configurações.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="h-9 w-9 rounded-lg"
            title="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#172554]">
              Configurações da Conta
            </h1>
            <p className="text-xs text-muted-foreground">
              Gerencie seu perfil, preferências e segurança.
            </p>
          </div>
        </div>

        <Button
          onClick={handleSaveAll}
          disabled={saving}
          className="bg-[#0F766E] hover:bg-[#0F766E]/90 text-white shadow-sm text-xs font-semibold"
        >
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {saving ? 'Salvando…' : 'Salvar Alterações'}
        </Button>
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-muted/60">
              <TabsTrigger value="profile" className="flex items-center gap-2 text-xs">
                <User className="h-3.5 w-3.5" /> Perfil
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2 text-xs">
                <Palette className="h-3.5 w-3.5" /> Preferências
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2 text-xs">
                <ShieldCheck className="h-3.5 w-3.5" /> Segurança
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <ProfileSettings
                name={name}
                email={email}
                avatarUrl={avatarUrl}
                avatarPreview={avatarPreview}
                onNameChange={setName}
                onAvatarFileSelect={(file) => {
                  setAvatarFile(file)
                  setRemoveAvatarFlag(false)
                }}
                onRemoveAvatar={() => {
                  setAvatarFile(null)
                  setAvatarPreview(null)
                  setRemoveAvatarFlag(true)
                }}
              />
            </TabsContent>

            <TabsContent value="preferences">
              <PreferencesSettings
                theme={theme}
                language={language}
                emailNotifications={emailNotifications}
                onThemeChange={handleThemeChange}
                onLanguageChange={handleLanguageChange}
                onEmailNotificationsChange={setEmailNotifications}
              />
            </TabsContent>

            <TabsContent value="security">
              <SecuritySettings userEmail={email} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

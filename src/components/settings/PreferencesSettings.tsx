import { Moon, Sun, Laptop, Globe, Bell } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface PreferencesSettingsProps {
  theme: 'light' | 'dark' | 'system'
  language: 'pt-BR' | 'en-US'
  emailNotifications: boolean
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void
  onLanguageChange: (lang: 'pt-BR' | 'en-US') => void
  onEmailNotificationsChange: (val: boolean) => void
}

export function PreferencesSettings({
  theme,
  language,
  emailNotifications,
  onThemeChange,
  onLanguageChange,
  onEmailNotificationsChange,
}: PreferencesSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-[#172554]">Preferências do Aplicativo</h3>
        <p className="text-xs text-muted-foreground">
          Customize a aparência e comportamento da plataforma HARMOZA.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-[#172554]">Tema da Interface</Label>
          <Select
            value={theme}
            onValueChange={(v) => onThemeChange(v as 'light' | 'dark' | 'system')}
          >
            <SelectTrigger className="w-full text-sm">
              <SelectValue placeholder="Selecione o tema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-500" />
                  <span>Claro (Light)</span>
                </div>
              </SelectItem>
              <SelectItem value="dark">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4 text-indigo-400" />
                  <span>Escuro (Dark)</span>
                </div>
              </SelectItem>
              <SelectItem value="system">
                <div className="flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-muted-foreground" />
                  <span>Sistema (Automático)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-[#172554]">Idioma de Exibição</Label>
          <Select value={language} onValueChange={(v) => onLanguageChange(v as 'pt-BR' | 'en-US')}>
            <SelectTrigger className="w-full text-sm">
              <SelectValue placeholder="Selecione o idioma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt-BR">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-[#0F766E]" />
                  <span>Português (Brasil)</span>
                </div>
              </SelectItem>
              <SelectItem value="en-US">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <span>English (US)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[#0F766E]/10 p-2 text-[#0F766E]">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#172554]">Notificações por E-mail</p>
              <p className="text-[11px] text-muted-foreground">
                Receba resumos de análises de planilhas e relatórios gerados pelo Agente IA.
              </p>
            </div>
          </div>
          <Switch checked={emailNotifications} onCheckedChange={onEmailNotificationsChange} />
        </div>
      </div>
    </div>
  )
}

import { useRef, ChangeEvent } from 'react'
import { User, Mail, Camera, Trash2, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ProfileSettingsProps {
  name: string
  email: string
  avatarUrl: string | null
  avatarPreview: string | null
  onNameChange: (val: string) => void
  onAvatarFileSelect: (file: File | null) => void
  onRemoveAvatar: () => void
}

export function ProfileSettings({
  name,
  email,
  avatarUrl,
  avatarPreview,
  onNameChange,
  onAvatarFileSelect,
  onRemoveAvatar,
}: ProfileSettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    onAvatarFileSelect(file)
  }

  const displayAvatar = avatarPreview || avatarUrl

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-[#172554]">Informações de Perfil</h3>
        <p className="text-xs text-muted-foreground">
          Atualize sua foto de perfil, nome e dados pessoais.
        </p>
      </div>

      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="relative group">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[#0F766E]/20 bg-[#172554] text-xl font-bold text-white shadow-sm">
            {displayAvatar ? (
              <img src={displayAvatar} alt={name} className="h-full w-full object-cover" />
            ) : (
              name.charAt(0).toUpperCase() || 'H'
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#0F766E] text-white shadow-md transition-transform hover:scale-110"
            title="Alterar foto"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
            >
              Carregar nova foto
            </Button>
            {displayAvatar && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemoveAvatar}
                className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Formatos suportados: JPG, PNG ou WEBP. Tam. máx. 5MB.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs font-semibold text-[#172554]">
            Nome completo
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Seu nome"
              className="pl-9 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="email" className="text-xs font-semibold text-[#172554]">
              E-mail
            </Label>
            <Badge variant="secondary" className="gap-1 bg-emerald-50 text-[10px] text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> Verificado
            </Badge>
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              value={email}
              readOnly
              disabled
              className="bg-muted/50 pl-9 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            O e-mail é usado para autenticação e notificações.
          </p>
        </div>
      </div>
    </div>
  )
}

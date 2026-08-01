import { useState } from 'react'
import { Lock, KeyRound, Mail, ShieldCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'

interface SecuritySettingsProps {
  userEmail: string
}

export function SecuritySettings({ userEmail }: SecuritySettingsProps) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPassword) {
      toast.error('Informe a senha atual.')
      return
    }
    if (newPassword.length < 8) {
      toast.error('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('A confirmação de senha não confere.')
      return
    }

    setLoading(true)
    try {
      const userId = pb.authStore.record?.id
      if (!userId) throw new Error('Usuário não autenticado.')

      await pb.collection('users').update(userId, {
        oldPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
      })
      await pb.collection('users').authRefresh()
      toast.success('Senha alterada com sucesso!')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao alterar senha. Verifique sua senha atual.')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestReset = async () => {
    if (!userEmail) return
    setResetLoading(true)
    try {
      await pb.collection('users').requestPasswordReset(userEmail)
      toast.success(`E-mail de redefinição enviado para ${userEmail}`)
    } catch (err: any) {
      toast.error('Não foi possível enviar o e-mail de redefinição.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-[#172554]">Segurança da Conta</h3>
        <p className="text-xs text-muted-foreground">
          Gerencie a autenticação e redefinição de senha da sua conta HARMOZA.
        </p>
      </div>

      <form
        onSubmit={handlePasswordChange}
        className="space-y-4 rounded-xl border border-border bg-card p-4"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-[#172554]">
          <KeyRound className="h-4 w-4 text-[#0F766E]" /> Alterar Senha
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="oldPass" className="text-xs">
              Senha atual
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="oldPass"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="newPass" className="text-xs">
                Nova senha
              </Label>
              <Input
                id="newPass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPass" className="text-xs">
                Confirmar nova senha
              </Label>
              <Input
                id="confirmPass"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="text-sm"
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          size="sm"
          className="bg-[#172554] text-xs hover:bg-[#172554]/90"
        >
          {loading ? 'Atualizando…' : 'Atualizar Senha'}
        </Button>
      </form>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#172554]">Redefinição por E-mail</p>
            <p className="text-[11px] text-muted-foreground">
              Receba um link seguro no seu e-mail cadastrado para redefinir a senha.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRequestReset}
          disabled={resetLoading}
          className="text-xs"
        >
          <Mail className="mr-1.5 h-3.5 w-3.5" />
          {resetLoading ? 'Enviando…' : 'Enviar Link'}
        </Button>
      </div>
    </div>
  )
}

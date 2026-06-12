import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GalleryVerticalEnd } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { brokerApi, saveToken } from '@/lib/api'

export function InviteAcceptPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [tenantName, setTenantName] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(true)

  useEffect(() => {
    async function loadPreview() {
      try {
        const preview = await brokerApi.previewInvite(token)
        setTenantName(preview.tenant_name)
        setEmail(preview.email)
        setStatus(preview.status)

        if (preview.status === 'accepted') {
          setError('Este convite já foi aceito. Faça login para continuar.')
        }
      } catch {
        setError('Convite inválido ou expirado.')
      } finally {
        setPreviewLoading(false)
      }
    }

    if (token) {
      void loadPreview()
    }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    setLoading(true)

    try {
      const result = await brokerApi.acceptInvite({ token, name, password })
      saveToken(result.token)
      navigate('/')
    } catch {
      setError('Não foi possível aceitar o convite. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6">
      <div className="mb-6 flex items-center gap-2 font-medium">
        <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GalleryVerticalEnd className="size-4" />
        </div>
        Oportalimobiliário
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Aceitar convite</CardTitle>
          <CardDescription>
            {previewLoading
              ? 'Carregando convite...'
              : tenantName
                ? `Você foi convidado(a) pela construtora ${tenantName}.`
                : 'Convite de corretor'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

          {status === 'accepted' ? (
            <Button className="w-full" onClick={() => navigate('/login')}>
              Ir para login
            </Button>
          ) : previewLoading ? null : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <input
                  id="email"
                  type="email"
                  className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
                  value={email}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <input
                  id="name"
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <input
                  id="password"
                  type="password"
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <input
                  id="confirm-password"
                  type="password"
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Criando conta...' : 'Aceitar convite e entrar'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

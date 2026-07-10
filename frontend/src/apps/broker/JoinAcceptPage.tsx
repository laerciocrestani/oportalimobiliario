import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GalleryVerticalEnd } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { brokerApi, ApiRequestError, saveToken } from '@/lib/api'
import { formatBrazilianMobilePhone, isBrazilianMobilePhoneValid, isValidEmail } from '@/lib/format-phone'

export function JoinAcceptPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [tenantName, setTenantName] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(true)
  const resendingInviteRef = useRef(false)

  useEffect(() => {
    async function loadPreview() {
      try {
        const preview = await brokerApi.previewJoinLink(token)
        setTenantName(preview.tenant_name)
      } catch {
        setError('Link de convite inválido.')
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
    setPhoneError(null)
    setEmailError(null)
    if (!isBrazilianMobilePhoneValid(phone)) {
      setPhoneError('Informe um celular válido com DDD e 9 dígitos, ex.: (11) 99999-9999.')
      return
    }

    if (!isValidEmail(email.trim())) {
      setEmailError('Informe um e-mail válido.')
      return
    }

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
      const result = await brokerApi.registerViaJoinLink({
        token,
        name,
        phone,
        email: email.trim(),
        password,
      })
      saveToken(result.token)

      if (result.pending_approval) {
        navigate('/pending-approval')
        return
      }

      navigate('/')
    } catch (err) {
      if (err instanceof ApiRequestError && err.errors) {
        const emailMessage = err.errors.email?.[0]
        const phoneMessage = err.errors.phone?.[0]

        if (emailMessage) {
          setEmailError(emailMessage)
        }

        if (phoneMessage) {
          setPhoneError(phoneMessage)
        }

        if (err.errors.invite_resend) {
          toast('Não encontrou o link? Reenviamos o convite individual para o canal original.', {
            action: {
              label: 'Reenviar convite',
              onClick: () => {
                void handleResendIndividualInvite()
              },
            },
          })
        }

        if (!emailMessage && !phoneMessage) {
          setError('Não foi possível concluir o cadastro. Verifique os dados e tente novamente.')
        }
      } else {
        setError('Não foi possível concluir o cadastro. Verifique os dados e tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResendIndividualInvite() {
    if (resendingInviteRef.current) {
      return
    }

    setError(null)
    setPhoneError(null)
    setEmailError(null)

    if (!isBrazilianMobilePhoneValid(phone)) {
      setPhoneError('Informe um celular válido com DDD e 9 dígitos, ex.: (11) 99999-9999.')
      toast.error('Informe um celular válido antes de reenviar o convite.')
      return
    }

    if (!isValidEmail(email.trim())) {
      setEmailError('Informe um e-mail válido.')
      toast.error('Informe um e-mail válido antes de reenviar o convite.')
      return
    }

    resendingInviteRef.current = true
    const toastId = toast.loading('Reenviando convite...')

    try {
      const result = await brokerApi.resendIndividualInviteFromJoin({
        token,
        email: email.trim(),
        phone,
      })
      toast.success(result.message, { id: toastId })
    } catch (err) {
      if (err instanceof ApiRequestError && err.errors) {
        const emailMessage = err.errors.email?.[0]
        const phoneMessage = err.errors.phone?.[0]

        if (emailMessage) {
          setEmailError(emailMessage)
        }

        if (phoneMessage) {
          setPhoneError(phoneMessage)
        }

        if (!emailMessage && !phoneMessage) {
          toast.error('Não foi possível reenviar o convite. Tente novamente.', { id: toastId })
        } else {
          toast.dismiss(toastId)
        }
      } else {
        toast.error('Não foi possível reenviar o convite. Tente novamente.', { id: toastId })
      }
    } finally {
      resendingInviteRef.current = false
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
          <CardTitle>Cadastro de corretor</CardTitle>
          <CardDescription>
            {previewLoading
              ? 'Carregando...'
              : tenantName
                ? `Solicite acesso à construtora ${tenantName}.`
                : 'Link de convite'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

          {previewLoading || error === 'Link de convite inválido.' ? null : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="join-name">Nome completo</Label>
                <Input
                  id="join-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="join-phone">Telefone (WhatsApp)</Label>
                <Input
                  id="join-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => {
                    setPhone(formatBrazilianMobilePhone(e.target.value))
                    setPhoneError(null)
                  }}
                  aria-invalid={phoneError ? true : undefined}
                  required
                />
                {phoneError ? <p className="text-sm text-destructive">{phoneError}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="join-email">E-mail</Label>
                <Input
                  id="join-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setEmailError(null)
                  }}
                  aria-invalid={emailError ? true : undefined}
                  required
                />
                {emailError ? <p className="text-sm text-destructive">{emailError}</p> : null}
                <p className="text-xs text-muted-foreground">
                  Você usará este e-mail para acessar o portal de corretor.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="join-password">Senha</Label>
                <Input
                  id="join-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="join-confirm-password">Confirmar senha</Label>
                <Input
                  id="join-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Após o cadastro, a construtora precisa aprovar sua solicitação antes do acesso aos
                empreendimentos.
              </p>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando solicitação...' : 'Solicitar acesso'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

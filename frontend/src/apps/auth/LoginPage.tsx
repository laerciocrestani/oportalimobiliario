import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { GalleryVerticalEnd } from 'lucide-react'
import { LoginForm } from '@/components/login-form'
import { login, saveToken } from '@/lib/api'
import { isRoleAllowedOnProfile, PORTAL_LABELS, type PortalProfile } from '@/lib/profile'

type LoginPageProps = {
  profile: PortalProfile
}

type LoginLocationState = {
  error?: string
}

export function LoginPage({ profile }: LoginPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as LoginLocationState | null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(locationState?.error ?? null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await login(email, password)

      if (!isRoleAllowedOnProfile(result.user.role, profile)) {
        setError('Conta não autorizada neste portal.')
        return
      }

      saveToken(result.token)
      navigate('/')
    } catch {
      setError('Não foi possível entrar. Verifique e-mail e senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Oportalimobiliário
          </a>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <p className="w-full max-w-xs text-sm text-muted-foreground">
            Portal {PORTAL_LABELS[profile]}
          </p>
          <div className="w-full max-w-xs">
            <LoginForm
              email={email}
              password={password}
              loading={loading}
              error={error}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/60 to-black/10 p-10 text-white">
          <p className="text-lg font-medium">Gestão de lançamentos imobiliários</p>
          <p className="text-sm text-white/80">
            Conecte construtoras, corretores e consumidores em um único ecossistema.
          </p>
        </div>
      </div>
    </div>
  )
}

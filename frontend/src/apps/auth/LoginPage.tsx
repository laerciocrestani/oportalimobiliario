import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { login, saveToken } from '@/lib/api'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await login(email, password)
      saveToken(result.token)
      navigate('/construtora')
    } catch {
      setError('Não foi possível entrar. Verifique e-mail e senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-semibold">Entrar</h1>
          <p className="text-sm text-muted-foreground">Oportalimobiliário</p>
        </div>
        <label className="block space-y-1 text-sm">
          <span>E-mail</span>
          <input
            aria-label="E-mail"
            className="w-full rounded-lg border border-input bg-background px-3 py-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Senha</span>
          <input
            aria-label="Senha"
            className="w-full rounded-lg border border-input bg-background px-3 py-2"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </div>
  )
}

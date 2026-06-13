import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { GalleryVerticalEnd } from 'lucide-react'
import { exchangeImpersonationCode, saveToken } from '@/lib/api'

export function ImpersonatePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')

    if (!code) {
      setError('Link de acesso inválido.')
      return
    }

    async function exchange() {
      try {
        const result = await exchangeImpersonationCode(code)
        saveToken(result.token)
        navigate('/', { replace: true })
      } catch {
        setError('Não foi possível validar o acesso. O link pode ter expirado.')
      }
    }

    void exchange()
  }, [navigate, searchParams])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <div className="flex items-center gap-2 font-medium">
        <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GalleryVerticalEnd className="size-4" />
        </div>
        Oportalimobiliário
      </div>

      {error ? (
        <div className="max-w-sm space-y-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Link
            to="/login"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground"
          >
            Ir para login
          </Link>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Entrando no portal construtora...</p>
      )}
    </div>
  )
}

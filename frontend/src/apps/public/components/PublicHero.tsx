import { useState } from 'react'
import { ArrowDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PublicHero() {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <section className="relative min-h-[45vh] overflow-hidden md:min-h-[55vh]">
      {!imageFailed ? (
        <img
          src="/hero-portal.jpg"
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div
          className="absolute inset-0 size-full bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900"
          aria-hidden
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />

      <div className="relative mx-auto flex min-h-[45vh] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 md:min-h-[55vh] lg:px-8">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-emerald-200/90">
          Lançamentos exclusivos
        </p>
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Encontre o imóvel ideal no empreendimento certo
        </h1>
        <p className="mt-4 max-w-xl text-base text-white/80 sm:text-lg">
          Explore empreendimentos publicados, compare valores a partir da unidade mais acessível e
          conheça cada projeto em detalhe.
        </p>
        <div className="mt-8">
          <Button render={<a href="#lancamentos" />} nativeButton={false} size="lg">
            Ver lançamentos
            <ArrowDownIcon className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </section>
  )
}

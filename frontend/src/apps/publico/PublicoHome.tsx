import { useEffect, useState } from 'react'
import { publicApi, type Empreendimento } from '@/lib/api'

function applySeo(emp: Empreendimento) {
  document.title = emp.seo_title ?? `${emp.nome} | Dia de Imóveis`
  const description = emp.seo_description ?? emp.descricao ?? ''
  let meta = document.querySelector('meta[name="description"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'description')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', description)
}

export function PublicoHome() {
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([])
  const [selected, setSelected] = useState<(Empreendimento & { unidades?: { codigo: string }[] }) | null>(null)

  useEffect(() => {
    void publicApi.listEmpreendimentos().then(setEmpreendimentos)
    document.title = 'Lançamentos | Dia de Imóveis'
  }, [])

  async function openDetail(id: number) {
    const detail = await publicApi.getEmpreendimento(id)
    setSelected(detail)
    applySeo(detail)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Portal público</h2>
        <p className="mt-2 text-muted-foreground">Lançamentos publicados — sem login.</p>
      </div>

      {selected ? (
        <article className="space-y-4 rounded-lg border p-6">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:underline"
            onClick={() => setSelected(null)}
          >
            ← Voltar
          </button>
          <h3 className="text-xl font-semibold">{selected.nome}</h3>
          {selected.cidade && (
            <p className="text-sm text-muted-foreground">
              {selected.cidade}/{selected.estado}
            </p>
          )}
          <p className="text-sm">{selected.descricao}</p>
          {selected.unidades && selected.unidades.length > 0 && (
            <div>
              <h4 className="mb-2 font-medium">Unidades disponíveis</h4>
              <ul className="flex flex-wrap gap-2">
                {selected.unidades.map((u) => (
                  <li key={u.codigo} className="rounded-md bg-muted px-2 py-1 text-xs">
                    {u.codigo}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {empreendimentos.map((emp) => (
            <li key={emp.id}>
              <button
                type="button"
                className="h-full w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
                onClick={() => void openDetail(emp.id)}
              >
                <h3 className="font-semibold">{emp.nome}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[emp.cidade, emp.estado].filter(Boolean).join(' / ') || 'Localização sob consulta'}
                </p>
                <p className="mt-2 line-clamp-2 text-sm">{emp.descricao}</p>
              </button>
            </li>
          ))}
          {empreendimentos.length === 0 && (
            <li className="text-sm text-muted-foreground">Nenhum lançamento publicado.</li>
          )}
        </ul>
      )}
    </div>
  )
}

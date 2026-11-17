export type ModeloTheme = 'luxo'

export function withModeloTheme(href: string): string {
  const hashAt = href.indexOf('#')
  const hash = hashAt >= 0 ? href.slice(hashAt) : ''
  const bare = hashAt >= 0 ? href.slice(0, hashAt) : href
  const [path, search = ''] = bare.split('?')
  const params = new URLSearchParams(search)

  params.delete('portal')
  params.delete('modelo')

  const query = params.toString()

  return `${path}${query ? `?${query}` : ''}${hash}`
}

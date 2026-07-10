export type CoverImage = {
  id: number
  url: string
}

export type CheapestUnit = {
  code: string
  price: string
  area_m2: string | null
  floor: number | null
}

export type PublicBuildingListItem = {
  id: number
  slug: string
  name: string
  description: string | null
  city: string | null
  state: string | null
  seo_title: string | null
  seo_description: string | null
  units_count: number
  cheapest_unit: CheapestUnit | null
  cover_image: CoverImage | null
}

export type PublicUnit = {
  id: number
  code: string
  floor: number | null
  area_m2: string | null
  price: string | null
  status: string
}

export type PublicBuildingDetail = PublicBuildingListItem & {
  units?: PublicUnit[]
}

export class PublicApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'PublicApiError'
  }
}

const API_BASE = import.meta.env.PUBLIC_API_BASE_URL ?? 'http://api.localhost:8000/api'

async function fetchPublic<T>(path: string): Promise<T> {
  const base = API_BASE.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = `${base}${normalizedPath}`

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new PublicApiError(`API error ${response.status}`, response.status)
  }

  return response.json() as Promise<T>
}

export function publicMediaUrl(relativeUrl: string): string {
  const base = API_BASE.replace(/\/$/, '')
  const path = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`

  return `${base}${path}`
}

export function listBuildings(): Promise<PublicBuildingListItem[]> {
  return fetchPublic<PublicBuildingListItem[]>('/public/buildings')
}

export function getBuildingBySlug(slug: string): Promise<PublicBuildingDetail> {
  return fetchPublic<PublicBuildingDetail>(`/public/buildings/${encodeURIComponent(slug)}`)
}

export async function fetchSitemapXml(): Promise<string> {
  const base = API_BASE.replace(/\/$/, '')
  const response = await fetch(`${base}/public/sitemap.xml`, {
    headers: { Accept: 'application/xml' },
  })

  if (!response.ok) {
    throw new PublicApiError(`Sitemap error ${response.status}`, response.status)
  }

  return response.text()
}

export async function fetchRobotsTxt(): Promise<string> {
  const base = API_BASE.replace(/\/$/, '')
  const response = await fetch(`${base}/public/robots.txt`, {
    headers: { Accept: 'text/plain' },
  })

  if (!response.ok) {
    throw new PublicApiError(`Robots error ${response.status}`, response.status)
  }

  return response.text()
}

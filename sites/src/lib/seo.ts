import type { PublicBuildingDetail, PublicBuildingListItem } from '@/lib/api'
import { publicMediaUrl } from '@/lib/api'

export type SeoMeta = {
  title: string
  description: string
  canonical: string
  ogType: string
  ogImage?: string
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

const SITE_NAME = 'Dia de Imóveis'

export function siteBaseUrl(requestUrl?: URL): string {
  const configured = import.meta.env.PUBLIC_SITE_URL ?? 'http://www.localhost:4321'

  if (requestUrl) {
    return `${requestUrl.protocol}//${requestUrl.host}`
  }

  return configured.replace(/\/$/, '')
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength - 1).trim()}…`
}

function coverImageUrl(building: PublicBuildingListItem): string | undefined {
  if (!building.cover_image?.url) {
    return undefined
  }

  return publicMediaUrl(building.cover_image.url)
}

export function buildHomeSeo(baseUrl: string): SeoMeta {
  const canonical = `${baseUrl}/`

  return {
    title: `Lançamentos | ${SITE_NAME}`,
    description:
      'Explore empreendimentos publicados, compare valores a partir da unidade mais acessível e conheça cada projeto em detalhe.',
    canonical,
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: canonical,
      description:
        'Plataforma para descobrir lançamentos imobiliários com transparência e curadoria.',
    },
  }
}

export function buildBuildingSeo(building: PublicBuildingDetail, baseUrl: string): SeoMeta {
  const canonical = `${baseUrl}/empreendimentos/${building.slug}`
  const title = building.seo_title ?? `${building.name} | ${SITE_NAME}`
  const description = truncateText(
    building.seo_description ?? building.description ?? building.name,
    160,
  )
  const ogImage = coverImageUrl(building)

  return {
    title,
    description,
    canonical,
    ogType: 'article',
    ogImage,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: building.name,
      description,
      url: canonical,
      ...(building.city
        ? {
            address: {
              '@type': 'PostalAddress',
              addressLocality: building.city,
              addressRegion: building.state ?? undefined,
              addressCountry: 'BR',
            },
          }
        : {}),
      ...(ogImage ? { image: ogImage } : {}),
    },
  }
}

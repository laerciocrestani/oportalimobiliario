import type { PublicBuilderCatalogItem, PublicBuildingDetail } from '@/lib/api'
import type { SeoMeta } from '@/lib/seo'
import { siteBaseUrl } from '@/lib/seo'

const SITE_NAME = 'O Portal Imobiliário'

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength - 1).trim()}…`
}

export function modeloHomeSeo(requestUrl: URL): SeoMeta {
  const base = siteBaseUrl(requestUrl)

  return {
    title: `Lançamentos | ${SITE_NAME}`,
    description: 'Encontre o empreendimento e a unidade que cabem na sua busca.',
    canonical: `${base}/modelo`,
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: `${base}/modelo`,
      description: 'Encontre o empreendimento e a unidade que cabem na sua busca.',
    },
  }
}

export function modeloBuildersSeo(requestUrl: URL): SeoMeta {
  const base = siteBaseUrl(requestUrl)

  return {
    title: `Construtoras | ${SITE_NAME}`,
    description: 'Escolha a construtora para ver os empreendimentos e as unidades à venda.',
    canonical: `${base}/modelo/construtoras`,
    ogType: 'website',
  }
}

export function modeloBuilderSeo(builder: PublicBuilderCatalogItem, requestUrl: URL): SeoMeta {
  const base = siteBaseUrl(requestUrl)
  const place = builder.address ? ` em ${builder.address}` : ''

  return {
    title: `${builder.name} | ${SITE_NAME}`,
    description: truncate(`${builder.name}${place}.`, 160),
    canonical: `${base}/modelo/construtoras/${encodeURIComponent(builder.slug)}`,
    ogType: 'website',
  }
}

export function modeloBuildingSeo(building: PublicBuildingDetail, requestUrl: URL): SeoMeta {
  const base = siteBaseUrl(requestUrl)
  const place = [building.city, building.state].filter(Boolean).join(', ')
  const fallback = place ? `${building.name} em ${place}` : building.name
  const title = building.seo_title?.trim() || fallback
  const description = truncate(building.seo_description?.trim() || building.description?.trim() || fallback, 160)

  return {
    title,
    description,
    canonical: `${base}/modelo/empreendimentos/${building.slug}`,
    ogType: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: building.name,
      description,
      url: `${base}/modelo/empreendimentos/${building.slug}`,
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
    },
  }
}

export function modeloMessageSeo(requestUrl: URL, title: string, description: string): SeoMeta {
  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    canonical: `${siteBaseUrl(requestUrl)}${requestUrl.pathname}`,
    ogType: 'website',
  }
}

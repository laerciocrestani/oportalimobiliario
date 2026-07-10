import type { APIRoute } from 'astro'
import { PublicApiError, fetchSitemapXml } from '@/lib/api'

export const GET: APIRoute = async () => {
  try {
    const xml = await fetchSitemapXml()

    return new Response(xml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=UTF-8' },
    })
  } catch (error) {
    if (error instanceof PublicApiError && error.status === 404) {
      return new Response('Not Found', { status: 404 })
    }

    throw error
  }
}

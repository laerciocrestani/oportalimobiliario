import type { APIRoute } from 'astro'
import { PublicApiError, fetchRobotsTxt } from '@/lib/api'

export const GET: APIRoute = async () => {
  try {
    const text = await fetchRobotsTxt()

    return new Response(text, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=UTF-8' },
    })
  } catch (error) {
    if (error instanceof PublicApiError && error.status === 404) {
      return new Response('Not Found', { status: 404 })
    }

    throw error
  }
}

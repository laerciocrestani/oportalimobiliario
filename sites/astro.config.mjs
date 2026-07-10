import { defineConfig } from 'astro/config'
import cloudflare from '@astrojs/cloudflare'
import node from '@astrojs/node'

const apiBase = process.env.PUBLIC_API_BASE_URL ?? 'http://api.localhost:8000/api'
const siteUrl = process.env.PUBLIC_SITE_URL ?? 'http://www.localhost:4321'
const useNodeAdapter = process.env.ASTRO_ADAPTER === 'node'

export default defineConfig({
  output: 'server',
  adapter: useNodeAdapter
    ? node({ mode: 'standalone' })
    : cloudflare({
        platformProxy: {
          enabled: true,
        },
        imageService: 'passthrough',
      }),
  server: { port: 4321, host: true },
  vite: {
    server: {
      allowedHosts: ['localhost', '.localhost', 'www.localhost'],
    },
    define: {
      'import.meta.env.PUBLIC_API_BASE_URL': JSON.stringify(apiBase),
      'import.meta.env.PUBLIC_SITE_URL': JSON.stringify(siteUrl),
    },
  },
})

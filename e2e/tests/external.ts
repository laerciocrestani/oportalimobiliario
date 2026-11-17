import type { BrowserContext } from '@playwright/test'

const blockedHosts = ['api.bcb.gov.br', 'graph.facebook.com', 'api.zapsign.com.br']

export async function guardExternalCalls(context: BrowserContext): Promise<void> {
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())

    if (url.hostname === 'viacep.com.br') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cep: '01310-100',
          logradouro: 'Avenida Paulista',
          bairro: 'Bela Vista',
          localidade: 'São Paulo',
          uf: 'SP',
        }),
      })
      return
    }

    if (blockedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
      await route.abort('blockedbyclient')
      return
    }

    await route.continue()
  })
}

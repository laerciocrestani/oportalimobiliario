import { expect, test } from '@playwright/test'
import { e2ePorts } from '../ports'
import { guardExternalCalls } from './external'

test('visitante vê o empreendimento publicado', async ({ page, context }) => {
  await guardExternalCalls(context)

  await page.goto(`http://www.localhost:${e2ePorts.astro}/`)
  await expect(page.getByRole('heading', { name: 'Residencial E2E' })).toBeVisible()

  await page.getByRole('link', { name: /Residencial E2E/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Residencial E2E' })).toBeVisible()
  await expect(page.getByText('São Paulo / SP')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Unidades disponíveis' })).toBeVisible()
  await expect(page.getByText('101')).toBeVisible()
})

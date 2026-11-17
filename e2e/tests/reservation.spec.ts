import { expect, type Page, test } from '@playwright/test'
import { e2ePorts } from '../ports'
import { guardExternalCalls } from './external'

const buyerName = 'Maria Silva'

async function login(page: Page, origin: string, email: string): Promise<void> {
  await page.goto(`${origin}/login`)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('password')
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test('corretor envia a proposta e a construtora aceita', async ({ browser }) => {
  const broker = await browser.newContext()
  const builder = await browser.newContext()
  await guardExternalCalls(broker)
  await guardExternalCalls(builder)

  const brokerPage = await broker.newPage()
  const builderPage = await builder.newPage()

  await login(brokerPage, `http://corretor.localhost:${e2ePorts.vite}`, 'corretor@e2e.test')
  await brokerPage.getByRole('link', { name: 'Empreendimentos' }).click()
  await brokerPage.getByRole('button', { name: /Residencial E2E/ }).click()
  const units = brokerPage.getByRole('dialog', { name: 'Residencial E2E' })
  await units.getByRole('button', { name: /1º andar/ }).click()
  await units.getByRole('button', { name: 'Reservar' }).click()

  const proposal = brokerPage.getByRole('dialog', { name: 'Proposta' })
  await expect(proposal).toBeVisible()
  await proposal.locator('#party-document').fill('52998224725')
  await proposal.locator('#buyer-name').fill(buyerName)
  await proposal.locator('#buyer-phone').fill('11987654321')
  await proposal.locator('#party-rg').fill('1234567')
  await proposal.locator('#party-marital').click()
  await brokerPage.getByRole('option', { name: 'Solteiro(a)' }).click()
  await proposal.locator('#party-profession').fill('Arquiteta')
  await proposal.locator('#party-zip').fill('01310100')
  await expect(proposal.locator('#party-city')).toHaveValue('São Paulo')
  await expect(proposal.locator('#party-state')).toHaveValue('SP')
  await expect(proposal.locator('#party-address')).toHaveValue('Avenida Paulista')
  await proposal.getByLabel('Descreva as condições de pagamento *').fill('Entrada de R$ 50.000 e saldo em 24 parcelas.')
  await proposal.getByRole('button', { name: 'Enviar proposta' }).click()
  await expect(brokerPage.getByText('Reserva feita com sucesso')).toBeVisible()
  await expect(proposal).toBeHidden()

  await login(builderPage, `http://construtora.localhost:${e2ePorts.vite}`, 'construtora@e2e.test')
  await builderPage.getByRole('link', { name: 'Reservas' }).click()

  const review = builderPage.getByRole('region', { name: 'Proposta em análise' })
  await review.getByRole('button', { name: /Abrir andamento/ }).click()

  const progress = builderPage.getByRole('dialog', { name: 'Andamento da reserva' })
  await progress.getByRole('button', { name: 'Aceitar', exact: true }).click()
  const accept = builderPage.getByRole('dialog', { name: 'Aceitar proposta' })
  await accept.getByRole('button', { name: 'Aceitar' }).click()
  await expect(progress).toContainText('Aguardando assinaturas')
  await expect(progress).toContainText(buyerName)
  await progress.getByRole('button', { name: 'Fechar' }).click()
  await expect(progress).toBeHidden()
  await builderPage.reload()

  const signing = builderPage.getByRole('region', { name: 'Aguardando assinaturas' })
  await expect(signing.getByRole('button', { name: /Abrir andamento/ })).toBeVisible()

  await brokerPage.getByRole('link', { name: 'Reservas' }).click()
  const brokerSigning = brokerPage.getByRole('region', { name: 'Aguardando assinaturas' })
  await brokerSigning.getByRole('button', { name: /Abrir andamento/ }).click()
  const brokerProgress = brokerPage.getByRole('dialog', { name: 'Andamento da reserva' })
  await expect(brokerProgress).toContainText('Aguardando assinaturas')
  await expect(brokerProgress).toContainText(buyerName)

  await broker.close()
  await builder.close()
})

import { test, expect } from '@playwright/test'

// These tests require the dev server running (npm run dev) and a Supabase
// database with at least one live contract. The UI defaults to Spanish.
// Run with: npx playwright test tests/e2e/markets.spec.ts

async function openFirstOffer(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.locator('article h3 a').first().click()
  await page.waitForURL(/\/markets\//)
}

test('contract detail is a single-page checkout', async ({ page }) => {
  await openFirstOffer(page)
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cuándo te pagamos' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Periodo de protección' })).toBeVisible()
  await expect(page.getByText('Pagas hoy')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Proteger/ })).toBeVisible()
  // Providing capital is a quiet link, not an equal button; there's no drawer.
  await expect(page.getByRole('link', { name: /Aportar capital a esta protección/ })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('signed-out buyers go to sign-up with what they were buying', async ({ page }) => {
  await openFirstOffer(page)
  await page.getByRole('button', { name: /^Proteger/ }).click()
  await page.waitForURL(/\/auth\/signup/)
  await expect(page.getByText('Vas a proteger')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Crear cuenta y continuar' })).toBeDisabled()
  await page.getByRole('checkbox').check()
  await expect(page.getByRole('button', { name: 'Crear cuenta y continuar' })).toBeEnabled()
})

import { test, expect } from '@playwright/test'

test('home loads calm, in Spanish, with the city switch', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.getByRole('link', { name: 'Iniciar sesión' }).first()).toBeVisible()
  await expect(page.getByRole('group', { name: 'Ciudad' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ciudad de Guatemala' })).toBeVisible()
  await expect(page.getByText(/Total Volume|Trending|Buy now/)).toHaveCount(0)
})

test('the language toggle switches to English and back', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'English' }).first().click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.getByRole('button', { name: 'Español' }).first().click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
})

test('login page renders the form', async ({ page }) => {
  await page.goto('/auth/login')
  await expect(page.getByLabel('Correo')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
})

test('signup page renders the form', async ({ page }) => {
  await page.goto('/auth/signup')
  await expect(page.getByLabel('Nombre')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Crear cuenta' })).toBeVisible()
})

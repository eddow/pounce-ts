import { test, expect } from '@playwright/test'

test.describe('Main demo components', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
		await page.waitForSelector('#app .counter-text')
	})

	test('counter component renders shared state snapshot', async ({ page }) => {
		await expect(page.locator('#app')).toContainText('Counter Component (JSX)')

		const counterText = page.locator('#app .counter-text')
		await expect(counterText).toHaveText('5')

		const sharedInput = page.locator('#app input[type="number"]').first()
		await expect(sharedInput).toHaveValue('5')

		const slider = page.locator('#app .slider')
		await expect(slider).toBeVisible()
	})

	test('todo workflow adds items', async ({ page }) => {
		const todoInput = page.locator('#app .todo-input')
		await todoInput.fill('Write Playwright tests')
		await expect(todoInput).toHaveValue('Write Playwright tests')
		await page.locator('#app .add-button').click()
		await expect(todoInput).toHaveValue('')

		const todoItems = page.locator('#app .todo-item')
		await expect(todoItems).toHaveCount(1)
		await expect(todoItems.first().locator('.todo-text')).toHaveText('Write Playwright tests')
	})
})


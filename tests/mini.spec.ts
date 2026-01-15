import { test, expect } from '@playwright/test'

test.describe('Mini demo', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
	})

	test('mini counter adds and clears items', async ({ page }) => {
		const miniRoot = page.locator('#mini')
		await expect(miniRoot).toBeVisible()

		const miniInput = miniRoot.locator('input[type="text"]')
		await expect(miniInput).toBeVisible()

		const firstValue = await miniInput.inputValue()
		await miniRoot.locator('button.add').click()

		// List items are rendered as buttons with class "remove"
		const listItems = miniRoot.locator('button.remove')
		await expect(listItems).toHaveCount(1)
		await expect(listItems.first()).toContainText(firstValue)

		await miniInput.fill('Custom entry')
		await miniRoot.locator('button.add').click()
		await expect(listItems).toHaveCount(2)
		await expect(listItems.nth(1)).toContainText('Custom entry')

		const removeAllButton = miniRoot.locator('button.remove-all')
		await expect(removeAllButton).toBeVisible()
		await removeAllButton.click()
		// Wait a moment for reactivity to process
		await page.waitForTimeout(100)
		// After clearing, the display updates and button hides
		await expect(removeAllButton).toBeHidden()
		// All list items should be removed
		await expect(listItems).toHaveCount(0)
	})

	test('resize sandbox renders helper copy', async ({ page }) => {
		const resizeSection = page.locator('#mini').locator('text=Resize me')
		await expect(resizeSection).toBeVisible()
		await expect(page.locator('#mini')).toContainText('Resize Sandbox')
	})
})



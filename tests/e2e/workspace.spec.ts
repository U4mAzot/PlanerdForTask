import { test, expect } from "./fixtures"

test.describe("Workspace", () => {
  test("workspace home loads and shows workspace name", async ({ page, workspaceSlug, workspaceName }) => {
    await page.goto(`/${workspaceSlug}`)
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(workspaceName).first()).toBeVisible({ timeout: 8_000 })
  })

  test("sidebar navigation links are visible", async ({ page, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}`)
    await expect(page.getByRole("link", { name: /home/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /team/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /settings/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /journal/i })).toBeVisible()
  })

  test("settings page loads", async ({ page, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/settings`)
    await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible()
    await expect(page.getByText(/general/i)).toBeVisible()
  })

  test("team page loads and shows OWNER", async ({ page, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/team`)
    await expect(page.getByRole("heading", { name: /team/i })).toBeVisible()
    await expect(page.getByText("OWNER")).toBeVisible()
  })

  test("journal page loads", async ({ page, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/journal`)
    // h1 is "AI Dev Journal" — match it exactly at level 1
    await expect(page.getByRole("heading", { name: "AI Dev Journal", level: 1 })).toBeVisible()
  })

  test("can generate an API key in settings", async ({ page, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/settings`)
    await page.getByPlaceholder(/key name/i).fill("Claude Code")
    await page.getByRole("button", { name: /generate/i }).click()
    // Key is shown in a .font-mono paragraph — more specific than getByText(/kc_/) which also matches the snippet pre
    await expect(page.locator("p.font-mono").filter({ hasText: /kc_/ }).first()).toBeVisible({ timeout: 5_000 })
  })
})

import { test, expect } from "@playwright/test"

// Run without saved session — these test the public auth pages
test.use({ storageState: { cookies: [], origins: [] } })

test.describe("Auth flows", () => {
  test("unauthenticated user redirected to login", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })

  test("login page renders form", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible()
    await expect(page.locator("#email")).toBeVisible()
    await expect(page.locator("#password")).toBeVisible()
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
  })

  test("register page renders form", async ({ page }) => {
    await page.goto("/register")
    await expect(page.getByRole("heading", { name: /create an account/i })).toBeVisible()
    await expect(page.locator("#name")).toBeVisible()
    await expect(page.locator("#email")).toBeVisible()
    await expect(page.locator("#password")).toBeVisible()
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible()
  })

  test("login with wrong password shows error", async ({ page }) => {
    await page.goto("/login")
    await page.locator("#email").fill("nobody@notreal.com")
    await page.locator("#password").fill("wrongpassword123")
    await page.getByRole("button", { name: "Sign in" }).click()
    await page.waitForTimeout(2000)
    // Stays on login or shows an error
    const staysOnLogin = page.url().includes("/login")
    const showsError = (await page.getByText(/invalid|incorrect|error/i).count()) > 0
    expect(staysOnLogin || showsError).toBe(true)
  })

  test("sign up link on login page navigates to register", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("link", { name: /sign up/i }).click()
    await expect(page).toHaveURL(/\/register/)
  })

  test("sign in link on register page navigates to login", async ({ page }) => {
    await page.goto("/register")
    await page.getByRole("link", { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})

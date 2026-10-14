import { Page } from "@playwright/test"

export const TEST_USER_PASSWORD = "TestPass99!"

/** Called once from global setup — returns the actual created slug. */
export async function registerLoginCreateWorkspace(page: Page) {
  const runId = Date.now().toString().slice(-8)
  const email = `e2e_${runId}@kindcode.test`
  const name = `E2E User ${runId}`
  const workspaceName = `E2E Workspace ${runId}`
  const workspaceSlug = `e2e-ws-${runId}`

  // 1. Register
  await page.goto("/register")
  await page.locator("#name").fill(name)
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(TEST_USER_PASSWORD)
  await page.getByRole("button", { name: "Create account" }).click()

  // Register redirects to /login
  await page.waitForURL("**/login", { timeout: 10_000 })

  // 2. Sign in
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(TEST_USER_PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()

  // Redirects to / → onboarding (new user, no workspace)
  await page.waitForURL("**/onboarding", { timeout: 10_000 })

  // 3. Create workspace
  await page.locator("#ws-name").fill(workspaceName)
  await page.locator("#ws-slug").clear()
  await page.locator("#ws-slug").fill(workspaceSlug)
  await page.getByRole("button", { name: "Create workspace" }).click()

  await page.waitForURL(`**/${workspaceSlug}**`, { timeout: 10_000 })

  return { email, name, workspaceName, workspaceSlug }
}

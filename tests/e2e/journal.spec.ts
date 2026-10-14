import { test, expect } from "./fixtures"

test.describe("AI Journal", () => {
  test("journal page renders empty state or add-entry button", async ({ page, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/journal`)
    // h1 heading is exactly "AI Dev Journal"
    await expect(page.getByRole("heading", { name: "AI Dev Journal", level: 1 })).toBeVisible({ timeout: 8_000 })
    const hasEmpty = await page.getByText(/no journal entries/i).isVisible()
    const hasAddBtn = await page.getByRole("button", { name: /add entry/i }).isVisible()
    expect(hasEmpty || hasAddBtn).toBe(true)
  })

  test("can add a journal entry manually", async ({ page, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/journal`)

    await page.getByRole("button", { name: /add entry|add first entry/i }).first().click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 3_000 })

    const entryTitle = `Session ${Date.now().toString().slice(-6)}`

    // Use exact placeholder text for reliable targeting of React-controlled inputs
    await dialog.getByPlaceholder(/e\.g\. Added settings page/i).fill(entryTitle)
    await dialog.getByPlaceholder(/Describe what was built/i).fill(
      "Built the AI journal feature and added API key management."
    )
    await dialog.getByPlaceholder(/e\.g\. Claude Sonnet/i).fill("Claude Sonnet 4.6")
    await dialog.getByPlaceholder(/feature.*bugfix/i).fill("feature, test")

    await dialog.getByRole("button", { name: /add entry/i }).last().click()
    // Wait for toast + router.refresh to bring entry into view
    await page.waitForTimeout(1500)

    await expect(page.getByText(entryTitle)).toBeVisible({ timeout: 6_000 })
  })

  test("can post to journal via API key", async ({ page, request, workspaceSlug }) => {
    // Get workspace ID from the settings page
    await page.goto(`/${workspaceSlug}/settings`)
    await page.waitForLoadState("networkidle")

    const workspaceId = await page.locator("p.font-mono, span.font-mono").first().textContent()
    if (!workspaceId) return

    // Generate an API key
    await page.getByPlaceholder(/key name/i).fill("API Test Key")
    await page.getByRole("button", { name: /generate/i }).click()

    // Full key is shown once in the "Copy your API key" dialog (div.font-mono, not the hint p.font-mono)
    const keyDialog = page.getByRole("dialog").filter({ hasText: "Copy your API key" })
    await expect(keyDialog).toBeVisible({ timeout: 5_000 })
    const rawKeyText = await keyDialog.locator("div.font-mono").textContent()
    if (!rawKeyText) return
    // Extract only the kc_ token in case there is surrounding whitespace
    const match = rawKeyText.match(/kc_[A-Za-z0-9_-]+/)
    if (!match) return
    const apiKey = match[0]
    // Close the dialog before navigating
    await keyDialog.getByRole("button", { name: /copy and close/i }).click()

    // POST directly to the journal API
    const entryTitle = `API entry ${Date.now().toString().slice(-6)}`
    const res = await request.post(
      `http://localhost:3000/api/workspaces/${workspaceId.trim()}/journal`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        data: {
          title: entryTitle,
          content: "Posted via API key — simulating an AI agent end-of-session log.",
          aiModel: "Claude Sonnet 4.6",
          tags: ["test", "api"],
        },
      }
    )

    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.title).toBe(entryTitle)

    // Verify the entry appears in the journal UI
    await page.goto(`/${workspaceSlug}/journal`)
    await expect(page.getByText(entryTitle)).toBeVisible({ timeout: 5_000 })
  })
})

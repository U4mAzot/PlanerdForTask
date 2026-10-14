import { test, expect } from "./fixtures"
import fs from "fs"
import path from "path"

const BOARD_FILE = path.join(__dirname, ".auth/board.json")
let boardUrl = ""

test.describe("Board", () => {
  test("can create a new board via sidebar", async ({ page, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}`)
    await page.waitForLoadState("networkidle")

    // Click the "New board" text button (shown when workspace has no boards)
    // or the small + button next to the BOARDS heading
    const newBoardText = page.getByRole("button", { name: "New board" })
    const newBoardPlus = page.locator("aside").getByRole("button").filter({
      has: page.locator("svg"),
    }).last() // the + next to "BOARDS"

    const isTextVisible = await newBoardText.isVisible({ timeout: 3_000 }).catch(() => false)
    if (isTextVisible) {
      await newBoardText.click()
    } else {
      await newBoardPlus.click()
    }

    // Dialog: "Create board"
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 })
    await page.locator("#board-name").fill("My Test Board")
    await page.getByRole("button", { name: "Create" }).click()

    await page.waitForURL(/\/board\//, { timeout: 10_000 })
    boardUrl = page.url()
    fs.writeFileSync(BOARD_FILE, JSON.stringify({ url: boardUrl }), "utf8")

    await expect(page.getByRole("heading", { name: "My Test Board" })).toBeVisible()
  })

  test("board shows default groups (To Do, In Progress, Done)", async ({ page }) => {
    if (!boardUrl) boardUrl = JSON.parse(fs.readFileSync(BOARD_FILE, "utf8")).url
    await page.goto(boardUrl)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.getByText("To Do")).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText("In Progress")).toBeVisible()
    await expect(page.getByText("Done")).toBeVisible()
  })

  test("can add a new group", async ({ page }) => {
    if (!boardUrl) boardUrl = JSON.parse(fs.readFileSync(BOARD_FILE, "utf8")).url
    await page.goto(boardUrl)

    // "Add group" button is on the board view
    await page.getByRole("button", { name: /add group/i }).click({ timeout: 8_000 })

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("textbox").first().fill("My New Group")
    await dialog.getByRole("button", { name: /add|create/i }).click()

    await expect(page.getByText("My New Group")).toBeVisible({ timeout: 5_000 })
  })

  test("can add an item to a group", async ({ page }) => {
    if (!boardUrl) boardUrl = JSON.parse(fs.readFileSync(BOARD_FILE, "utf8")).url
    await page.goto(boardUrl)
    await page.waitForLoadState("domcontentloaded")

    // Click "Add item" in the first group row
    await page.getByRole("button", { name: /add item/i }).first().click({ timeout: 8_000 })

    // Could be inline input or dialog
    const inlineInput = page.getByPlaceholder(/item name|task name|new item/i)
    const isInline = await inlineInput.isVisible({ timeout: 2_000 }).catch(() => false)

    if (isInline) {
      await inlineInput.fill("My New Task")
      await inlineInput.press("Enter")
    } else {
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible()
      await dialog.getByRole("textbox").first().fill("My New Task")
      await dialog.getByRole("button", { name: /add|create/i }).click()
    }

    await expect(page.getByText("My New Task")).toBeVisible({ timeout: 5_000 })
  })

  test("board switches to kanban view", async ({ page }) => {
    if (!boardUrl) boardUrl = JSON.parse(fs.readFileSync(BOARD_FILE, "utf8")).url
    await page.goto(boardUrl)

    // Kanban view toggle is a TabsTrigger (renders as a tab role)
    await page.getByRole("tab", { name: /kanban/i }).click({ timeout: 8_000 })
    await expect(page.getByText(/to do|in progress|done/i).first()).toBeVisible({ timeout: 5_000 })
  })
})

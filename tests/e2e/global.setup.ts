import { test as setup, expect } from "@playwright/test"
import { registerLoginCreateWorkspace } from "./helpers"
import fs from "fs"
import path from "path"

const AUTH_FILE = path.join(__dirname, ".auth/user.json")
const WS_FILE = path.join(__dirname, ".auth/workspace.json")

setup("register, login, create workspace, save auth state", async ({ page }) => {
  const { workspaceSlug, workspaceName } = await registerLoginCreateWorkspace(page)

  await expect(page).toHaveURL(new RegExp(workspaceSlug), { timeout: 8_000 })

  // Persist workspace data so chromium tests can read it
  fs.writeFileSync(WS_FILE, JSON.stringify({ slug: workspaceSlug, name: workspaceName }), "utf8")

  await page.context().storageState({ path: AUTH_FILE })
})

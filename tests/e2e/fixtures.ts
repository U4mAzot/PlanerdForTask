import { test as base, expect } from "@playwright/test"
import fs from "fs"
import path from "path"

const WS_FILE = path.join(__dirname, ".auth/workspace.json")

type TestFixtures = {
  workspaceSlug: string
  workspaceName: string
}

export const test = base.extend<TestFixtures>({
  workspaceSlug: async ({}, use) => {
    const data = JSON.parse(fs.readFileSync(WS_FILE, "utf8"))
    await use(data.slug as string)
  },
  workspaceName: async ({}, use) => {
    const data = JSON.parse(fs.readFileSync(WS_FILE, "utf8"))
    await use(data.name as string)
  },
})

export { expect }

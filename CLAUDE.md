@AGENTS.md

# KindCode AI Journal

At the end of every work session, post a journal entry summarizing what was done.

## How to post

```
POST http://localhost:3000/api/workspaces/WORKSPACE_ID/journal
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "title": "<one-line summary of what was done today>",
  "content": "<detailed notes: features added, bugs fixed, decisions made, files changed>",
  "aiModel": "Claude Sonnet 4.6",
  "tags": ["feature", "bugfix", "refactor"]
}
```

**Setup:** Go to Settings → AI Journal API Keys in your KindCode workspace, generate a key, and replace `WORKSPACE_ID` and `YOUR_API_KEY` above.

## When to post

- After completing a task or a set of related changes
- Before ending a work session
- When something significant was fixed or built

## What to include in content

- What features were added or changed
- What bugs were fixed and why they occurred
- Files that were created or significantly modified
- Any important decisions or trade-offs made

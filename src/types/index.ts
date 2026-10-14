import type {
  User,
  Workspace,
  WorkspaceMember,
  Board,
  BoardColumn,
  ItemGroup,
  Item,
  ItemColumnValue,
  ItemAssignee,
  Comment,
} from "@/generated/prisma/client"

export type {
  User,
  Workspace,
  WorkspaceMember,
  Board,
  BoardColumn,
  ItemGroup,
  Item,
  ItemColumnValue,
  ItemAssignee,
  Comment,
}

export type { WorkspaceRole, ColumnType } from "@/generated/prisma/enums"

export type WorkspaceMemberWithUser = WorkspaceMember & { user: User }

export type BoardWithDetails = Board & {
  columns: BoardColumn[]
  groups: (ItemGroup & {
    items: (Item & {
      columnValues: ItemColumnValue[]
      assignees: (ItemAssignee & { user: User })[]
      subItems: (Item & {
        columnValues: ItemColumnValue[]
        assignees: (ItemAssignee & { user: User })[]
      })[]
    })[]
  })[]
}

export type StatusOption = { label: string; color: string }

export type ColumnSettings = {
  statusOptions?: StatusOption[]
}

export type ItemWithDetails = Item & {
  columnValues: ItemColumnValue[]
  assignees: (ItemAssignee & { user: User })[]
  comments: (Comment & { user: User })[]
  subItems: Item[]
}

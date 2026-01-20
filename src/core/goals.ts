import type { Goal, GoalStatus, GoalType, GoalFrequency, Locale } from "../types.js"
import { readGoals, writeGoals, appendSessionLog } from "../storage/file-io.js"
import { t } from "../i18n/index.js"
import { calculateNextCheckIn } from "./scheduling.js"

export interface AddGoalInput {
  title: string
  type: GoalType
  frequency: GoalFrequency
  target: number
  unit: string
  why: string
  description?: string
  identity?: string
  parentId?: string
  tags?: string[]
  prerequisites?: string[]
}

function generateId(title: string, parentId?: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30)

  if (parentId) {
    return `${parentId}/${slug}`
  }
  return slug
}

export async function addGoal(
  basePath: string,
  userId: string,
  input: AddGoalInput,
  defaultCheckInInterval: number,
  locale: Locale
): Promise<{ success: boolean; message: string; goal?: Goal }> {
  const data = await readGoals(basePath, userId)

  const id = generateId(input.title, input.parentId)

  const existing = data.goals.find((g) => g.id === id)
  if (existing) {
    return {
      success: false,
      message: t(locale, "goals.alreadyExists", { id }),
    }
  }

  const hasPrerequisites = input.prerequisites && input.prerequisites.length > 0
  const status: GoalStatus = hasPrerequisites ? "locked" : "active"

  const now = new Date().toISOString()
  const goal: Goal = {
    id,
    title: input.title,
    description: input.description,
    why: input.why,
    identity: input.identity,
    parentId: input.parentId,
    children: [],
    type: input.type,
    frequency: input.frequency,
    target: input.target,
    unit: input.unit,
    status,
    progress: 0,
    maturity: 0,
    prerequisites: input.prerequisites || [],
    unlocks: [],
    checkInInterval: defaultCheckInInterval,
    nextCheckIn: calculateNextCheckIn(now, defaultCheckInInterval, 0),
    owner: userId,
    tags: input.tags || [],
    createdAt: now,
    updatedAt: now,
  }

  data.goals.push(goal)

  if (input.parentId) {
    const parent = data.goals.find((g) => g.id === input.parentId)
    if (parent) {
      parent.children = parent.children || []
      if (!parent.children.includes(id)) {
        parent.children.push(id)
      }
    }
  }

  if (input.prerequisites) {
    for (const prereqId of input.prerequisites) {
      const prereq = data.goals.find((g) => g.id === prereqId)
      if (prereq) {
        prereq.unlocks = prereq.unlocks || []
        if (!prereq.unlocks.includes(id)) {
          prereq.unlocks.push(id)
        }
      }
    }
  }

  await writeGoals(basePath, userId, data)

  await appendSessionLog(basePath, userId, {
    ts: now,
    action: "add_goal",
    goalId: id,
    data: { title: input.title, type: input.type },
  })

  return {
    success: true,
    message: t(locale, "goals.created", { title: input.title }),
    goal,
  }
}

export async function getGoal(
  basePath: string,
  userId: string,
  goalId: string,
  locale: Locale
): Promise<{ success: boolean; message: string; goal?: Goal }> {
  const data = await readGoals(basePath, userId)
  const goal = data.goals.find((g) => g.id === goalId)

  if (!goal) {
    return {
      success: false,
      message: t(locale, "goals.notFound", { id: goalId }),
    }
  }

  return { success: true, message: "", goal }
}

export async function listGoals(
  basePath: string,
  userId: string,
  filters: {
    status?: GoalStatus | "all"
    tags?: string[]
    parentId?: string
  },
  locale: Locale
): Promise<{ success: boolean; message: string; goals: Goal[] }> {
  const data = await readGoals(basePath, userId)
  let goals = data.goals

  if (filters.status && filters.status !== "all") {
    goals = goals.filter((g) => g.status === filters.status)
  }

  if (filters.tags && filters.tags.length > 0) {
    goals = goals.filter((g) => filters.tags!.some((tag) => g.tags.includes(tag)))
  }

  if (filters.parentId) {
    goals = goals.filter((g) => g.parentId === filters.parentId)
  }

  if (goals.length === 0) {
    return {
      success: true,
      message: t(locale, "goals.listEmpty"),
      goals: [],
    }
  }

  return {
    success: true,
    message: t(locale, "goals.listHeader", { count: goals.length }),
    goals,
  }
}

export async function updateGoal(
  basePath: string,
  userId: string,
  goalId: string,
  updates: Partial<Pick<Goal, "title" | "description" | "why" | "identity" | "target" | "unit" | "status" | "tags">>,
  locale: Locale
): Promise<{ success: boolean; message: string; goal?: Goal }> {
  const data = await readGoals(basePath, userId)
  const goalIndex = data.goals.findIndex((g) => g.id === goalId)

  if (goalIndex === -1) {
    return {
      success: false,
      message: t(locale, "goals.notFound", { id: goalId }),
    }
  }

  const goal = data.goals[goalIndex]
  const now = new Date().toISOString()

  Object.assign(goal, updates, { updatedAt: now })

  await writeGoals(basePath, userId, data)

  await appendSessionLog(basePath, userId, {
    ts: now,
    action: "update_goal",
    goalId,
    data: updates,
  })

  return {
    success: true,
    message: t(locale, "goals.updated", { title: goal.title }),
    goal,
  }
}

export async function deleteGoal(
  basePath: string,
  userId: string,
  goalId: string,
  locale: Locale
): Promise<{ success: boolean; message: string }> {
  const data = await readGoals(basePath, userId)
  const goalIndex = data.goals.findIndex((g) => g.id === goalId)

  if (goalIndex === -1) {
    return {
      success: false,
      message: t(locale, "goals.notFound", { id: goalId }),
    }
  }

  const goal = data.goals[goalIndex]

  for (const other of data.goals) {
    if (other.children?.includes(goalId)) {
      other.children = other.children.filter((id) => id !== goalId)
    }
    if (other.prerequisites?.includes(goalId)) {
      other.prerequisites = other.prerequisites.filter((id) => id !== goalId)
    }
    if (other.unlocks?.includes(goalId)) {
      other.unlocks = other.unlocks.filter((id) => id !== goalId)
    }
  }

  data.goals.splice(goalIndex, 1)

  await writeGoals(basePath, userId, data)

  await appendSessionLog(basePath, userId, {
    ts: new Date().toISOString(),
    action: "delete_goal",
    goalId,
    data: { title: goal.title },
  })

  return {
    success: true,
    message: t(locale, "goals.deleted", { title: goal.title }),
  }
}

export async function getNextGoalNeedingAttention(
  basePath: string,
  userId: string,
  locale: Locale
): Promise<{ success: boolean; message: string; goal?: Goal }> {
  const data = await readGoals(basePath, userId)
  const now = new Date().toISOString()

  const activeGoals = data.goals.filter((g) => g.status === "active")

  const needsAttention = activeGoals
    .filter((g) => !g.nextCheckIn || g.nextCheckIn <= now)
    .sort((a, b) => {
      const aDate = a.nextCheckIn || a.createdAt
      const bDate = b.nextCheckIn || b.createdAt
      return aDate.localeCompare(bDate)
    })

  if (needsAttention.length === 0) {
    return {
      success: true,
      message: t(locale, "goals.noGoalsNeedAttention"),
    }
  }

  const goal = needsAttention[0]
  return {
    success: true,
    message: t(locale, "goals.nextGoal", { title: goal.title }),
    goal,
  }
}

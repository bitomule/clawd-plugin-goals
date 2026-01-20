import type { Goal, Locale } from "../types.js"
import { readGoals, writeGoals, appendSessionLog } from "../storage/file-io.js"
import { t } from "../i18n/index.js"
import { checkAndUnlockAfterAchievement } from "./unlock.js"

export async function markGoalAchieved(
  basePath: string,
  userId: string,
  goalId: string,
  locale: Locale
): Promise<{ success: boolean; message: string; goal?: Goal; unlockedGoals: Goal[] }> {
  const data = await readGoals(basePath, userId)
  const goal = data.goals.find((g) => g.id === goalId)

  if (!goal) {
    return {
      success: false,
      message: t(locale, "goals.notFound", { id: goalId }),
      unlockedGoals: [],
    }
  }

  const now = new Date().toISOString()
  goal.status = "achieved"
  goal.progress = 100
  goal.updatedAt = now

  await writeGoals(basePath, userId, data)

  await appendSessionLog(basePath, userId, {
    ts: now,
    action: "achieved",
    goalId: goal.id,
    data: {},
  })

  const unlockedGoals = await checkAndUnlockAfterAchievement(basePath, userId, goalId, locale)

  let message = t(locale, "goals.achieved", { title: goal.title })
  if (unlockedGoals.length > 0) {
    const titles = unlockedGoals.map((g) => g.title).join(", ")
    message += "\n" + t(locale, "goals.unlocked", { titles })
  }

  return {
    success: true,
    message,
    goal,
    unlockedGoals,
  }
}

export async function getChildGoals(
  basePath: string,
  userId: string,
  parentId: string
): Promise<Goal[]> {
  const data = await readGoals(basePath, userId)
  return data.goals.filter((g) => g.parentId === parentId)
}

export async function getParentGoal(
  basePath: string,
  userId: string,
  childId: string
): Promise<Goal | undefined> {
  const data = await readGoals(basePath, userId)
  const child = data.goals.find((g) => g.id === childId)

  if (!child || !child.parentId) {
    return undefined
  }

  return data.goals.find((g) => g.id === child.parentId)
}

export async function calculateParentProgress(
  basePath: string,
  userId: string,
  parentId: string
): Promise<number> {
  const children = await getChildGoals(basePath, userId, parentId)

  if (children.length === 0) {
    return 0
  }

  const achievedCount = children.filter((c) => c.status === "achieved").length
  return Math.round((achievedCount / children.length) * 100)
}

export async function updateParentProgress(
  basePath: string,
  userId: string,
  childId: string
): Promise<void> {
  const data = await readGoals(basePath, userId)
  const child = data.goals.find((g) => g.id === childId)

  if (!child || !child.parentId) {
    return
  }

  const parent = data.goals.find((g) => g.id === child.parentId)
  if (!parent) {
    return
  }

  const progress = await calculateParentProgress(basePath, userId, parent.id)
  parent.progress = progress
  parent.updatedAt = new Date().toISOString()

  await writeGoals(basePath, userId, data)
}

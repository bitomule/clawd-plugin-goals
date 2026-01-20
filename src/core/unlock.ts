import type { Goal, Locale } from "../types.js"
import { readGoals, writeGoals, appendSessionLog } from "../storage/file-io.js"
import { t } from "../i18n/index.js"

function canUnlock(goal: Goal, allGoals: Goal[]): boolean {
  if (goal.status !== "locked") return false
  if (!goal.prerequisites || goal.prerequisites.length === 0) return true

  return goal.prerequisites.every((prereqId) => {
    const prereq = allGoals.find((g) => g.id === prereqId)
    return prereq && prereq.status === "achieved"
  })
}

export async function unlockReadyGoals(
  basePath: string,
  userId: string,
  locale: Locale
): Promise<{ success: boolean; message: string; unlocked: Goal[] }> {
  const data = await readGoals(basePath, userId)
  const now = new Date().toISOString()

  const toUnlock = data.goals.filter((g) => canUnlock(g, data.goals))

  if (toUnlock.length === 0) {
    return {
      success: true,
      message: t(locale, "goals.noGoalsToUnlock"),
      unlocked: [],
    }
  }

  for (const goal of toUnlock) {
    goal.status = "available"
    goal.updatedAt = now

    await appendSessionLog(basePath, userId, {
      ts: now,
      action: "unlock",
      goalId: goal.id,
      data: {},
    })
  }

  await writeGoals(basePath, userId, data)

  const titles = toUnlock.map((g) => g.title).join(", ")
  return {
    success: true,
    message: t(locale, "goals.unlocked", { titles }),
    unlocked: toUnlock,
  }
}

export async function checkAndUnlockAfterAchievement(
  basePath: string,
  userId: string,
  achievedGoalId: string,
  locale: Locale
): Promise<Goal[]> {
  const data = await readGoals(basePath, userId)
  const achievedGoal = data.goals.find((g) => g.id === achievedGoalId)

  if (!achievedGoal || !achievedGoal.unlocks || achievedGoal.unlocks.length === 0) {
    return []
  }

  const potentialUnlocks = data.goals.filter(
    (g) => achievedGoal.unlocks!.includes(g.id) && g.status === "locked"
  )

  const toUnlock = potentialUnlocks.filter((g) => canUnlock(g, data.goals))

  if (toUnlock.length === 0) {
    return []
  }

  const now = new Date().toISOString()
  for (const goal of toUnlock) {
    goal.status = "available"
    goal.updatedAt = now

    await appendSessionLog(basePath, userId, {
      ts: now,
      action: "unlock",
      goalId: goal.id,
      data: { triggeredBy: achievedGoalId },
    })
  }

  await writeGoals(basePath, userId, data)

  return toUnlock
}

import type { Goal, Review } from "../types.js"
import { readGoals, readReviews } from "../storage/file-io.js"

export interface TargetSuggestion {
  goalId: string
  goalTitle: string
  currentTarget: number
  suggestedTarget: number
  unit: string
  reason: string
  direction: "increase" | "decrease"
}

function analyzeRecentPerformance(
  reviews: Review[],
  goalId: string,
  weeks: number = 4
): { exceeding: number; onTrack: number; struggling: number; slow: number } {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - weeks * 7)
  const cutoffStr = cutoffDate.toISOString().split("T")[0]

  const recentReviews = reviews.filter(
    (r) => r.goalId === goalId && r.date >= cutoffStr
  )

  return {
    exceeding: recentReviews.filter((r) => r.rating === "exceeding").length,
    onTrack: recentReviews.filter((r) => r.rating === "on-track").length,
    struggling: recentReviews.filter((r) => r.rating === "struggling").length,
    slow: recentReviews.filter((r) => r.rating === "slow").length,
  }
}

function suggestNewTarget(
  current: number,
  direction: "increase" | "decrease"
): number {
  if (direction === "increase") {
    if (current <= 3) return current + 1
    return Math.round(current * 1.2)
  } else {
    if (current <= 2) return 1
    if (current <= 4) return current - 1
    return Math.round(current * 0.8)
  }
}

export async function analyzeTargets(
  basePath: string,
  userId: string
): Promise<TargetSuggestion[]> {
  const goalsData = await readGoals(basePath, userId)
  const reviewsData = await readReviews(basePath, userId)

  const suggestions: TargetSuggestion[] = []

  const activeGoals = goalsData.goals.filter(
    (g) => g.status === "active" && g.type !== "milestone"
  )

  for (const goal of activeGoals) {
    const performance = analyzeRecentPerformance(reviewsData.reviews, goal.id)
    const totalRecent = performance.exceeding + performance.onTrack + performance.struggling + performance.slow

    if (totalRecent < 3) continue

    const successRate = (performance.exceeding + performance.onTrack) / totalRecent
    const exceedingRate = performance.exceeding / totalRecent

    if (exceedingRate >= 0.6 && totalRecent >= 4) {
      const newTarget = suggestNewTarget(goal.target, "increase")
      suggestions.push({
        goalId: goal.id,
        goalTitle: goal.title,
        currentTarget: goal.target,
        suggestedTarget: newTarget,
        unit: goal.unit,
        reason: `You've been exceeding ${Math.round(exceedingRate * 100)}% of the time. Time to level up!`,
        direction: "increase",
      })
    } else if (successRate <= 0.3 && totalRecent >= 4) {
      const newTarget = suggestNewTarget(goal.target, "decrease")
      suggestions.push({
        goalId: goal.id,
        goalTitle: goal.title,
        currentTarget: goal.target,
        suggestedTarget: newTarget,
        unit: goal.unit,
        reason: `Current target may be too ambitious. Consider a more achievable goal.`,
        direction: "decrease",
      })
    }
  }

  return suggestions
}

export async function getGoalTargetSuggestion(
  basePath: string,
  userId: string,
  goalId: string
): Promise<TargetSuggestion | null> {
  const suggestions = await analyzeTargets(basePath, userId)
  return suggestions.find((s) => s.goalId === goalId) || null
}

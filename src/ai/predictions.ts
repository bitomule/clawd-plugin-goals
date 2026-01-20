import type { Goal, Review } from "../types.js"
import { readGoals, readReviews } from "../storage/file-io.js"
import { daysSinceLastReview } from "../core/scheduling.js"

export interface RiskPrediction {
  goalId: string
  goalTitle: string
  riskLevel: "low" | "medium" | "high"
  reason: string
  daysSinceCheckIn: number
  suggestion: string
}

function calculateRiskLevel(
  goal: Goal,
  reviews: Review[],
  daysSince: number
): { level: "low" | "medium" | "high"; reason: string } {
  const expectedInterval = goal.checkInInterval || 7

  if (daysSince > expectedInterval * 2) {
    return {
      level: "high",
      reason: `No check-in for ${daysSince} days (expected every ${expectedInterval} days)`,
    }
  }

  if (daysSince > expectedInterval) {
    return {
      level: "medium",
      reason: `Check-in overdue by ${daysSince - expectedInterval} days`,
    }
  }

  const recentReviews = reviews
    .filter((r) => r.goalId === goal.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  if (recentReviews.length >= 3) {
    const strugglingCount = recentReviews.filter(
      (r) => r.rating === "struggling" || r.rating === "slow"
    ).length

    if (strugglingCount >= 3) {
      return {
        level: "high",
        reason: "Recent reviews show consistent difficulty",
      }
    }

    if (strugglingCount >= 2) {
      return {
        level: "medium",
        reason: "Recent reviews show some difficulty",
      }
    }
  }

  return { level: "low", reason: "On track" }
}

function generateSuggestion(riskLevel: string, goal: Goal): string {
  if (riskLevel === "high") {
    if (goal.target > 1) {
      return `Consider reducing target from ${goal.target} to ${Math.ceil(goal.target * 0.7)} ${goal.unit}`
    }
    return "Try breaking this into smaller milestones"
  }

  if (riskLevel === "medium") {
    return "Schedule a check-in today to get back on track"
  }

  return "Keep up the good work!"
}

export async function predictRisks(
  basePath: string,
  userId: string
): Promise<RiskPrediction[]> {
  const goalsData = await readGoals(basePath, userId)
  const reviewsData = await readReviews(basePath, userId)

  const predictions: RiskPrediction[] = []

  const activeGoals = goalsData.goals.filter((g) => g.status === "active")

  for (const goal of activeGoals) {
    const daysSince = daysSinceLastReview(goal.lastReview)
    const { level, reason } = calculateRiskLevel(goal, reviewsData.reviews, daysSince)

    if (level !== "low") {
      predictions.push({
        goalId: goal.id,
        goalTitle: goal.title,
        riskLevel: level,
        reason,
        daysSinceCheckIn: daysSince === Infinity ? -1 : daysSince,
        suggestion: generateSuggestion(level, goal),
      })
    }
  }

  predictions.sort((a, b) => {
    const levelOrder = { high: 0, medium: 1, low: 2 }
    return levelOrder[a.riskLevel] - levelOrder[b.riskLevel]
  })

  return predictions
}

export async function getGoalRisk(
  basePath: string,
  userId: string,
  goalId: string
): Promise<RiskPrediction | null> {
  const risks = await predictRisks(basePath, userId)
  return risks.find((r) => r.goalId === goalId) || null
}

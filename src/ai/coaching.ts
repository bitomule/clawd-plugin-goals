import type { Locale } from "../types.js"
import { readGoals, readReviews, readObstacles } from "../storage/file-io.js"
import { t } from "../i18n/index.js"
import { getGoalRisk } from "./predictions.js"
import { getGoalTargetSuggestion } from "./suggestions.js"
import { getStoredPatterns } from "./patterns.js"
import { daysSinceLastReview } from "../core/scheduling.js"

export async function generateCoaching(
  basePath: string,
  userId: string,
  goalId: string,
  locale: Locale
): Promise<string> {
  const goalsData = await readGoals(basePath, userId)
  const reviewsData = await readReviews(basePath, userId)
  const obstaclesData = await readObstacles(basePath, userId)
  const patterns = await getStoredPatterns(basePath, userId)

  const goal = goalsData.goals.find((g) => g.id === goalId)
  if (!goal) {
    return t(locale, "goals.notFound", { id: goalId })
  }

  const messages: string[] = []

  messages.push(`# Coaching for: ${goal.title}`)
  messages.push("")

  if (goal.identity) {
    messages.push(t(locale, "coaching.identityReminder", { identity: goal.identity }))
    messages.push("")
  }

  const risk = await getGoalRisk(basePath, userId, goalId)
  if (risk) {
    const daysSince = daysSinceLastReview(goal.lastReview)
    if (daysSince > 3) {
      messages.push(t(locale, "coaching.riskAlert", { name: "", days: daysSince }))
      messages.push(t(locale, "coaching.suggestion"))
      messages.push("")
    }
  }

  const recentReviews = reviewsData.reviews
    .filter((r) => r.goalId === goalId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  if (recentReviews.length >= 3) {
    const exceedingCount = recentReviews.filter((r) => r.rating === "exceeding").length
    const strugglingCount = recentReviews.filter(
      (r) => r.rating === "struggling" || r.rating === "slow"
    ).length

    if (exceedingCount >= 3) {
      messages.push(t(locale, "coaching.greatProgress"))
    } else if (strugglingCount >= 3) {
      messages.push(t(locale, "coaching.needHelp"))
    } else {
      messages.push(t(locale, "coaching.keepGoing"))
    }
    messages.push("")
  }

  const targetSuggestion = await getGoalTargetSuggestion(basePath, userId, goalId)
  if (targetSuggestion) {
    messages.push(
      `**Target suggestion:** ${targetSuggestion.currentTarget} → ${targetSuggestion.suggestedTarget} ${targetSuggestion.unit}`
    )
    messages.push(`Reason: ${targetSuggestion.reason}`)
    messages.push("")
  }

  const relevantPatterns = patterns.filter((p) => p.appliesTo.includes(goalId))
  if (relevantPatterns.length > 0) {
    messages.push("**Patterns detected:**")
    for (const pattern of relevantPatterns) {
      messages.push(t(locale, "coaching.patternDetected", { description: pattern.description }))
      if (pattern.suggestion) {
        messages.push(t(locale, "coaching.suggestionAction", { suggestion: pattern.suggestion }))
      }
    }
    messages.push("")
  }

  const unresolvedObstacles = obstaclesData.obstacles.filter(
    (o) => o.goalId === goalId && !o.resolved
  )
  if (unresolvedObstacles.length > 0) {
    messages.push("**Current obstacles:**")
    for (const obstacle of unresolvedObstacles) {
      messages.push(`• ${obstacle.description}`)
    }
    messages.push("")
  }

  const recentWins = recentReviews.flatMap((r) => r.wins || []).slice(0, 3)
  if (recentWins.length > 0) {
    messages.push("**Recent wins:**")
    for (const win of recentWins) {
      messages.push(`• ${win}`)
    }
    messages.push("")
  }

  messages.push("---")
  messages.push(`**Remember your WHY:** ${goal.why}`)

  return messages.join("\n")
}

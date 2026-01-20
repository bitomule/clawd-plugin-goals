import { randomUUID } from "node:crypto"
import type { Pattern, Review, Goal, PatternType } from "../types.js"
import { readGoals, readReviews, readPatterns, writePatterns } from "../storage/file-io.js"

interface DayStats {
  day: number
  total: number
  successful: number
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay()
}

function isSuccessfulRating(rating: string): boolean {
  return rating === "on-track" || rating === "exceeding"
}

function analyzeWeekdayPatterns(reviews: Review[], goalIds: string[]): Pattern[] {
  const patterns: Pattern[] = []

  const dayStats: DayStats[] = Array.from({ length: 7 }, (_, i) => ({
    day: i,
    total: 0,
    successful: 0,
  }))

  for (const review of reviews) {
    if (!goalIds.includes(review.goalId)) continue

    const dayOfWeek = getDayOfWeek(review.date)
    dayStats[dayOfWeek].total++
    if (isSuccessfulRating(review.rating)) {
      dayStats[dayOfWeek].successful++
    }
  }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  for (const stat of dayStats) {
    if (stat.total < 3) continue

    const successRate = stat.successful / stat.total

    if (successRate >= 0.8) {
      patterns.push({
        id: randomUUID(),
        type: "success",
        description: `You perform well on ${dayNames[stat.day]}s (${Math.round(successRate * 100)}% success rate)`,
        confidence: Math.min(stat.total / 10, 1),
        appliesTo: goalIds,
        detectedAt: new Date().toISOString(),
        suggestion: `Consider scheduling important goals on ${dayNames[stat.day]}s`,
      })
    } else if (successRate <= 0.3 && stat.total >= 5) {
      patterns.push({
        id: randomUUID(),
        type: "risk",
        description: `${dayNames[stat.day]}s are challenging (${Math.round(successRate * 100)}% success rate)`,
        confidence: Math.min(stat.total / 10, 1),
        appliesTo: goalIds,
        detectedAt: new Date().toISOString(),
        suggestion: `Consider lighter goals or rest on ${dayNames[stat.day]}s`,
      })
    }
  }

  return patterns
}

function analyzeStreakPatterns(reviews: Review[], goals: Goal[]): Pattern[] {
  const patterns: Pattern[] = []

  for (const goal of goals) {
    const goalReviews = reviews
      .filter((r) => r.goalId === goal.id)
      .sort((a, b) => a.date.localeCompare(b.date))

    if (goalReviews.length < 5) continue

    let currentStreak = 0
    let maxStreak = 0

    for (const review of goalReviews) {
      if (isSuccessfulRating(review.rating)) {
        currentStreak++
        maxStreak = Math.max(maxStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    }

    if (maxStreak >= 7) {
      patterns.push({
        id: randomUUID(),
        type: "success",
        description: `Strong consistency on "${goal.title}" (${maxStreak} day streak achieved)`,
        confidence: 0.9,
        appliesTo: [goal.id],
        detectedAt: new Date().toISOString(),
        suggestion: "Keep momentum! Consider increasing the challenge.",
      })
    }
  }

  return patterns
}

function analyzeCorrelations(reviews: Review[], goals: Goal[]): Pattern[] {
  const patterns: Pattern[] = []

  const reviewsByDate: Map<string, Review[]> = new Map()
  for (const review of reviews) {
    const date = review.date
    const existing = reviewsByDate.get(date) || []
    existing.push(review)
    reviewsByDate.set(date, existing)
  }

  const goalPairs: Array<[Goal, Goal]> = []
  for (let i = 0; i < goals.length; i++) {
    for (let j = i + 1; j < goals.length; j++) {
      goalPairs.push([goals[i], goals[j]])
    }
  }

  for (const [goal1, goal2] of goalPairs) {
    let bothSuccess = 0
    let bothTotal = 0

    for (const [, dayReviews] of reviewsByDate) {
      const review1 = dayReviews.find((r) => r.goalId === goal1.id)
      const review2 = dayReviews.find((r) => r.goalId === goal2.id)

      if (review1 && review2) {
        bothTotal++
        if (isSuccessfulRating(review1.rating) && isSuccessfulRating(review2.rating)) {
          bothSuccess++
        }
      }
    }

    if (bothTotal >= 5) {
      const correlationRate = bothSuccess / bothTotal

      if (correlationRate >= 0.8) {
        patterns.push({
          id: randomUUID(),
          type: "opportunity",
          description: `"${goal1.title}" and "${goal2.title}" work well together`,
          confidence: Math.min(bothTotal / 15, 1),
          appliesTo: [goal1.id, goal2.id],
          detectedAt: new Date().toISOString(),
          suggestion: "These goals reinforce each other. Keep them paired!",
        })
      }
    }
  }

  return patterns
}

function deduplicatePatterns(patterns: Pattern[]): Pattern[] {
  const seen = new Set<string>()
  const result: Pattern[] = []

  for (const pattern of patterns) {
    const key = `${pattern.type}:${pattern.description}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(pattern)
    }
  }

  return result
}

export async function analyzePatterns(
  basePath: string,
  userId: string
): Promise<Pattern[]> {
  const goalsData = await readGoals(basePath, userId)
  const reviewsData = await readReviews(basePath, userId)

  if (reviewsData.reviews.length < 10) {
    return []
  }

  const activeGoals = goalsData.goals.filter((g) => g.status === "active")
  const goalIds = activeGoals.map((g) => g.id)

  const allPatterns: Pattern[] = [
    ...analyzeWeekdayPatterns(reviewsData.reviews, goalIds),
    ...analyzeStreakPatterns(reviewsData.reviews, activeGoals),
    ...analyzeCorrelations(reviewsData.reviews, activeGoals),
  ]

  const uniquePatterns = deduplicatePatterns(allPatterns)

  const patternsData = await readPatterns(basePath, userId)
  patternsData.patterns = uniquePatterns
  await writePatterns(basePath, userId, patternsData)

  return uniquePatterns
}

export async function getStoredPatterns(
  basePath: string,
  userId: string
): Promise<Pattern[]> {
  const patternsData = await readPatterns(basePath, userId)
  return patternsData.patterns
}

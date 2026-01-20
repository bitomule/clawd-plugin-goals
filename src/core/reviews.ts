import { randomUUID } from "node:crypto"
import type { Review, ReviewRating, Goal, Locale } from "../types.js"
import { readGoals, writeGoals, readReviews, writeReviews, appendSessionLog } from "../storage/file-io.js"
import { t } from "../i18n/index.js"
import { calculateNextCheckInFromRating, calculateMaturityIncrease } from "./scheduling.js"

export interface ReviewInput {
  goalId: string
  rating: ReviewRating
  evidence: string
  value?: number
  obstacles?: string[]
  wins?: string[]
}

function countConsecutiveSuccesses(reviews: Review[], goalId: string): number {
  const goalReviews = reviews
    .filter((r) => r.goalId === goalId)
    .sort((a, b) => b.date.localeCompare(a.date))

  let count = 0
  for (const review of goalReviews) {
    if (review.rating === "on-track" || review.rating === "exceeding") {
      count++
    } else {
      break
    }
  }
  return count
}

function calculatePeriodProgress(
  reviews: Review[],
  goal: Goal,
  currentDate: string
): { current: number; streak: number } {
  const now = new Date(currentDate)
  let periodStart: Date
  let periodKey: string

  switch (goal.frequency) {
    case "daily":
      periodStart = new Date(now)
      periodStart.setHours(0, 0, 0, 0)
      periodKey = currentDate.split("T")[0]
      break
    case "weekly": {
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      periodStart = new Date(now)
      periodStart.setDate(now.getDate() - diff)
      periodStart.setHours(0, 0, 0, 0)
      periodKey = periodStart.toISOString().split("T")[0]
      break
    }
    case "monthly":
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
      break
    case "quarterly": {
      const quarter = Math.floor(now.getMonth() / 3)
      periodStart = new Date(now.getFullYear(), quarter * 3, 1)
      periodKey = `${now.getFullYear()}-Q${quarter + 1}`
      break
    }
    case "yearly":
      periodStart = new Date(now.getFullYear(), 0, 1)
      periodKey = String(now.getFullYear())
      break
    default:
      periodStart = new Date(now)
      periodKey = currentDate
  }

  const periodReviews = reviews.filter((r) => {
    const reviewDate = new Date(r.date)
    return r.goalId === goal.id && reviewDate >= periodStart && reviewDate <= now
  })

  const current =
    goal.type === "measurable"
      ? periodReviews.reduce((sum, r) => sum + (r.value || 0), 0)
      : periodReviews.length

  const goalReviews = reviews
    .filter((r) => r.goalId === goal.id)
    .sort((a, b) => b.date.localeCompare(a.date))

  let streak = 0
  const periods = new Set<string>()
  for (const review of goalReviews) {
    const reviewDate = new Date(review.date)
    let key: string
    switch (goal.frequency) {
      case "weekly": {
        const dayOfWeek = reviewDate.getDay()
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        const weekStart = new Date(reviewDate)
        weekStart.setDate(reviewDate.getDate() - diff)
        key = weekStart.toISOString().split("T")[0]
        break
      }
      case "monthly":
        key = `${reviewDate.getFullYear()}-${String(reviewDate.getMonth() + 1).padStart(2, "0")}`
        break
      default:
        key = review.date.split("T")[0]
    }
    periods.add(key)
  }
  streak = periods.size

  return { current, streak }
}

export async function addReview(
  basePath: string,
  userId: string,
  input: ReviewInput,
  locale: Locale
): Promise<{ success: boolean; message: string; review?: Review; goal?: Goal }> {
  const goalsData = await readGoals(basePath, userId)
  const reviewsData = await readReviews(basePath, userId)

  const goal = goalsData.goals.find((g) => g.id === input.goalId)
  if (!goal) {
    return {
      success: false,
      message: t(locale, "goals.notFound", { id: input.goalId }),
    }
  }

  const now = new Date().toISOString()
  const today = now.split("T")[0]

  const review: Review = {
    id: randomUUID(),
    goalId: input.goalId,
    date: today,
    rating: input.rating,
    evidence: input.evidence,
    value: input.value,
    obstacles: input.obstacles,
    wins: input.wins,
  }

  reviewsData.reviews.push(review)

  goal.lastReview = today
  goal.nextCheckIn = calculateNextCheckInFromRating(today, input.rating, goal.maturity)
  goal.updatedAt = now

  if (goal.type === "measurable" && input.value !== undefined) {
    goal.progress = input.value
  }

  const consecutiveSuccesses = countConsecutiveSuccesses(reviewsData.reviews, goal.id)
  const newMaturity = calculateMaturityIncrease(goal.maturity, consecutiveSuccesses)
  const maturityIncreased = newMaturity > goal.maturity
  goal.maturity = newMaturity

  const { current, streak } = calculatePeriodProgress(reviewsData.reviews, goal, now)

  await writeReviews(basePath, userId, reviewsData)
  await writeGoals(basePath, userId, goalsData)

  await appendSessionLog(basePath, userId, {
    ts: now,
    action: "review",
    goalId: goal.id,
    data: { rating: input.rating, value: input.value },
  })

  const messages: string[] = [t(locale, "review.registered")]

  const periodKey = goal.frequency === "weekly" ? "week" : goal.frequency === "monthly" ? "month" : "day"
  messages.push(t(locale, "review.weekProgress", { current, target: goal.target, unit: goal.unit }))

  if (streak > 1) {
    const periodName = t(locale, `period.${periodKey}s`)
    messages.push(t(locale, "review.streak", { count: streak, period: periodName }))
  }

  if (current === goal.target - 1) {
    messages.push(t(locale, "review.oneMoreToComplete", { period: t(locale, `period.${periodKey}`) }))
  } else if (current >= goal.target) {
    messages.push(t(locale, "review.periodCompleted", { period: t(locale, `period.${periodKey}`).toUpperCase() }))
  }

  if (maturityIncreased) {
    messages.push(t(locale, "review.maturityUp", { level: goal.maturity }))
  }

  messages.push(t(locale, "review.rememberWhy") + " " + goal.why)
  messages.push(t(locale, "review.nextCheckIn", { date: goal.nextCheckIn }))

  return {
    success: true,
    message: messages.join("\n"),
    review,
    goal,
  }
}

export async function getReviewHistory(
  basePath: string,
  userId: string,
  goalId: string,
  limit = 10
): Promise<Review[]> {
  const data = await readReviews(basePath, userId)
  return data.reviews
    .filter((r) => r.goalId === goalId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
}

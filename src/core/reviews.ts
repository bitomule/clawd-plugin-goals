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
  date?: string // YYYY-MM-DD format, defaults to today
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

// Parse date string as local date (not UTC)
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day)
}

// Get ISO week start (Monday) for a date
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday is 1, Sunday is 0
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function calculatePeriodProgress(
  reviews: Review[],
  goal: Goal,
  referenceDate: string
): { current: number; streak: number; uniqueDays: string[] } {
  const now = parseLocalDate(referenceDate)
  let periodStart: Date

  switch (goal.frequency) {
    case "daily":
      periodStart = new Date(now)
      periodStart.setHours(0, 0, 0, 0)
      break
    case "weekly":
      periodStart = getWeekStart(now)
      break
    case "monthly":
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case "quarterly": {
      const quarter = Math.floor(now.getMonth() / 3)
      periodStart = new Date(now.getFullYear(), quarter * 3, 1)
      break
    }
    case "yearly":
      periodStart = new Date(now.getFullYear(), 0, 1)
      break
    default:
      periodStart = new Date(now)
  }

  // Get all reviews for this goal in the current period
  const periodReviews = reviews.filter((r) => {
    if (r.goalId !== goal.id) return false
    const reviewDate = parseLocalDate(r.date)
    return reviewDate >= periodStart && reviewDate <= now
  })

  // For habits, count unique days (not total reviews)
  const uniqueDays = [...new Set(periodReviews.map((r) => r.date))].sort()

  const current =
    goal.type === "measurable"
      ? periodReviews.reduce((sum, r) => sum + (r.value || 0), 0)
      : uniqueDays.length

  // Calculate streak (consecutive periods with at least one completion)
  const allGoalReviews = reviews
    .filter((r) => r.goalId === goal.id)
    .sort((a, b) => b.date.localeCompare(a.date))

  const periodsWithActivity = new Set<string>()
  for (const review of allGoalReviews) {
    const reviewDate = parseLocalDate(review.date)
    let key: string
    switch (goal.frequency) {
      case "weekly":
        key = formatDate(getWeekStart(reviewDate))
        break
      case "monthly":
        key = `${reviewDate.getFullYear()}-${String(reviewDate.getMonth() + 1).padStart(2, "0")}`
        break
      default:
        key = review.date
    }
    periodsWithActivity.add(key)
  }
  const streak = periodsWithActivity.size

  return { current, streak, uniqueDays }
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
  const today = formatDate(new Date())
  const reviewDate = input.date || today

  const review: Review = {
    id: randomUUID(),
    goalId: input.goalId,
    date: reviewDate,
    rating: input.rating,
    evidence: input.evidence,
    value: input.value,
    obstacles: input.obstacles,
    wins: input.wins,
  }

  reviewsData.reviews.push(review)

  goal.lastReview = reviewDate
  goal.nextCheckIn = calculateNextCheckInFromRating(today, input.rating, goal.maturity)
  goal.updatedAt = now

  const consecutiveSuccesses = countConsecutiveSuccesses(reviewsData.reviews, goal.id)
  const newMaturity = calculateMaturityIncrease(goal.maturity, consecutiveSuccesses)
  const maturityIncreased = newMaturity > goal.maturity
  goal.maturity = newMaturity

  // Calculate progress using today as reference (to see current week/month status)
  const { current, streak, uniqueDays } = calculatePeriodProgress(reviewsData.reviews, goal, today)

  // Update goal progress for habits (count of completions this period)
  if (goal.type === "habit") {
    goal.progress = current
  } else if (goal.type === "measurable" && input.value !== undefined) {
    goal.progress = input.value
  }

  await writeReviews(basePath, userId, reviewsData)
  await writeGoals(basePath, userId, goalsData)

  await appendSessionLog(basePath, userId, {
    ts: now,
    action: "review",
    goalId: goal.id,
    data: { rating: input.rating, value: input.value, date: reviewDate },
  })

  const messages: string[] = [t(locale, "review.registered")]

  const periodKey = goal.frequency === "weekly" ? "week" : goal.frequency === "monthly" ? "month" : "day"
  messages.push(t(locale, "review.weekProgress", { current, target: goal.target, unit: goal.unit }))

  // Show which days were logged this period
  if (uniqueDays.length > 0 && goal.type === "habit") {
    const dayNames = uniqueDays.map((d) => {
      const date = parseLocalDate(d)
      return date.toLocaleDateString(locale === "es" ? "es-ES" : "en-US", { weekday: "short", day: "numeric" })
    })
    messages.push(`📅 ${dayNames.join(", ")}`)
  }

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

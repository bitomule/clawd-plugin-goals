import type { ReviewRating } from "../types.js"

const RATING_INTERVALS: Record<ReviewRating, number> = {
  struggling: 1,
  slow: 3,
  "on-track": 7,
  exceeding: 14,
}

export function getIntervalForRating(rating: ReviewRating): number {
  return RATING_INTERVALS[rating]
}

export function calculateNextCheckIn(
  fromDate: string,
  baseInterval: number,
  maturity: number
): string {
  const from = new Date(fromDate)
  const adjustedInterval = Math.round(baseInterval * (1 + maturity * 0.2))
  from.setDate(from.getDate() + adjustedInterval)
  return from.toISOString().split("T")[0]
}

export function calculateNextCheckInFromRating(
  fromDate: string,
  rating: ReviewRating,
  maturity: number
): string {
  const baseInterval = getIntervalForRating(rating)
  return calculateNextCheckIn(fromDate, baseInterval, maturity)
}

export function daysSinceLastReview(lastReview: string | undefined): number {
  if (!lastReview) return Infinity

  const last = new Date(lastReview)
  const now = new Date()
  const diffMs = now.getTime() - last.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export function isOverdue(nextCheckIn: string | undefined): boolean {
  if (!nextCheckIn) return true
  const checkIn = new Date(nextCheckIn)
  const now = new Date()
  return now > checkIn
}

export function calculateMaturityIncrease(
  currentMaturity: number,
  consecutiveSuccesses: number
): number {
  if (consecutiveSuccesses >= 4 && currentMaturity < 5) {
    return Math.min(currentMaturity + 1, 5)
  }
  return currentMaturity
}

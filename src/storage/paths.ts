import { join } from "node:path"
import { homedir } from "node:os"

export function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2))
  }
  return path
}

export function getUserDataPath(basePath: string, userId: string): string {
  return join(expandPath(basePath), "users", userId)
}

export function getGoalsFilePath(basePath: string, userId: string): string {
  return join(getUserDataPath(basePath, userId), "goals.json")
}

export function getReviewsFilePath(basePath: string, userId: string): string {
  return join(getUserDataPath(basePath, userId), "reviews.json")
}

export function getPreferencesFilePath(basePath: string, userId: string): string {
  return join(getUserDataPath(basePath, userId), "preferences.json")
}

export function getPatternsFilePath(basePath: string, userId: string): string {
  return join(getUserDataPath(basePath, userId), "insights", "patterns.json")
}

export function getObstaclesFilePath(basePath: string, userId: string): string {
  return join(getUserDataPath(basePath, userId), "obstacles", "obstacles.json")
}

export function getSessionLogPath(basePath: string, userId: string, date: string): string {
  return join(getUserDataPath(basePath, userId), "sessions", `${date}.jsonl`)
}

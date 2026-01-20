import { readFile, writeFile, mkdir, appendFile } from "node:fs/promises"
import { dirname } from "node:path"
import type {
  GoalsData,
  ReviewsData,
  UserPreferences,
  PatternsData,
  ObstaclesData,
  SessionEntry,
  Locale,
} from "../types.js"
import {
  getGoalsFilePath,
  getReviewsFilePath,
  getPreferencesFilePath,
  getPatternsFilePath,
  getObstaclesFilePath,
  getSessionLogPath,
} from "./paths.js"

async function ensureDir(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
}

async function readJson<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const content = await readFile(filePath, "utf-8")
    return JSON.parse(content) as T
  } catch {
    return defaultValue
  }
}

async function writeJson<T>(filePath: string, data: T): Promise<void> {
  await ensureDir(filePath)
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8")
}

export async function readGoals(basePath: string, userId: string): Promise<GoalsData> {
  const filePath = getGoalsFilePath(basePath, userId)
  return readJson<GoalsData>(filePath, { goals: [], lastUpdated: new Date().toISOString() })
}

export async function writeGoals(basePath: string, userId: string, data: GoalsData): Promise<void> {
  const filePath = getGoalsFilePath(basePath, userId)
  data.lastUpdated = new Date().toISOString()
  await writeJson(filePath, data)
}

export async function readReviews(basePath: string, userId: string): Promise<ReviewsData> {
  const filePath = getReviewsFilePath(basePath, userId)
  return readJson<ReviewsData>(filePath, { reviews: [], lastUpdated: new Date().toISOString() })
}

export async function writeReviews(basePath: string, userId: string, data: ReviewsData): Promise<void> {
  const filePath = getReviewsFilePath(basePath, userId)
  data.lastUpdated = new Date().toISOString()
  await writeJson(filePath, data)
}

export async function readPreferences(basePath: string, userId: string, defaultLocale: Locale): Promise<UserPreferences> {
  const filePath = getPreferencesFilePath(basePath, userId)
  return readJson<UserPreferences>(filePath, {
    locale: defaultLocale,
    timezone: "UTC",
  })
}

export async function writePreferences(basePath: string, userId: string, data: UserPreferences): Promise<void> {
  const filePath = getPreferencesFilePath(basePath, userId)
  await writeJson(filePath, data)
}

export async function readPatterns(basePath: string, userId: string): Promise<PatternsData> {
  const filePath = getPatternsFilePath(basePath, userId)
  return readJson<PatternsData>(filePath, { patterns: [], lastAnalyzed: new Date().toISOString() })
}

export async function writePatterns(basePath: string, userId: string, data: PatternsData): Promise<void> {
  const filePath = getPatternsFilePath(basePath, userId)
  data.lastAnalyzed = new Date().toISOString()
  await writeJson(filePath, data)
}

export async function readObstacles(basePath: string, userId: string): Promise<ObstaclesData> {
  const filePath = getObstaclesFilePath(basePath, userId)
  return readJson<ObstaclesData>(filePath, { obstacles: [], lastUpdated: new Date().toISOString() })
}

export async function writeObstacles(basePath: string, userId: string, data: ObstaclesData): Promise<void> {
  const filePath = getObstaclesFilePath(basePath, userId)
  data.lastUpdated = new Date().toISOString()
  await writeJson(filePath, data)
}

export async function appendSessionLog(basePath: string, userId: string, entry: SessionEntry): Promise<void> {
  const date = entry.ts.split("T")[0]
  const filePath = getSessionLogPath(basePath, userId, date)
  await ensureDir(filePath)
  await appendFile(filePath, JSON.stringify(entry) + "\n", "utf-8")
}

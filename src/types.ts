export type GoalType = "habit" | "milestone" | "measurable"
export type GoalFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
export type GoalStatus = "locked" | "available" | "active" | "paused" | "achieved"
export type ReviewRating = "struggling" | "slow" | "on-track" | "exceeding"
export type PatternType = "success" | "risk" | "opportunity"
export type Locale = "en" | "es"

export interface Goal {
  id: string
  title: string
  description?: string

  why: string
  identity?: string

  parentId?: string
  children?: string[]

  type: GoalType
  frequency: GoalFrequency
  target: number
  unit: string

  status: GoalStatus
  progress: number
  maturity: number

  prerequisites: string[]
  unlocks: string[]

  lastReview?: string
  nextCheckIn?: string
  checkInInterval: number

  owner: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface Review {
  id: string
  goalId: string
  date: string
  rating: ReviewRating
  evidence: string
  value?: number
  obstacles?: string[]
  wins?: string[]
  coaching?: string
}

export interface SessionEntry {
  ts: string
  action: string
  goalId?: string
  data: Record<string, unknown>
}

export interface Pattern {
  id: string
  type: PatternType
  description: string
  confidence: number
  appliesTo: string[]
  detectedAt: string
  suggestion?: string
}

export interface UserPreferences {
  locale: Locale
  timezone: string
  reminderTime?: string
  name?: string
}

export interface GoalsConfig {
  dataPath: string
  defaultCheckInInterval: number
  enableAI: boolean
  defaultLocale: Locale
}

export interface GoalsData {
  goals: Goal[]
  lastUpdated: string
}

export interface ReviewsData {
  reviews: Review[]
  lastUpdated: string
}

export interface PatternsData {
  patterns: Pattern[]
  lastAnalyzed: string
}

export interface Obstacle {
  id: string
  goalId: string
  description: string
  createdAt: string
  resolved: boolean
  resolvedAt?: string
}

export interface ObstaclesData {
  obstacles: Obstacle[]
  lastUpdated: string
}

// Clawdbot Plugin Types
export type ClawdbotPluginApi = {
  id: string
  name: string
  config: Record<string, unknown>
  pluginConfig?: Record<string, unknown>
  logger: {
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
    error: (...args: unknown[]) => void
    debug: (...args: unknown[]) => void
  }
  registerTool: (tool: PluginTool, opts?: { optional?: boolean }) => void
  resolvePath: (input: string) => string
}

export type PluginTool = {
  name: string
  description: string
  parameters: unknown
  execute: (id: string, params: unknown) => Promise<ToolResult>
}

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>
}

export type ClawdbotPluginDefinition = {
  id: string
  name: string
  description?: string
  configSchema?: unknown
  register: (api: ClawdbotPluginApi) => void
}

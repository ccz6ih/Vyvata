// StackReceipts — Core Types

export type Goal =
  | "sleep"
  | "energy"
  | "focus"
  | "inflammation"
  | "longevity"
  | "muscle"
  | "recovery";

export interface GoalOption {
  id: Goal;
  label: string;
  emoji: string;
}

export interface ParsedIngredient {
  name: string;
  dose?: string;
  unit?: string;
  raw: string;
}

export interface StackSubmission {
  sessionId: string;
  rawInput: string;
  ingredients: ParsedIngredient[];
  goals: Goal[];
}

export interface TeaserResult {
  score: number;
  headlineFindings: string[]; // 3 punchy one-liners
  teaserHook: string;
}

export interface ReportSection {
  verdict: string;
  working: WorkingItem[];
  wasting: WastingItem[];
  fighting: FightingItem[];
  missing: MissingItem[];
  revisedStack: RevisedStackItem[];
}

export interface WorkingItem {
  name: string;
  reason: string;
  evidenceTier: "strong" | "moderate" | "weak" | "none";
}

export interface WastingItem {
  name: string;
  reason: string;
  evidenceTier: "strong" | "moderate" | "weak" | "none";
  recommendation: string;
}

export interface FightingItem {
  ingredients: string[];
  interaction: string;
  fix: string;
}

export interface MissingItem {
  name: string;
  reason: string;
  evidenceTier: "strong" | "moderate" | "weak" | "none";
  affiliateUrl?: string;
  affiliateBrand?: string;
}

export interface RevisedStackItem {
  status: "keep" | "remove" | "modify" | "add";
  name: string;
  dose?: string;
  timing?: string;
  note?: string;
}

export interface AuditResult {
  sessionId: string;
  publicSlug: string;
  teaser: TeaserResult;
  report?: ReportSection;
  score: number;
  isUnlocked: boolean;
  email?: string;
}

// DB row shapes (matching Supabase schema)
export interface SessionRow {
  id: string;
  created_at: string;
  raw_input: string;
  goals: string; // JSON array
  ingredients: string; // JSON array
}

export interface AuditRow {
  id: string;
  session_id: string;
  public_slug: string;
  score: number;
  teaser_json: string;
  report_json: string | null;
  email: string | null;
  is_unlocked: boolean;
  created_at: string;
}

import { CurrencyCode } from '../utils/currency';

export type TaskPriority = 'Critical' | 'High' | 'Standard';
export type TaskStatus = 'Completed' | 'In Progress' | 'Delayed' | 'Pending';

export interface OnboardingChecklist {
  occasion: string;
  budget: number | null;
  guestCount: number | null;
  eventDate: string;
  experienceStyle: string;
  mustHaves: string[];
  audienceNotes: string;
}

export interface BudgetLineItem {
  id: string;
  name: string;
  cost: number;
  isMustHave: boolean;
  notes: string;
}

export interface BudgetBucket {
  id: string;
  category: string;
  allocated: number;
  committed: number;
  priority: 'Protected Must-Have' | 'High Impact' | 'Flexible';
  rationale: string;
  items: BudgetLineItem[];
}

export interface TradeOffAdjustment {
  category: string;
  previousAllocated: number;
  newAllocated: number;
  delta: number;
  actionSummary: string;
}

export interface TradeOffScenario {
  id: string;
  title: string;
  triggerDescription: string;
  targetTotalBudget: number;
  netSavings: number;
  experienceTradeOffSummary: string;
  preservedMustHaves: string[];
  adjustments: TradeOffAdjustment[];
}

export interface VendorHiddenCharge {
  label: string;
  estimatedAmount: number;
  clauseNote: string;
}

export interface VendorQuoteOption {
  id: string;
  vendorName: string;
  category: string;
  linkedBucketCategory: string;
  headlineQuote: number;
  hiddenCharges: VendorHiddenCharge[];
  trueLandedCost: number;
  inclusions: string[];
  missingExclusions: string[];
  contractRedFlags: string;
  negotiationTip: string;
  isSelected: boolean;
}

export interface TimelineTask {
  id: string;
  title: string;
  category: string;
  priority: TaskPriority;
  originalDueDate: string;
  dueDate: string;
  delayedByDays: number;
  status: TaskStatus;
  dependsOn: string[];
  dependencyRule: string;
  audienceTailoring?: string;
  owner: string;
}

export interface CascadeEventLog {
  id: string;
  timestamp: string;
  sourceTaskId: string;
  sourceTaskTitle: string;
  delayAddedDays: number;
  affectedTasks: {
    taskId: string;
    title: string;
    oldDate: string;
    newDate: string;
    reason: string;
  }[];
}

export interface PersonalizationRule {
  id: string;
  segment: string;
  category: 'Accessibility' | 'Culinary & Dietary' | 'Acoustic & Pacing' | 'Transit & Arrival';
  observation: string;
  recommendation: string;
  linkedTaskId?: string;
  estimatedCostImpact: number;
  applied: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  missingQuestionsAsked?: string[];
  structuredPatchSummary?: string[];
  structuredJsonSnapshot?: Record<string, unknown>;
}

export interface EventPlan {
  id: string;
  name: string;
  currency: CurrencyCode;
  personaTag: string;
  onboarding: OnboardingChecklist;
  isOnboardingComplete: boolean;
  budgetBuckets: BudgetBucket[];
  tradeOffScenarios: TradeOffScenario[];
  activeTradeOffId: string | null;
  vendorQuotes: VendorQuoteOption[];
  timelineTasks: TimelineTask[];
  cascadeLogs: CascadeEventLog[];
  personalizationRules: PersonalizationRule[];
}

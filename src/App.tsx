/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { PRESET_PLANS } from './data/presets';
import { ChatMessage, EventPlan } from './types/planner';
import {
  CurrencyCode,
  USD_TO_INR_RATE,
  formatMoney,
  getCurrencySymbol,
  parseMoneyAndGuestInput
} from './utils/currency';
import { cascadeTaskDelay } from './utils/dependencyEngine';
import { BudgetSection } from './components/BudgetSection';
import { VendorComparisonSection } from './components/VendorComparisonSection';
import { TimelineSection } from './components/TimelineSection';
import { PersonalizationSection } from './components/PersonalizationSection';
import { StructuredOutputSection } from './components/StructuredOutputSection';
import { UserGuideBanner } from './components/UserGuideBanner';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  Edit3,
  Eye,
  EyeOff,
  FileCode,
  HeartHandshake,
  MessageSquare,
  Moon,
  PieChart,
  RotateCcw,
  Scale,
  Search,
  Send,
  Sparkles,
  Sun,
  X,
  Zap
} from 'lucide-react';

type ActiveTab = 'ONBOARDING' | 'BUDGET' | 'VENDORS' | 'TIMELINE' | 'PERSONALIZATION';

interface GuidedStepConfig {
  key: 'occasion' | 'budgetAndGuests' | 'eventDate' | 'experienceStyle' | 'mustHaves';
  stepNumber: number;
  question: string;
  placeholder: string;
  suggestions: string[];
}

function getGuidedOnboardingSteps(currency: CurrencyCode): GuidedStepConfig[] {
  const isINR = currency === 'INR';
  return [
    {
      key: 'occasion',
      stepNumber: 1,
      question: 'Question 1 of 5: What is the occasion you are celebrating?',
      placeholder: isINR
        ? "Search or type occasion (e.g., Parents' 25th Anniversary Dinner for 120 guests under ₹3,50,000)"
        : "Search or type occasion (e.g., Parents' 40th Anniversary Dinner for 65 guests under $6,500)",
      suggestions: [
        "Parents' Wedding Anniversary Celebration",
        'Milestone 50th Birthday Family Feast',
        'Engagement / Roka Celebration Dinner',
        'Family Graduation & Reunion Supper'
      ]
    },
    {
      key: 'budgetAndGuests',
      stepNumber: 2,
      question:
        'Question 2 of 5: What is your estimated budget and expected number of guests? (Type in ₹ Rupees, Lakhs, or $ US Dollars)',
      placeholder: isINR
        ? 'e.g., ₹3,50,000 for 120 guests (or 5 lakhs for 150 guests)'
        : 'e.g., $6,500 for 65 guests (or ₹3,50,000 for 120 guests)',
      suggestions: isINR
        ? [
            '₹3,50,000 for 120 guests',
            '₹2,00,000 for 80 guests',
            '₹5 Lakhs for 150 guests',
            '$6,500 for 65 guests'
          ]
        : [
            '$6,500 for 65 guests',
            '$4,000 for 50 guests',
            '₹3,50,000 for 120 guests',
            '$12,000 for 80 guests'
          ]
    },
    {
      key: 'eventDate',
      stepNumber: 3,
      question: 'Question 3 of 5: When is the event happening?',
      placeholder: 'e.g., 2027-01-24 or 2026-12-19',
      suggestions: ['2027-01-24', '2026-12-19', '2027-02-14', '2027-04-10']
    },
    {
      key: 'experienceStyle',
      stepNumber: 4,
      question: 'Question 4 of 5: What kind of experience or vibe are you looking for?',
      placeholder: 'e.g., Warm, food-focused family feast with zero hidden vendor fees',
      suggestions: isINR
        ? [
            'Warm, food-focused banquet dinner with live counters',
            'Intimate family gathering at community hall',
            'Relaxed Sunday afternoon garden feast',
            'Traditional multi-generational dinner & music'
          ]
        : [
            'Warm, food-focused community hall family feast',
            'Intimate seated 4-course tasting supper',
            'Relaxed Sunday afternoon garden luncheon',
            'Lively multi-generational dinner & acoustic music'
          ]
    },
    {
      key: 'mustHaves',
      stepNumber: 5,
      question:
        'Question 5 of 5: What are your absolute must-haves (and any special guest needs like grandparents or kids)?',
      placeholder:
        'e.g., Hot family dinner, wheelchair/lift access for grandparents, candid photos',
      suggestions: isINR
        ? [
            'Hot vegetarian & Jain food counters, lift access & sofa seating for elders, candid photography',
            'Authentic regional buffet, wheelchair ramp for grandparents, clear stage audio',
            'Plated family dinner, kids activity corner, valet parking for seniors',
            'Live food counters, zero hidden generator fees, family portrait session'
          ]
        : [
            'Hot family-style dinner, step-free access for grandparents, BYO wine, candid photographer',
            '4-course tasting menu, live acoustic trio, wheelchair ramp, quiet seating for seniors',
            'Authentic vegetarian/halal catering, kids activity table, free parking',
            'Plated dinner, speech microphone for elders, zero corkage fees'
          ]
    }
  ];
}

function getMissingStepIndex(plan: EventPlan): number {
  if (!plan.onboarding.occasion.trim()) return 0;
  if (!plan.onboarding.budget || !plan.onboarding.guestCount) return 1;
  if (!plan.onboarding.eventDate.trim()) return 2;
  if (!plan.onboarding.experienceStyle.trim()) return 3;
  if (plan.onboarding.mustHaves.length === 0) return 4;
  return -1; // All 5 complete
}

/**
 * Generates tailored budget buckets, trade-offs, vendor quotes, timeline, and guest rules
 * in the active currency (USD or INR). Preserves any existing timeline tasks or custom vendor quotes if present.
 */
function buildCompleteEventPlanFromBasics(basePlan: EventPlan): EventPlan {
  const currency = basePlan.currency || 'USD';
  const defaultBudget = currency === 'INR' ? 350000 : 6500;
  const defaultGuests = currency === 'INR' ? 120 : 65;

  const totalB = basePlan.onboarding.budget || defaultBudget;
  const guests = basePlan.onboarding.guestCount || defaultGuests;

  const venueAlloc = Math.round(totalB * 0.22);
  const caterAlloc = Math.round(totalB * 0.46);
  const photoAlloc = Math.round(totalB * 0.14);
  const decorAlloc = Math.round(totalB * 0.10);
  const logisticsAlloc = totalB - (venueAlloc + caterAlloc + photoAlloc + decorAlloc);

  const buckets = [
    {
      id: 'gen-venue',
      category: 'Venue & Spatial',
      allocated: venueAlloc,
      committed: 0,
      priority: 'Protected Must-Have' as const,
      rationale: `Accessible venue space sized for ${guests} guests (${basePlan.onboarding.experienceStyle}).`,
      items: [
        {
          id: 'gv-1',
          name: `Private Venue / Banquet Hall (${guests} Guests Capacity)`,
          cost: venueAlloc,
          isMustHave: true,
          notes: 'Includes tables, seating, and step-free / lift access for elders'
        }
      ]
    },
    {
      id: 'gen-catering',
      category: 'Catering & Beverage',
      allocated: caterAlloc,
      committed: 0,
      priority: 'Protected Must-Have' as const,
      rationale: `Primary culinary allocation (~${formatMoney(
        Math.round(caterAlloc / Math.max(1, guests)),
        currency
      )}/guest) protecting your must-haves.`,
      items: [
        {
          id: 'gc-1',
          name: `Full Meal & Beverage Service (${guests} Guests)`,
          cost: caterAlloc,
          isMustHave: true,
          notes: `Tailored to: ${basePlan.onboarding.mustHaves.join(', ')}`
        }
      ]
    },
    {
      id: 'gen-photo',
      category: 'Photography & Sound',
      allocated: photoAlloc,
      committed: 0,
      priority: 'High Impact' as const,
      rationale: 'Event photography and clear wireless microphone audio for speeches.',
      items: [
        {
          id: 'gp-1',
          name: 'Candid Photography & Multi-Gen Family Portraits',
          cost: Math.round(photoAlloc * 0.72),
          isMustHave: true,
          notes: 'Captures multi-generational portraits and candid moments'
        },
        {
          id: 'gp-2',
          name: 'Acoustic Sound Setup & 2 Wireless Speech Mics',
          cost: photoAlloc - Math.round(photoAlloc * 0.72),
          isMustHave: true,
          notes: 'Clear speech projection & warm music without booming echo near elders'
        }
      ]
    },
    {
      id: 'gen-decor',
      category: 'Decor, Florals & Stationery',
      allocated: decorAlloc,
      committed: 0,
      priority: 'Flexible' as const,
      rationale: 'Stage/table florals, warm ambient lighting, and invitations.',
      items: [
        {
          id: 'gd-1',
          name: 'Floral Decor, Warm Lighting & Invitations',
          cost: decorAlloc,
          isMustHave: false,
          notes: 'Flexible bucket that can be trimmed first if budget tightens'
        }
      ]
    },
    {
      id: 'gen-logistics',
      category: 'Accessibility & Family Logistics',
      allocated: logisticsAlloc,
      committed: 0,
      priority: 'High Impact' as const,
      rationale: 'Senior seating comfort, arrival assistance, and contingency reserve.',
      items: [
        {
          id: 'gl-1',
          name: 'Elder Comfort Seating & Contingency Buffer',
          cost: logisticsAlloc,
          isMustHave: false,
          notes: 'Supports special guest accommodations'
        }
      ]
    }
  ];

  const cutAmount = Math.round(totalB * 0.15);
  const minFloor = currency === 'INR' ? 5000 : 100;
  const tradeOffs = [
    {
      id: 'gen-to-1',
      title: `Save ${formatMoney(cutAmount, currency)} (15% Cut) Without Touching Food Quality`,
      triggerDescription: `Reduce budget from ${formatMoney(totalB, currency)} to ${formatMoney(
        totalB - cutAmount,
        currency
      )}`,
      targetTotalBudget: totalB - cutAmount,
      netSavings: cutAmount,
      experienceTradeOffSummary:
        'Protects 100% of your catering and venue budget while trimming flexible floral decor and switching to digital invitations.',
      preservedMustHaves: basePlan.onboarding.mustHaves,
      adjustments: [
        {
          category: 'Decor, Florals & Stationery',
          previousAllocated: decorAlloc,
          newAllocated: Math.max(minFloor, decorAlloc - Math.round(cutAmount * 0.65)),
          delta: -Math.round(cutAmount * 0.65),
          actionSummary:
            'Use digital RSVPs and seasonal local florals instead of imported stage arches'
        },
        {
          category: 'Accessibility & Family Logistics',
          previousAllocated: logisticsAlloc,
          newAllocated: Math.max(minFloor, logisticsAlloc - Math.round(cutAmount * 0.35)),
          delta: -Math.round(cutAmount * 0.35),
          actionSummary: 'Coordinate family carpools instead of dedicated paid transport cars'
        }
      ]
    }
  ];

  const templatePreset = currency === 'INR' ? PRESET_PLANS[1] : PRESET_PLANS[0];

  return {
    ...basePlan,
    isOnboardingComplete: true,
    budgetBuckets: buckets,
    tradeOffScenarios: tradeOffs,
    vendorQuotes:
      basePlan.vendorQuotes.length > 0 ? basePlan.vendorQuotes : templatePreset.vendorQuotes,
    timelineTasks:
      basePlan.timelineTasks.length > 0 ? basePlan.timelineTasks : templatePreset.timelineTasks,
    personalizationRules:
      basePlan.personalizationRules.length > 0
        ? basePlan.personalizationRules
        : templatePreset.personalizationRules
  };
}

/**
 * Scales all monetary amounts in an active plan when toggling between USD and INR
 * so custom line items, audited vendor quotes, and guest rules are never lost or left in the wrong currency scale.
 */
function scalePlanMonetaryValues(plan: EventPlan, newCurrency: CurrencyCode): EventPlan {
  if (plan.currency === newCurrency) return plan;
  const factor =
    newCurrency === 'INR' && plan.currency === 'USD'
      ? USD_TO_INR_RATE
      : newCurrency === 'USD' && plan.currency === 'INR'
      ? 1 / USD_TO_INR_RATE
      : 1;

  const scaleVal = (v: number) => Math.max(1, Math.round(v * factor));

  const convertedBudget = plan.onboarding.budget ? scaleVal(plan.onboarding.budget) : null;

  return {
    ...plan,
    currency: newCurrency,
    onboarding: {
      ...plan.onboarding,
      budget: convertedBudget
    },
    budgetBuckets: plan.budgetBuckets.map((b) => ({
      ...b,
      allocated: scaleVal(b.allocated),
      committed: b.committed ? scaleVal(b.committed) : 0,
      items: b.items.map((item) => ({
        ...item,
        cost: scaleVal(item.cost)
      }))
    })),
    tradeOffScenarios: plan.tradeOffScenarios.map((sc) => ({
      ...sc,
      targetTotalBudget: scaleVal(sc.targetTotalBudget),
      netSavings: scaleVal(sc.netSavings),
      adjustments: sc.adjustments.map((adj) => ({
        ...adj,
        previousAllocated: scaleVal(adj.previousAllocated),
        newAllocated: scaleVal(adj.newAllocated),
        delta: -scaleVal(Math.abs(adj.delta))
      }))
    })),
    vendorQuotes: plan.vendorQuotes.map((vq) => ({
      ...vq,
      headlineQuote: scaleVal(vq.headlineQuote),
      trueLandedCost: scaleVal(vq.trueLandedCost),
      hiddenCharges: vq.hiddenCharges.map((hc) => ({
        ...hc,
        estimatedAmount: scaleVal(hc.estimatedAmount)
      }))
    })),
    personalizationRules: plan.personalizationRules.map((pr) => ({
      ...pr,
      estimatedCostImpact: pr.estimatedCostImpact > 0 ? scaleVal(pr.estimatedCostImpact) : 0
    }))
  };
}

/**
 * Parses the user's chat answer or search query (including multi-field inputs and automatic currency detection)
 * and immediately populates the 5 Core Event Basics below.
 */
function applyInstantUserAnswerToPlan(
  prevPlan: EventPlan,
  userText: string,
  activeStepIdx: number
): { nextPlan: EventPlan; capturedSummary: string[]; suggestedTab: ActiveTab | null } {
  const captured: string[] = [];
  let suggestedTab: ActiveTab | null = null;
  const nextOnboarding = {
    ...prevPlan.onboarding,
    mustHaves: [...prevPlan.onboarding.mustHaves]
  };
  let nextName = prevPlan.name;

  // Check if user is searching for a specific module/tab
  if (/\b(compare\s+vendor|vendor\s+quote|hidden\s+fee|audit\s+quote)\b/i.test(userText)) {
    suggestedTab = 'VENDORS';
  } else if (/\b(show\s+timeline|checklist|task\s+list)\b/i.test(userText)) {
    suggestedTab = 'TIMELINE';
  } else if (/\b(guest\s+comfort|accessibility\s+rule|senior\s+seating)\b/i.test(userText)) {
    suggestedTab = 'PERSONALIZATION';
  }

  // Smart currency + money + guest parser (handles $, USD, ₹, Rs, INR, Lakhs, Crores, k, plain numbers, and relative cuts)
  const moneyParse = parseMoneyAndGuestInput(userText, prevPlan.currency);
  const nextCurrency: CurrencyCode = moneyParse.detectedCurrency || prevPlan.currency || 'USD';

  if (moneyParse.detectedCurrency && moneyParse.detectedCurrency !== prevPlan.currency) {
    captured.push(
      `Detected Currency: ${
        moneyParse.detectedCurrency === 'INR' ? 'Indian Rupee (₹ INR)' : 'US Dollar ($ USD)'
      }`
    );
  }

  const hasExplicitMoneyKeyword =
    /(?:₹|\$|rs\.?|inr|usd|rupee|dollar|lakh|lac|crore|budget|cut|drop|dropped|reduce|save)/i.test(
      userText
    );
  const hasExplicitGuestKeyword =
    /\b\d+\s*(?:guests?|people|persons?|members?|attendees?|pax|family|invitees)\b/i.test(userText);

  if (activeStepIdx === 1 || hasExplicitMoneyKeyword || hasExplicitGuestKeyword) {
    if (
      activeStepIdx === -1 &&
      prevPlan.onboarding.budget &&
      (moneyParse.isRelativeDelta || moneyParse.percentageDelta !== null)
    ) {
      const currentB = prevPlan.onboarding.budget;
      const minFloor = nextCurrency === 'INR' ? 25000 : 500;
      if (moneyParse.percentageDelta !== null) {
        const deltaAmt = Math.round(currentB * (moneyParse.percentageDelta / 100));
        nextOnboarding.budget = Math.max(minFloor, currentB + deltaAmt);
        captured.push(
          `Adjusted Budget (${moneyParse.percentageDelta}%): ${formatMoney(
            currentB,
            nextCurrency
          )} → ${formatMoney(nextOnboarding.budget, nextCurrency)}`
        );
      } else if (moneyParse.budget && moneyParse.budget > 0) {
        const deltaAmt = moneyParse.budget * moneyParse.relativeSign;
        nextOnboarding.budget = Math.max(minFloor, currentB + deltaAmt);
        captured.push(
          `Adjusted Budget (${
            moneyParse.relativeSign < 0 ? '-' : '+'
          }${formatMoney(moneyParse.budget, nextCurrency)}): ${formatMoney(
            currentB,
            nextCurrency
          )} → ${formatMoney(nextOnboarding.budget, nextCurrency)}`
        );
      }
    } else if (moneyParse.budget && moneyParse.budget > 0) {
      nextOnboarding.budget = moneyParse.budget;
      captured.push(`Saved Budget: ${formatMoney(moneyParse.budget, nextCurrency)}`);
    }

    if (moneyParse.guestCount && moneyParse.guestCount > 0) {
      nextOnboarding.guestCount = moneyParse.guestCount;
      captured.push(`Saved Guest Count: ${moneyParse.guestCount} guests`);
    }

    // If on Step 2 and user only gave one number (e.g. "200000" or "5000"), fill sensible default guest count so Step 2 never gets stuck
    if (activeStepIdx === 1) {
      if (nextOnboarding.budget && !nextOnboarding.guestCount) {
        nextOnboarding.guestCount = nextCurrency === 'INR' ? 100 : 65;
        captured.push(`Defaulted Guest Count: ${nextOnboarding.guestCount} guests (editable below)`);
      } else if (!nextOnboarding.budget && nextOnboarding.guestCount) {
        nextOnboarding.budget = nextCurrency === 'INR' ? 250000 : 6000;
        captured.push(
          `Defaulted Budget: ${formatMoney(nextOnboarding.budget, nextCurrency)} (editable below)`
        );
      } else if (!nextOnboarding.budget && !nextOnboarding.guestCount) {
        nextOnboarding.budget = nextCurrency === 'INR' ? 300000 : 6500;
        nextOnboarding.guestCount = nextCurrency === 'INR' ? 100 : 65;
        captured.push(
          `Set Estimate: ${formatMoney(nextOnboarding.budget, nextCurrency)} for ${
            nextOnboarding.guestCount
          } guests`
        );
      }
    }
  }

  const isoDateMatch = userText.match(/\b(202\d-\d{2}-\d{2})\b/);
  if (isoDateMatch && (activeStepIdx === 2 || !nextOnboarding.eventDate)) {
    nextOnboarding.eventDate = isoDateMatch[1];
    captured.push(`Saved Event Date: ${isoDateMatch[1]}`);
  }

  if (activeStepIdx === 0 && !nextOnboarding.occasion.trim()) {
    // Strip out budget/guest/date clauses if the user typed a multi-part query on Step 1
    const cleanOccasion = userText
      .replace(/\b(?:for|with)\s+\d+\s*(?:guests?|people|members?|pax)\b/gi, '')
      .replace(/\b(?:under|budget|with|for)\s*(?:[$₹]|rs\.?|inr|usd)?\s*[\d,]+(?:\s*(?:lakhs?|lacs?|k|dollars?|rupees?))?\b/gi, '')
      .replace(/\bon\s+202\d-\d{2}-\d{2}\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[,.\s-]+|[,.\s-]+$/g, '')
      .trim();
    const finalOccasion = cleanOccasion || userText.trim();
    nextOnboarding.occasion = finalOccasion;
    nextName = `${finalOccasion} Plan`;
    captured.push(`Saved Occasion: "${finalOccasion}"`);
  } else if (activeStepIdx === 2 && !nextOnboarding.eventDate.trim()) {
    nextOnboarding.eventDate = userText.trim();
    captured.push(`Saved Event Date: ${userText.trim()}`);
  } else if (activeStepIdx === 3 && !nextOnboarding.experienceStyle.trim()) {
    nextOnboarding.experienceStyle = userText.trim();
    captured.push(`Saved Event Vibe: "${userText.trim()}"`);
  } else if (activeStepIdx === 4 && nextOnboarding.mustHaves.length === 0) {
    const items = userText
      .split(/,|;|\band\b/i)
      .map((s) => s.trim())
      .filter(Boolean);
    nextOnboarding.mustHaves = items.length > 0 ? items : [userText.trim()];
    nextOnboarding.audienceNotes = userText.trim();
    captured.push(`Saved Must-Haves: ${nextOnboarding.mustHaves.join(' · ')}`);
  }

  const allFiveFilled =
    Boolean(nextOnboarding.occasion.trim()) &&
    Boolean(nextOnboarding.budget && nextOnboarding.guestCount) &&
    Boolean(nextOnboarding.eventDate.trim()) &&
    Boolean(nextOnboarding.experienceStyle.trim()) &&
    nextOnboarding.mustHaves.length > 0;

  let updatedPlan: EventPlan = {
    ...prevPlan,
    name: nextName,
    currency: nextCurrency,
    isOnboardingComplete: allFiveFilled,
    onboarding: nextOnboarding
  };

  if (prevPlan.currency !== nextCurrency && prevPlan.budgetBuckets.length > 0) {
    updatedPlan = scalePlanMonetaryValues(updatedPlan, nextCurrency);
  }

  // If all 5 questions are now answered (or if budget/currency changed after setup), rebuild the buckets cleanly
  if (
    allFiveFilled &&
    (prevPlan.budgetBuckets.length === 0 ||
      prevPlan.onboarding.budget !== nextOnboarding.budget ||
      prevPlan.currency !== nextCurrency)
  ) {
    updatedPlan = buildCompleteEventPlanFromBasics(updatedPlan);
    captured.push(
      `Generated complete ${nextCurrency} (${getCurrencySymbol(
        nextCurrency
      )}) Budget Breakdown, Smart Cuts, Vendor Quotes & Timeline!`
    );
  }

  // Also check if user mentioned a timeline/vendor delay in chat (e.g., "Venue is delayed by 7 days" or "Delay T-01 by 5 days")
  const delayMatch = userText.match(/(?:delay|delayed|late|push|shift).*?(\d+)\s*days?/i);
  if (delayMatch && updatedPlan.timelineTasks.length > 0) {
    const delayDays = Number(delayMatch[1]) || 7;
    const explicitTaskMatch = userText.match(/\b(T-0?\d+)\b/i);
    let targetTask = explicitTaskMatch
      ? updatedPlan.timelineTasks.find(
          (t) => t.id.toLowerCase() === explicitTaskMatch[1].toLowerCase()
        )
      : undefined;

    if (!targetTask) {
      if (/cater|food|menu/i.test(userText)) {
        targetTask = updatedPlan.timelineTasks.find((t) =>
          t.category.toLowerCase().includes('cater')
        );
      } else if (/invite|rsvp|card/i.test(userText)) {
        targetTask = updatedPlan.timelineTasks.find((t) =>
          t.title.toLowerCase().includes('invite')
        );
      } else {
        targetTask = updatedPlan.timelineTasks[0];
      }
    }

    if (targetTask) {
      const { updatedTasks, logEntry } = cascadeTaskDelay(
        updatedPlan.timelineTasks,
        targetTask.id,
        delayDays
      );
      updatedPlan = {
        ...updatedPlan,
        timelineTasks: updatedTasks,
        cascadeLogs: logEntry ? [logEntry, ...updatedPlan.cascadeLogs] : updatedPlan.cascadeLogs
      };
      captured.push(
        `Shifted "${targetTask.title}" by +${delayDays} days and cascaded to ${
          logEntry?.affectedTasks.length || 0
        } dependent task(s) in Step 4: Timeline`
      );
      suggestedTab = 'TIMELINE';
    }
  }

  // Also check if user asked to restore / bring back Sound (or deleted budget category)
  if (
    /\b(?:restore|bring\s+back|recover|re-?add|reset)\b.*?\b(?:sound|audio|mic|speaker|photo|budget)\b/i.test(
      userText
    ) ||
    /\b(?:sound|audio)\s+budget\b.*?\b(?:deleted|back|restore|missing)\b/i.test(userText)
  ) {
    const baseB =
      updatedPlan.onboarding.budget ||
      updatedPlan.budgetBuckets.reduce((s, b) => s + b.allocated, 0) ||
      (nextCurrency === 'INR' ? 350000 : 6500);
    const soundCost =
      nextCurrency === 'INR'
        ? Math.max(8000, Math.round(baseB * 0.04))
        : Math.max(200, Math.round(baseB * 0.04));
    const soundItem = {
      id: `sound-restored-${Date.now()}`,
      name:
        nextCurrency === 'INR'
          ? 'Acoustic Sound Setup & 2 Cordless Mics for Family Speeches'
          : 'Portable Directional PA Speaker & 2 Wireless Speech Microphones',
      cost: soundCost,
      isMustHave: true,
      notes: 'Clear speech projection & warm background music without booming echo'
    };

    const hasPhotoBucket = updatedPlan.budgetBuckets.some((b) =>
      /photo|sound|audio|music/i.test(b.category)
    );
    if (hasPhotoBucket) {
      updatedPlan = {
        ...updatedPlan,
        budgetBuckets: updatedPlan.budgetBuckets.map((b) => {
          if (!/photo|sound|audio|music/i.test(b.category)) return b;
          const alreadyHasSound = b.items.some((i) =>
            /sound|audio|mic|speaker|pa\b/i.test(i.name)
          );
          if (alreadyHasSound && b.allocated > 0) return b;
          return {
            ...b,
            allocated: b.allocated + soundCost,
            items: [...b.items, soundItem]
          };
        })
      };
      captured.push(
        `Restored Sound & Wireless Mic Setup (${formatMoney(
          soundCost,
          nextCurrency
        )}) in Photography & Sound`
      );
      suggestedTab = 'BUDGET';
    }
  }

  return {
    nextPlan: updatedPlan,
    capturedSummary: captured,
    suggestedTab
  };
}

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('atelier_theme');
      return saved ? saved === 'dark' : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('atelier_theme', isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage errors
    }
  }, [isDark]);

  // Start with an empty message list (no redundant "Hi! Welcome..." bubble since Question 1 is already in the search box)
  const [plan, setPlan] = useState<EventPlan>(PRESET_PLANS[2]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('ONBOARDING');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingTradeOffs, setIsGeneratingTradeOffs] = useState(false);
  const [isAuditingQuote, setIsAuditingQuote] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [isEditingSetup, setIsEditingSetup] = useState(false);
  const [showExportSpec, setShowExportSpec] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideStepIndex, setGuideStepIndex] = useState(0);
  const [completedDemoSteps, setCompletedDemoSteps] = useState<number[]>([]);
  const [privacyMask, setPrivacyMask] = useState(false);
  const [appliedSwapIds, setAppliedSwapIds] = useState<string[]>([]);
  const [celebrationMode, setCelebrationMode] = useState<'custom' | 'anniversary' | 'birthday'>('custom');
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const currency = plan.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currency);
  const guidedSteps = getGuidedOnboardingSteps(currency);
  const missingStepIdx = getMissingStepIndex(plan);
  const activeGuidedStep = missingStepIdx !== -1 ? guidedSteps[missingStepIdx] : null;

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages.length]);

  /**
   * 2-Option Currency Switcher: US Dollar ($ USD) vs Indian Rupee (₹ INR)
   */
  const handleSelectCurrency = (newCurrency: CurrencyCode) => {
    if (newCurrency === plan.currency) return;

    setPlan((prev) => {
      // If user is on an unmodified sample preset, switch to the native USD/INR sample preset
      if (
        prev.id === 'tight-budget-family-celebration' &&
        newCurrency === 'INR' &&
        prev.onboarding.budget === 6500
      ) {
        return PRESET_PLANS[1];
      }
      if (
        prev.id === 'indian-family-celebration-inr' &&
        newCurrency === 'USD' &&
        prev.onboarding.budget === 350000
      ) {
        return PRESET_PLANS[0];
      }

      // Otherwise, scale all monetary values in their custom or modified plan seamlessly
      return scalePlanMonetaryValues(prev, newCurrency);
    });
  };

  /**
   * Updates onboarding fields from Manual Edit mode and automatically generates/syncs
   * the full event plan once all 5 basics are filled.
   */
  const handleManualOnboardingUpdate = (
    updater: (prevOnboarding: EventPlan['onboarding']) => EventPlan['onboarding']
  ) => {
    setPlan((prev) => {
      const nextOnboarding = updater(prev.onboarding);
      const allFiveFilled =
        Boolean(nextOnboarding.occasion.trim()) &&
        Boolean(nextOnboarding.budget && nextOnboarding.guestCount) &&
        Boolean(nextOnboarding.eventDate.trim()) &&
        Boolean(nextOnboarding.experienceStyle.trim()) &&
        nextOnboarding.mustHaves.length > 0;

      const updatedBase: EventPlan = {
        ...prev,
        name: nextOnboarding.occasion.trim()
          ? `${nextOnboarding.occasion.trim()} Plan`
          : prev.name,
        isOnboardingComplete: allFiveFilled,
        onboarding: nextOnboarding
      };

      if (
        allFiveFilled &&
        (prev.budgetBuckets.length === 0 ||
          prev.onboarding.budget !== nextOnboarding.budget ||
          prev.onboarding.guestCount !== nextOnboarding.guestCount)
      ) {
        return buildCompleteEventPlanFromBasics(updatedBase);
      }
      return updatedBase;
    });
  };

  const handleSelectPreset = (presetId: string) => {
    const found = PRESET_PLANS.find((p) => p.id === presetId);
    if (!found) return;
    const nextPreset =
      presetId === 'blank-onboarding-intake' ? { ...found, currency: plan.currency } : found;
    setPlan(nextPreset);
    setIsEditingSetup(false);
    setErrorBanner(null);
    setAppliedSwapIds([]);

    if (nextPreset.id === 'blank-onboarding-intake') {
      setCelebrationMode('custom');
      setMessages([]);
      setActiveTab('ONBOARDING');
    } else {
      setCelebrationMode('anniversary');
      setMessages([]);
    }
  };

  /**
   * CelebrationOS Mode Switcher: Switch between Custom Guided Setup, Shaadi/Anniversary Feast, or Milestone Birthday
   */
  const handleSelectCelebrationMode = (mode: 'custom' | 'anniversary' | 'birthday') => {
    setCelebrationMode(mode);
    setAppliedSwapIds([]);
    setIsEditingSetup(false);
    setErrorBanner(null);
    setMessages([]);

    if (mode === 'custom') {
      const blank = PRESET_PLANS.find((p) => p.id === 'blank-onboarding-intake') || PRESET_PLANS[2];
      setPlan({ ...blank, currency });
      setActiveTab('ONBOARDING');
    } else if (mode === 'anniversary') {
      const targetPreset = currency === 'INR' ? PRESET_PLANS[1] : PRESET_PLANS[0];
      setPlan(targetPreset);
    } else if (mode === 'birthday') {
      const isINR = currency === 'INR';
      const baseBday: EventPlan = {
        ...(isINR ? PRESET_PLANS[1] : PRESET_PLANS[0]),
        id: isINR ? 'milestone-bday-inr' : 'milestone-bday-usd',
        name: isINR ? "Dad's 50th Milestone Birthday Gala" : "Dad's 50th Milestone Birthday Bash",
        currency,
        isOnboardingComplete: true,
        onboarding: {
          occasion: isINR
            ? "Dad's 50th Milestone Birthday Family Feast"
            : "Dad's 50th Milestone Birthday Supper",
          budget: isINR ? 280000 : 5200,
          guestCount: isINR ? 90 : 55,
          eventDate: '2027-02-14',
          experienceStyle: isINR
            ? 'Festive evening celebration with live food stations, custom cake & retro music'
            : 'Warm evening supper with live acoustic trio, artisan birthday cake & family toasts',
          mustHaves: isINR
            ? [
                'Live Chaat & Grill Counters',
                'Custom 3-Tier Celebration Cake',
                'Elder Lounge Seating',
                'Candid Photographer'
              ]
            : [
                'Hot Family-Style Supper',
                'Custom Artisan Birthday Cake',
                'Step-Free Senior Seating',
                'Candid Photography'
              ],
          audienceNotes: 'Multi-generational family & close friends including grandparents and kids.'
        }
      };
      setPlan(buildCompleteEventPlanFromBasics(baseBday));
    }
  };

  /**
   * CelebrationOS 1-Click AI Smart Optimization Swap Cards
   */
  const smartOptimizationSwaps =
    currency === 'INR'
      ? [
          {
            id: 'swap-marigold-decor',
            title: 'Seasonal Marigold & Warm Fairy-Light Stage Swap',
            category: 'Decor, Florals & Stationery',
            savings: 18000,
            description:
              'Replace imported orchid arches with lush local marigold drapes + warm brass lanterns while keeping full photo-stage impact.'
          },
          {
            id: 'swap-whatsapp-invites',
            title: 'Interactive WhatsApp + QR RSVP Suite',
            category: 'Decor, Florals & Stationery',
            savings: 12000,
            description:
              'Switch printed boxed cards to bespoke bilingual WhatsApp e-invites with 1-click Google Maps & dietary RSVP.'
          },
          {
            id: 'swap-daytime-slot',
            title: 'Sunday Brunch / Afternoon Banquet Slot',
            category: 'Venue & Spatial',
            savings: 25000,
            description:
              'Daytime banquet timing reduces hall rental & generator backup tariffs by 22% and is easier for senior family members.'
          }
        ]
      : [
          {
            id: 'swap-seasonal-greenery',
            title: 'Seasonal Botanicals & Candlelight Tablescape Swap',
            category: 'Decor, Florals & Stationery',
            savings: 450,
            description:
              'Swap custom floral towers for warm bistro string lights, potted greenery, and hurricane lanterns.'
          },
          {
            id: 'swap-digital-rsvp',
            title: 'Digital QR Save-the-Date & Menu Suite',
            category: 'Decor, Florals & Stationery',
            savings: 300,
            description:
              'Replace printed stationery postage with an interactive digital RSVP portal that tracks guest allergies.'
          },
          {
            id: 'swap-sunday-matinee',
            title: 'Sunday Afternoon Matinee Hall Slot',
            category: 'Venue & Spatial',
            savings: 550,
            description:
              'Shifting from Saturday night to Sunday afternoon lowers venue rental rates and makes travel effortless for elders.'
          }
        ];

  const handleApplySmartSwap = (swap: (typeof smartOptimizationSwaps)[number]) => {
    if (appliedSwapIds.includes(swap.id)) return;
    setAppliedSwapIds((prev) => [...prev, swap.id]);

    setPlan((prev) => {
      const base =
        prev.budgetBuckets.length > 0
          ? prev
          : currency === 'INR'
          ? PRESET_PLANS[1]
          : PRESET_PLANS[0];

      let actualSaved = 0;
      const updatedBuckets = base.budgetBuckets.map((b) => {
        if (b.category.toLowerCase().includes(swap.category.split(' ')[0].toLowerCase())) {
          const nextAlloc = Math.max(Math.round(b.allocated * 0.35), b.allocated - swap.savings);
          actualSaved = b.allocated - nextAlloc;
          return {
            ...b,
            allocated: nextAlloc,
            rationale: `${b.rationale} · Applied AI Swap: ${swap.title}`
          };
        }
        return b;
      });

      const currentBudget =
        base.onboarding.budget || updatedBuckets.reduce((s, b) => s + b.allocated, 0);

      return {
        ...base,
        onboarding: {
          ...base.onboarding,
          budget: Math.max(1000, currentBudget - (actualSaved || swap.savings))
        },
        budgetBuckets: updatedBuckets
      };
    });
  };

  const GUIDE_STEP_TABS: ActiveTab[] = [
    'ONBOARDING',
    'BUDGET',
    'VENDORS',
    'TIMELINE',
    'PERSONALIZATION'
  ];

  const handleSelectGuideStep = (stepIdx: number) => {
    setGuideStepIndex(stepIdx);
    const targetTab = GUIDE_STEP_TABS[stepIdx] || 'ONBOARDING';
    setActiveTab(targetTab);
  };

  /**
   * Executes a live, hands-on demonstration for the current tutorial step so a new user
   * learns how each feature works by seeing real state changes.
   */
  const handleTriggerStepDemo = (stepIdx: number) => {
    const ensurePopulatedPlan = (currPlan: EventPlan): EventPlan => {
      if (currPlan.budgetBuckets.length > 0) return currPlan;
      return currPlan.currency === 'INR' ? PRESET_PLANS[1] : PRESET_PLANS[0];
    };

    if (stepIdx === 0) {
      const sampleId =
        currency === 'INR'
          ? 'indian-family-celebration-inr'
          : 'tight-budget-family-celebration';
      handleSelectPreset(sampleId);
      setActiveTab('ONBOARDING');
    } else if (stepIdx === 1) {
      setPlan((prev) => {
        const base = ensurePopulatedPlan(prev);
        const scenario = base.tradeOffScenarios[0];
        if (!scenario) return base;
        const updatedBuckets = base.budgetBuckets.map((bucket) => {
          const adj = scenario.adjustments.find(
            (a) => a.category.toLowerCase() === bucket.category.toLowerCase()
          );
          if (!adj) return bucket;
          return {
            ...bucket,
            allocated: adj.newAllocated,
            rationale: adj.actionSummary
          };
        });
        return {
          ...base,
          activeTradeOffId: scenario.id,
          onboarding: {
            ...base.onboarding,
            budget: scenario.targetTotalBudget
          },
          budgetBuckets: updatedBuckets
        };
      });
      setActiveTab('BUDGET');
    } else if (stepIdx === 2) {
      setPlan((prev) => {
        const base = ensurePopulatedPlan(prev);
        const isINR = base.currency === 'INR';
        const demoAuditQuote = isINR
          ? {
              id: `vq-demo-${Date.now()}`,
              vendorName: 'Shahi Darbar Banquet & Caterers (Audited Demo)',
              category: 'Catering & Beverage',
              linkedBucketCategory: 'Catering & Beverage',
              headlineQuote: 114000,
              hiddenCharges: [
                {
                  label: '18% GST & Mandatory Service Surcharge',
                  estimatedAmount: 20520,
                  clauseNote: 'Added on top of ₹950/plate advertised quote'
                },
                {
                  label: 'Generator Backup & Live Chaat Stall Setup Fee',
                  estimatedAmount: 24000,
                  clauseNote: 'Fine-print mandatory kitchen & stall charges'
                }
              ],
              trueLandedCost: 158520,
              inclusions: ['120 guest dinner buffet', 'Basic banquet seating'],
              missingExclusions: ['18% tax & service charge', 'Generator & live stall fee'],
              contractRedFlags:
                'Advertised ₹1,14,000 quote jumps by +39% (+₹44,520 in hidden charges) to ₹1,58,520.',
              negotiationTip:
                'Ask for an all-inclusive flat plate rate of ₹1,100/plate with generator and stall charges waived.',
              isSelected: false
            }
          : {
              id: `vq-demo-${Date.now()}`,
              vendorName: 'Bella Vista Banquet Hall (Audited Demo)',
              category: 'Catering & Beverage',
              linkedBucketCategory: 'Catering & Beverage',
              headlineQuote: 1885,
              hiddenCharges: [
                {
                  label: '21% Administrative Production Surcharge',
                  estimatedAmount: 396,
                  clauseNote: 'Mandatory fine-print fee on food & beverage'
                },
                {
                  label: '18% Automatic Gratuity & China Rental ($4/guest)',
                  estimatedAmount: 599,
                  clauseNote: 'Automatically billed on pre-tax invoice'
                }
              ],
              trueLandedCost: 2880,
              inclusions: ['Buffet dinner for 65 guests', 'Standard tables'],
              missingExclusions: ['21% admin fee', '18% gratuity & china rental'],
              contractRedFlags:
                'Advertised $1,885 quote jumps by +53% (+$995 in hidden charges) to $2,880.',
              negotiationTip:
                'Request a flat all-inclusive package cap of $2,300 before signing.',
              isSelected: false
            };

        return {
          ...base,
          vendorQuotes: [
            demoAuditQuote,
            ...base.vendorQuotes.filter((q) => !q.vendorName.includes('(Audited Demo)'))
          ]
        };
      });
      setActiveTab('VENDORS');
    } else if (stepIdx === 3) {
      setPlan((prev) => {
        const base = ensurePopulatedPlan(prev);
        const firstTask = base.timelineTasks[0];
        if (!firstTask) return base;
        const { updatedTasks, logEntry } = cascadeTaskDelay(
          base.timelineTasks,
          firstTask.id,
          7
        );
        return {
          ...base,
          timelineTasks: updatedTasks,
          cascadeLogs: logEntry ? [logEntry, ...base.cascadeLogs] : base.cascadeLogs
        };
      });
      setActiveTab('TIMELINE');
    } else if (stepIdx === 4) {
      setPlan((prev) => {
        const base = ensurePopulatedPlan(prev);
        const isINR = base.currency === 'INR';
        const newRule = {
          id: `pers-demo-${Date.now()}`,
          segment: 'Grandparents & Senior Family Members (Demo Rule)',
          category: 'Accessibility' as const,
          observation: 'Long buffet queues and stairs cause fatigue for older relatives.',
          recommendation:
            'Reserve Table 1 within 20ft of the entrance and assign dedicated table-service platters so seniors never wait in line.',
          estimatedCostImpact: isINR ? 5000 : 150,
          applied: true
        };
        return {
          ...base,
          personalizationRules: [
            newRule,
            ...base.personalizationRules.filter((r) => !r.segment.includes('(Demo Rule)'))
          ]
        };
      });
      setActiveTab('PERSONALIZATION');
    }

    setCompletedDemoSteps((prev) => (prev.includes(stepIdx) ? prev : [...prev, stepIdx]));
  };

  const maskTextMoney = (val: number) =>
    privacyMask ? (currency === 'INR' ? '₹••,•••' : '$•,•••') : formatMoney(val, currency);

  const onboardingChecks = [
    {
      id: 'q1',
      label: '1. Occasion',
      filled: Boolean(plan.onboarding.occasion.trim()),
      value: plan.onboarding.occasion || 'Waiting for your answer in chat above...'
    },
    {
      id: 'q2',
      label: `2. Budget (${currencySymbol}) & Guests`,
      filled: Boolean(plan.onboarding.budget && plan.onboarding.guestCount),
      value:
        plan.onboarding.budget && plan.onboarding.guestCount
          ? `${maskTextMoney(plan.onboarding.budget)} · ${
              plan.onboarding.guestCount
            } guests`
          : plan.onboarding.budget
          ? `${maskTextMoney(plan.onboarding.budget)} · Waiting for guest count...`
          : plan.onboarding.guestCount
          ? `${plan.onboarding.guestCount} guests · Waiting for budget...`
          : 'Waiting for your answer in chat above...'
    },
    {
      id: 'q3',
      label: '3. Event Date',
      filled: Boolean(plan.onboarding.eventDate.trim()),
      value: plan.onboarding.eventDate || 'Waiting for your answer in chat above...'
    },
    {
      id: 'q4',
      label: '4. Event Vibe',
      filled: Boolean(plan.onboarding.experienceStyle.trim()),
      value: plan.onboarding.experienceStyle || 'Waiting for your answer in chat above...'
    },
    {
      id: 'q5',
      label: '5. Must-Haves',
      filled: plan.onboarding.mustHaves.length > 0,
      value:
        plan.onboarding.mustHaves.length > 0
          ? plan.onboarding.mustHaves.join(' · ')
          : 'Waiting for your answer in chat above...'
    }
  ];

  const completedOnboardingCount = onboardingChecks.filter((c) => c.filled).length;

  /**
   * Formats inline **bold** segments into clean <strong> elements so raw markdown asterisks never appear in the UI
   */
  const renderFormattedMessage = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={idx} className="font-extrabold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const sendMessageToAssistant = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isSending) return;

    const currentMissingIdx = getMissingStepIndex(plan);

    // 1. Immediately apply the user's answer (and auto-detect USD vs INR!) into the Core Event Basics card below
    const { nextPlan, capturedSummary, suggestedTab } = applyInstantUserAnswerToPlan(
      plan,
      trimmed,
      currentMissingIdx
    );
    setPlan(nextPlan);

    if (suggestedTab) {
      setActiveTab(suggestedTab);
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const nextMissingIdxAfterInstant = getMissingStepIndex(nextPlan);

    // CASE A: Still in the middle of the 5-step guided onboarding (Questions 1 -> 4)
    // Confirm the saved item concisely WITHOUT repeating the next question (which is displayed in the Active Question banner below)
    if (currentMissingIdx !== -1 && nextMissingIdxAfterInstant !== -1) {
      const summaryLine =
        capturedSummary.length > 0
          ? capturedSummary.join(' · ')
          : 'Answer saved to your 5 Core Event Basics below';
      const instantFollowUp: ChatMessage = {
        id: `ast-guided-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `✓ ${summaryLine}`,
        structuredPatchSummary: []
      };
      setMessages((prev) => [...prev, userMsg, instantFollowUp]);
      setUserInput('');
      return;
    }

    // CASE B: User just answered the final 5th onboarding question!
    // Complete IMMEDIATELY without blocking on a network call so it NEVER gets stuck
    if (currentMissingIdx !== -1 && nextMissingIdxAfterInstant === -1) {
      const totalFormatted = formatMoney(nextPlan.onboarding.budget || 0, nextPlan.currency);
      const instantCompletionMsg: ChatMessage = {
        id: `ast-complete-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `All **5 Core Event Basics** are now complete and saved below!\n\nI have created your **${totalFormatted}** event plan for **${nextPlan.onboarding.guestCount} guests** (${
          nextPlan.currency === 'INR' ? 'Indian Rupees ₹' : 'US Dollars $'
        }):\n• **Step 02: Budget & Smart Cuts**: Full category breakdown & smart 15% cost-saving trade-off plan.\n• **Step 03: Vendor Quotes**: Side-by-side quote comparison with hidden fee alerts.\n• **Step 04: Adaptive Timeline**: Step-by-step checklist with task dependencies.\n• **Step 05: Guest Comfort**: Accessibility & comfort rules tailored to your guests.`,
        structuredPatchSummary: capturedSummary
      };
      setMessages((prev) => [...prev, userMsg, instantCompletionMsg]);
      setUserInput('');
      return;
    }

    // CASE C: Post-onboarding follow-up chat/search message
    setMessages((prev) => [...prev, userMsg]);
    setUserInput('');
    setIsSending(true);
    setErrorBanner(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch('/api/planner/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          userMessage: trimmed,
          currentPlan: nextPlan,
          conversationHistory: messages.slice(-4).map((m) => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      window.clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to reach event planning assistant.');
      }

      if (data.shouldUpdatePlan && data.updatedOnboarding) {
        const updOnb = data.updatedOnboarding;
        setPlan((prev) => {
          const nextCurr: CurrencyCode =
            data.detectedCurrency === 'INR' || data.detectedCurrency === 'USD'
              ? data.detectedCurrency
              : prev.currency;
          const merged: EventPlan = {
            ...prev,
            currency: nextCurr,
            onboarding: {
              occasion: updOnb.occasion || prev.onboarding.occasion,
              budget: updOnb.budget ?? prev.onboarding.budget,
              guestCount: updOnb.guestCount ?? prev.onboarding.guestCount,
              eventDate: updOnb.eventDate || prev.onboarding.eventDate,
              experienceStyle: updOnb.experienceStyle || prev.onboarding.experienceStyle,
              mustHaves:
                Array.isArray(updOnb.mustHaves) && updOnb.mustHaves.length > 0
                  ? updOnb.mustHaves
                  : prev.onboarding.mustHaves,
              audienceNotes: prev.onboarding.audienceNotes
            }
          };
          return buildCompleteEventPlanFromBasics(merged);
        });
      }

      const combinedPatches = [
        ...capturedSummary,
        ...(Array.isArray(data.appliedChangesSummary) ? data.appliedChangesSummary : [])
      ];

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content:
          data.assistantMarkdown ||
          'Your event plan has been updated! Check the Core Event Basics below or open the Budget & Cuts tab.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        structuredPatchSummary: combinedPatches
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      window.clearTimeout(timeoutId);
      setMessages((prev) => [
        ...prev,
        {
          id: `ast-fallback-${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content:
            capturedSummary.length > 0
              ? `Updated your event plan in **${
                  nextPlan.currency === 'INR' ? 'Indian Rupees (₹)' : 'US Dollars ($)'
                }**! Your changes are saved in the **5 Core Event Basics** below and across the **Budget & Smart Cuts** tab.`
              : `Your **${formatMoney(
                  nextPlan.onboarding.budget || 0,
                  nextPlan.currency
                )}** plan for **${
                  nextPlan.onboarding.guestCount || 65
                } guests** is ready. You can adjust any category in **Step 02: Budget & Smart Cuts**, compare quotes in **Step 03: Vendor Quotes**, or edit any of the **5 Core Event Basics** below.`,
          structuredPatchSummary: capturedSummary
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleRequestAiTradeOffs = async (
    newBudget: number,
    newGuestCount: number,
    note: string
  ) => {
    setIsGeneratingTradeOffs(true);
    setErrorBanner(null);
    try {
      const response = await fetch('/api/planner/tradeoffs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPlan: plan,
          newBudget,
          newGuestCount,
          constraintNote: note
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to synthesize trade-offs.');
      }

      if (Array.isArray(data.scenarios) && data.scenarios.length > 0) {
        setPlan((prev) => ({
          ...prev,
          tradeOffScenarios: [...data.scenarios, ...prev.tradeOffScenarios]
        }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error generating trade-offs.';
      setErrorBanner(msg);
    } finally {
      setIsGeneratingTradeOffs(false);
    }
  };

  const handleAuditVendorQuote = async (
    vendorName: string,
    category: string,
    rawQuoteDescription: string
  ) => {
    setIsAuditingQuote(true);
    setErrorBanner(null);
    try {
      const response = await fetch('/api/planner/vendor-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName,
          category,
          rawQuoteDescription,
          currentPlan: plan
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to audit vendor quote.');
      }

      if (data.quoteOption) {
        const newQuote = {
          ...data.quoteOption,
          id: `vq-audit-${Date.now()}`,
          isSelected: false
        };
        setPlan((prev) => ({
          ...prev,
          vendorQuotes: [newQuote, ...prev.vendorQuotes]
        }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error auditing vendor quote.';
      setErrorBanner(msg);
    } finally {
      setIsAuditingQuote(false);
    }
  };

  // Clean 5-Slide Workflow Navigation (no duplicate budget/date values!)
  const workflowSteps: Array<{
    tab: ActiveTab;
    stepNum: string;
    label: string;
    badge: string;
    icon: React.ReactNode;
  }> = [
    {
      tab: 'ONBOARDING',
      stepNum: '01',
      label: 'AI Co-Pilot & Setup',
      badge: `${completedOnboardingCount}/5 Basics`,
      icon: <MessageSquare className="w-4 h-4" />
    },
    {
      tab: 'BUDGET',
      stepNum: '02',
      label: 'Budget & Smart Cuts',
      badge: `${plan.budgetBuckets.length} Buckets`,
      icon: <PieChart className="w-4 h-4" />
    },
    {
      tab: 'VENDORS',
      stepNum: '03',
      label: 'Vendor Quotes',
      badge: `${plan.vendorQuotes.length} Quotes`,
      icon: <Scale className="w-4 h-4" />
    },
    {
      tab: 'TIMELINE',
      stepNum: '04',
      label: 'Adaptive Timeline',
      badge: `${plan.timelineTasks.length} Tasks`,
      icon: <Calendar className="w-4 h-4" />
    },
    {
      tab: 'PERSONALIZATION',
      stepNum: '05',
      label: 'Guest Comfort',
      badge: `${plan.personalizationRules.length} Rules`,
      icon: <HeartHandshake className="w-4 h-4" />
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] dark:bg-[#120E22] text-[#1C1427] dark:text-[#F8FAFC] selection:bg-violet-600 selection:text-white transition-colors">
      {/* Unified Top Application Bar Inspired by CelebrationOS */}
      <header className="sticky top-0 z-30 bg-[#FBF9F5]/95 dark:bg-[#151024]/95 backdrop-blur-md border-b border-[#E5DDCF] dark:border-[#2A2244]">
        <div className="max-w-[1240px] w-full mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left: CelebrationOS Festive Brand Identity + Mode Switcher Pills */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('ONBOARDING');
              }}
              className="flex items-center gap-3 group shrink-0"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6D28D9] via-[#EC4899] to-[#FF5E14] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-amber-100" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-extrabold tracking-tight bg-gradient-to-r from-[#6D28D9] via-[#EC4899] to-[#FF5E14] dark:from-violet-300 dark:via-pink-300 dark:to-amber-300 bg-clip-text text-transparent font-display leading-none">
                    Atelier CelebrationOS
                  </span>
                  <span className="hidden xl:inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                    GenAI Planner
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5 truncate max-w-[240px] sm:max-w-[300px]">
                  {plan.onboarding.occasion.trim()
                    ? plan.onboarding.occasion
                    : 'Interactive Event & Budget Co-Pilot'}
                </div>
              </div>
            </a>

            {/* Celebration Mode Switcher Pills (Like CelebrationOS: Custom, Shaadi/Anniversary, Milestone B'day) */}
            <div className="inline-flex flex-wrap items-center p-1 bg-white dark:bg-[#1E1736] border border-[#E5DDCF] dark:border-[#2E254D] rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => handleSelectCelebrationMode('custom')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  celebrationMode === 'custom' && plan.budgetBuckets.length === 0
                    ? 'bg-gradient-to-r from-[#6D28D9] to-[#EC4899] text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-violet-700 dark:hover:text-white'
                }`}
              >
                <span>✨ Custom Setup</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectCelebrationMode('anniversary')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  celebrationMode === 'anniversary' && plan.budgetBuckets.length > 0
                    ? 'bg-gradient-to-r from-[#FF5E14] to-[#EC4899] text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-white'
                }`}
              >
                <span>💍 Shaadi / Anniversary</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectCelebrationMode('birthday')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  celebrationMode === 'birthday'
                    ? 'bg-gradient-to-r from-[#6D28D9] to-[#FF5E14] text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-violet-700 dark:hover:text-white'
                }`}
              >
                <span>🎂 Milestone B&apos;day</span>
              </button>
            </div>
          </div>

          {/* Right: Dedicated Global Control Dock (Currency Switch, Privacy Mask, App Guide, Export, Theme, Demo CTA) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Tactile Money / Currency Segmented Switch ($ USD | ₹ INR) */}
            <div
              className="inline-flex items-center p-1 bg-white dark:bg-[#1E1736] border border-[#E5DDCF] dark:border-[#2E254D] rounded-xl shadow-2xs"
              role="group"
              aria-label="Currency Selector"
            >
              <button
                type="button"
                onClick={() => handleSelectCurrency('USD')}
                className={`px-2.5 py-1 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 min-w-[58px] ${
                  currency === 'USD'
                    ? 'bg-gradient-to-r from-[#6D28D9] to-[#EC4899] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="font-mono">$</span>
                <span>USD</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectCurrency('INR')}
                className={`px-2.5 py-1 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 min-w-[58px] ${
                  currency === 'INR'
                    ? 'bg-gradient-to-r from-[#FF5E14] to-[#EC4899] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="font-mono">₹</span>
                <span>INR</span>
              </button>
            </div>

            {/* 2. Privacy Mask Button (CelebrationOS Vendor Screen-Share Mode) */}
            <button
              type="button"
              onClick={() => setPrivacyMask((m) => !m)}
              title={
                privacyMask
                  ? 'Show Exact Budget Figures'
                  : 'Mask Budget Figures for Screen Sharing'
              }
              className={`px-2.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl border flex items-center justify-center gap-1.5 xl:min-w-[88px] cursor-pointer transition-colors ${
                privacyMask
                  ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                  : 'bg-white dark:bg-[#1E1736] border-[#E5DDCF] dark:border-[#2E254D] text-slate-700 dark:text-slate-200 hover:border-violet-400'
              }`}
            >
              {privacyMask ? (
                <EyeOff className="w-4 h-4 shrink-0" />
              ) : (
                <Eye className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
              )}
              <span className="hidden xl:inline">{privacyMask ? 'Masked' : 'Privacy'}</span>
            </button>

            {/* App Guide (Interactive Walkthrough) Button */}
            <button
              type="button"
              onClick={() => {
                setIsGuideOpen((v) => !v);
              }}
              className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl border flex items-center justify-center gap-1.5 min-w-[114px] cursor-pointer transition-colors ${
                isGuideOpen
                  ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-xs'
                  : 'text-violet-800 dark:text-violet-200 bg-violet-100/80 dark:bg-violet-950/70 border-violet-300 dark:border-violet-800 hover:bg-violet-200/70'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>{isGuideOpen ? 'Close Guide' : 'App Guide'}</span>
            </button>

            {/* 4. Export Modal Button */}
            <button
              type="button"
              onClick={() => setShowExportSpec(true)}
              className="px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1E1736] border border-[#E5DDCF] dark:border-[#2E254D] hover:border-violet-400 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <FileCode className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
              <span>Export</span>
            </button>

            {/* 5. Dark / Light Mode Toggle Button (Fixed min-width so label never shifts dock) */}
            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              title={isDark ? 'Switch to Warm Ivory Light Mode' : 'Switch to Royal Plum Dark Mode'}
              className="px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1E1736] border border-[#E5DDCF] dark:border-[#2E254D] hover:border-violet-400 rounded-xl flex items-center justify-center gap-1.5 md:min-w-[82px] cursor-pointer transition-colors"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="hidden md:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-violet-700 shrink-0" />
                  <span className="hidden md:inline">Dark</span>
                </>
              )}
            </button>

            {/* 6. Try Demo Event / Start New Event CTA */}
            <button
              type="button"
              onClick={() =>
                plan.budgetBuckets.length === 0 && completedOnboardingCount === 0
                  ? handleSelectCelebrationMode('anniversary')
                  : handleSelectCelebrationMode('custom')
              }
              className="px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#FF5E14] via-[#EC4899] to-[#6D28D9] hover:opacity-95 rounded-xl transition-opacity whitespace-nowrap cursor-pointer shadow-sm flex items-center justify-center gap-1.5 min-w-[142px]"
            >
              {plan.budgetBuckets.length === 0 && completedOnboardingCount === 0 ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Try Demo Event</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>Start New Event</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Export Modal Dialog */}
      {showExportSpec && (
        <StructuredOutputSection plan={plan} onClose={() => setShowExportSpec(false)} />
      )}

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-[1240px] w-full mx-auto px-4 sm:px-6 py-5 space-y-6">
        {/* Interactive 5-Step App Guide & Live Demo Coach */}
        <UserGuideBanner
          isOpen={isGuideOpen}
          currentStepIndex={guideStepIndex}
          currency={currency}
          hasCompletedDemoOnStep={completedDemoSteps.includes(guideStepIndex)}
          onStartGuide={() => {
            setIsGuideOpen(true);
            handleSelectGuideStep(0);
          }}
          onCloseGuide={() => setIsGuideOpen(false)}
          onSelectStep={handleSelectGuideStep}
          onTriggerStepDemo={handleTriggerStepDemo}
          onResetToFreshPlan={() => {
            setIsGuideOpen(false);
            handleSelectCelebrationMode('custom');
          }}
        />

        {/* Compact 5-Slide Workflow Navigation Bar */}
        <nav
          aria-label="Event Planning Workflow Slides"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5"
        >
          {workflowSteps.map((step) => {
            const isActive = activeTab === step.tab;
            return (
              <button
                key={step.tab}
                type="button"
                onClick={() => setActiveTab(step.tab)}
                className={`px-4 py-3 rounded-2xl text-left border-2 transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#EC4899] border-transparent text-white shadow-md'
                    : 'bg-white dark:bg-[#1A142D] border-[#E5DDCF] dark:border-[#2A2244] text-slate-800 dark:text-slate-200 hover:border-violet-400 dark:hover:border-violet-600 festive-card-glow'
                }`}
              >
                <div className="min-w-0">
                  <div
                    className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
                      isActive ? 'text-amber-200' : 'text-violet-600 dark:text-violet-400'
                    }`}
                  >
                    Slide {step.stepNum} · {step.badge}
                  </div>
                  <div className="text-sm sm:text-base font-bold truncate mt-0.5">
                    {step.label}
                  </div>
                </div>
                <span
                  className={`shrink-0 ${
                    isActive ? 'text-white' : 'text-violet-500 dark:text-violet-400'
                  }`}
                >
                  {step.icon}
                </span>
              </button>
            );
          })}
        </nav>

        {errorBanner && (
          <div className="p-4 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-2xl flex items-center justify-between gap-4 text-base text-red-800 dark:text-red-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
              <span>{errorBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="underline font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* SLIDE 1: AI CHATBOT IMMEDIATELY AT THE TOP -> AUTO-FILLS 5 CORE EVENT BASICS BELOW (ZERO DUPLICATE DATA) */}
        {activeTab === 'ONBOARDING' && (
          <div className="space-y-6">
            {/* 1. FIRST ELEMENT ON SLIDE 1: AI QUESTION-ANSWER & SEARCH STUDIO */}
            <section className="bg-white dark:bg-[#1A142D] border-2 border-violet-500/80 dark:border-violet-500/70 rounded-3xl overflow-hidden festive-card-glow">
              {/* Festive CelebrationOS Studio Header with Quick Celebration Switcher & 5-Dot Progress */}
              <div className="px-6 py-4 bg-gradient-to-r from-[#2E1065] via-[#6D28D9] to-[#BE185D] text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                        AI Event Search & Guided Setup Co-Pilot ({currencySymbol} {currency})
                      </h1>
                      <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-200 border border-amber-300/30 rounded-full">
                        Live Sync
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-pink-100 mt-0.5">
                      Pick a 1-click answer or type below — every answer automatically builds your{' '}
                      <strong>5 Core Event Basics</strong> and live budget.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {/* Visual 5-Dot Progress Indicator */}
                  <div className="flex items-center gap-1.5 bg-black/25 px-3 py-1.5 rounded-xl border border-white/15">
                    {onboardingChecks.map((c, idx) => (
                      <span
                        key={c.id}
                        title={c.label}
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${
                          c.filled
                            ? 'bg-emerald-400'
                            : missingStepIdx === idx
                            ? 'bg-amber-400 animate-pulse'
                            : 'bg-white/30'
                        }`}
                      />
                    ))}
                    <span className="ml-1.5 text-xs font-mono font-bold text-white">
                      {completedOnboardingCount}/5 Ready
                    </span>
                  </div>

                  {completedOnboardingCount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSelectCelebrationMode('custom')}
                      title="Restart 5 Questions"
                      className="px-3 py-1.5 text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Chat
                    </button>
                  )}
                </div>
              </div>

              {/* 1. Active Question & 1-Click Quick Answer Chips LOCKED AT TOP (Never shifts downwards on click) */}
              <div className="px-5 py-4 bg-gradient-to-r from-violet-50/90 via-pink-50/60 to-amber-50/70 dark:from-[#211938] dark:via-[#24183B] dark:to-[#1F1735] border-b border-[#E5DDCF] dark:border-[#2A2244]">
                {activeGuidedStep ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-base sm:text-lg font-extrabold text-violet-950 dark:text-amber-200">
                        {activeGuidedStep.question}
                      </div>
                      <span className="text-xs font-semibold text-violet-700 dark:text-pink-300 bg-white/80 dark:bg-white/10 px-2.5 py-1 rounded-full border border-violet-200 dark:border-white/10">
                        Pick a 1-click option or type below
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#FF5E14] dark:text-amber-300">
                        1-Click Answers:
                      </span>
                      {activeGuidedStep.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => sendMessageToAssistant(suggestion)}
                          className="px-3.5 py-2 text-xs sm:text-sm font-bold bg-white dark:bg-[#18122B] border border-violet-200 dark:border-violet-800/80 hover:border-[#FF5E14] dark:hover:border-pink-400 hover:bg-amber-50/60 dark:hover:bg-violet-950/60 text-slate-800 dark:text-slate-100 rounded-xl transition-all cursor-pointer shadow-2xs"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/70 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          All 5 Core Basics Ready · Instant AI Prompts:
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            sendMessageToAssistant(
                              currency === 'INR'
                                ? 'Cut our budget by ₹50,000 and keep hot food counters.'
                                : 'Our budget dropped by $1,000. Keep hot family dinner.'
                            )
                          }
                          className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-[#18122B] border border-violet-200 dark:border-violet-800 hover:border-[#FF5E14] rounded-xl text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs"
                        >
                          {currency === 'INR'
                            ? '✂️ Cut budget by ₹50,000'
                            : '✂️ Cut budget by $1,000'}
                        </button>
                        <button
                          type="button"
                          onClick={() => sendMessageToAssistant('Venue is delayed by 7 days')}
                          className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-[#18122B] border border-violet-200 dark:border-violet-800 hover:border-[#FF5E14] rounded-xl text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs"
                        >
                          ⏳ Delay Venue +7 Days
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('BUDGET')}
                        className="px-4 py-1.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#059669] to-[#10B981] hover:opacity-95 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        Open Slide 02: Budget & Donut Chart
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* CelebrationOS Interactive 1-Click AI Optimization Proposal Cards */}
                    <div className="pt-2 border-t border-violet-200/70 dark:border-violet-900/60">
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-violet-800 dark:text-violet-300">
                          <Zap className="w-3.5 h-3.5 text-[#FF5E14]" />
                          <span>CelebrationOS 1-Click Smart Optimization Swaps</span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Click any swap to trim costs without hurting guest food or comfort
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {smartOptimizationSwaps.map((swap) => {
                          const isApplied = appliedSwapIds.includes(swap.id);
                          return (
                            <div
                              key={swap.id}
                              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                                isApplied
                                  ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700'
                                  : 'bg-white dark:bg-[#17122A] border-[#E5DDCF] dark:border-[#2E254D] hover:border-violet-400'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-violet-700 dark:text-pink-300 bg-violet-50 dark:bg-violet-950/70 px-2 py-0.5 rounded-md">
                                    {swap.category}
                                  </span>
                                  <span className="text-xs font-mono font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-lg">
                                    Save {maskTextMoney(swap.savings)}
                                  </span>
                                </div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                  {swap.title}
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                                  {swap.description}
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={isApplied}
                                onClick={() => handleApplySmartSwap(swap)}
                                className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                  isApplied
                                    ? 'bg-emerald-600 text-white cursor-default'
                                    : 'bg-gradient-to-r from-[#6D28D9] to-[#EC4899] hover:opacity-95 text-white shadow-2xs'
                                }`}
                              >
                                {isApplied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Swap Applied to Budget</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Apply Swap (-{maskTextMoney(swap.savings)})</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Search & Type Engine Directly BELOW the Questions */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessageToAssistant(userInput);
                }}
                className="p-4 sm:p-5 bg-white dark:bg-[#1A142D] flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
              >
                <div className="relative flex-1">
                  <Search className="w-5 h-5 text-violet-500 dark:text-pink-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={
                      activeGuidedStep
                        ? activeGuidedStep.placeholder
                        : currency === 'INR'
                        ? "Search or type an adjustment (e.g., 'Cut budget by ₹50,000', 'Venue delayed by 7 days', 'Compare vendor quotes')..."
                        : "Search or type an adjustment (e.g., 'Budget dropped by $1,000', 'Venue delayed by 7 days', 'Compare vendor quotes')..."
                    }
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    disabled={isSending}
                    className="w-full pl-11 pr-4 py-3.5 text-base bg-[#FBF9F5] dark:bg-[#120E22] border-2 border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-2xl focus:outline-none focus:border-violet-600 dark:focus:border-pink-400 shadow-2xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSending || !userInput.trim()}
                  className="px-6 py-3.5 text-base font-bold text-white bg-gradient-to-r from-[#FF5E14] via-[#EC4899] to-[#6D28D9] hover:opacity-95 rounded-2xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  Send / Search
                </button>
              </form>

              {/* 3. Conversation History Feed BELOW the Input Bar (Scrolls internally so the Active Question & Options never move downwards) */}
              {(messages.length > 0 || isSending) && (
                <div
                  ref={chatContainerRef}
                  className="p-4 sm:p-5 space-y-2.5 max-h-[220px] overflow-y-auto border-t border-[#E5DDCF] dark:border-[#2A2244] bg-gradient-to-b from-[#FBF9F5] to-white dark:from-[#140F23] dark:to-[#1A142D]"
                >
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-2xl rounded-2xl px-4 py-2.5 text-sm sm:text-base leading-relaxed whitespace-pre-wrap shadow-2xs ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-[#6D28D9] to-[#EC4899] text-white font-semibold'
                            : 'bg-emerald-50/80 dark:bg-[#221A3A] border border-emerald-200 dark:border-[#332854] text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {renderFormattedMessage(msg.content)}

                        {msg.structuredPatchSummary && msg.structuredPatchSummary.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/80">
                            <div className="font-bold text-emerald-700 dark:text-emerald-400 mb-1 text-xs sm:text-sm flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Saved to 5 Core Event Basics Below:</span>
                            </div>
                            <ul className="list-disc pl-5 space-y-0.5 text-sm text-slate-700 dark:text-slate-300">
                              {msg.structuredPatchSummary.map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isSending && (
                    <div className="p-3.5 bg-white dark:bg-[#221A3A] border border-violet-200 dark:border-violet-800 rounded-2xl text-sm sm:text-base text-slate-700 dark:text-slate-200 flex items-center gap-3 shadow-2xs">
                      <Sparkles className="w-5 h-5 animate-spin text-violet-600 dark:text-pink-400" />
                      <span>Updating your celebration plan...</span>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* 2. BELOW THE CHATBOT: 5 CORE EVENT BASICS (WRITTEN ONCE — NEVER DUPLICATED) */}
            <section className="bg-white dark:bg-[#1A142D] border border-[#E5DDCF] dark:border-[#2A2244] rounded-3xl p-6 space-y-5 festive-card-glow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5DDCF] dark:border-[#2A2244]">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      Your 5 Core Event Basics
                    </h2>
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300">
                      {completedOnboardingCount}/5 Saved
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    Auto-filled from your answers above — or switch celebration presets in the top
                    bar anytime.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingSetup((v) => !v)}
                    className="px-4 py-2 text-sm font-bold text-violet-900 dark:text-violet-200 bg-violet-100/80 dark:bg-violet-950/70 hover:bg-violet-200/80 border border-violet-200 dark:border-violet-800 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    {isEditingSetup ? (
                      <>
                        <X className="w-4 h-4" />
                        Done Manual Edit
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-4 h-4" />
                        Edit Manually
                      </>
                    )}
                  </button>
                </div>
              </div>

              {!isEditingSetup ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {onboardingChecks.map((check, index) => {
                    const isCurrentQuestion = missingStepIdx === index;
                    const cardAccentBorders = [
                      'border-l-4 border-l-[#6D28D9]',
                      'border-l-4 border-l-[#FF5E14]',
                      'border-l-4 border-l-[#059669]',
                      'border-l-4 border-l-[#EC4899]',
                      'border-l-4 border-l-[#F59E0B]'
                    ];
                    return (
                      <div
                        key={check.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          cardAccentBorders[index % cardAccentBorders.length]
                        } ${
                          check.filled
                            ? 'bg-[#FBF9F5]/90 dark:bg-[#211938] border-[#E5DDCF] dark:border-[#342856]'
                            : isCurrentQuestion
                            ? 'bg-violet-50/70 dark:bg-violet-950/30 border-violet-500 dark:border-pink-400 shadow-xs'
                            : 'bg-slate-50/70 dark:bg-[#161126] border-[#E5DDCF] dark:border-[#2A2244]'
                        } ${index === 4 ? 'md:col-span-2 lg:col-span-2' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            {check.label}
                          </span>
                          {check.filled ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Saved
                            </span>
                          ) : isCurrentQuestion ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-gradient-to-r from-[#6D28D9] to-[#EC4899] px-2.5 py-0.5 rounded-full">
                              Asking Now
                            </span>
                          ) : (
                            <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                        </div>
                        <div
                          className={`mt-2 text-base font-bold leading-snug ${
                            check.filled
                              ? 'text-slate-900 dark:text-white'
                              : 'text-slate-400 dark:text-slate-500 italic font-normal'
                          }`}
                        >
                          {check.value}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Manual Override Inputs — All 5 Fields Auto-Build the Event Plan When Completed */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      1. Occasion
                    </label>
                    <input
                      type="text"
                      value={plan.onboarding.occasion}
                      onChange={(e) =>
                        handleManualOnboardingUpdate((prev) => ({
                          ...prev,
                          occasion: e.target.value
                        }))
                      }
                      className="mt-1.5 w-full px-4 py-2.5 text-base bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Currency
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => handleSelectCurrency(e.target.value as CurrencyCode)}
                        className="mt-1.5 w-full px-3 py-2.5 text-base font-bold bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
                      >
                        <option value="USD">$ USD</option>
                        <option value="INR">₹ INR</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        2a. Budget ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        value={plan.onboarding.budget ?? ''}
                        onChange={(e) =>
                          handleManualOnboardingUpdate((prev) => ({
                            ...prev,
                            budget: e.target.value ? Number(e.target.value) : null
                          }))
                        }
                        className="mt-1.5 w-full px-4 py-2.5 text-base font-mono bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        2b. Guests
                      </label>
                      <input
                        type="number"
                        value={plan.onboarding.guestCount ?? ''}
                        onChange={(e) =>
                          handleManualOnboardingUpdate((prev) => ({
                            ...prev,
                            guestCount: e.target.value ? Number(e.target.value) : null
                          }))
                        }
                        className="mt-1.5 w-full px-4 py-2.5 text-base font-mono bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      3. Event Date
                    </label>
                    <input
                      type="date"
                      value={plan.onboarding.eventDate}
                      onChange={(e) =>
                        handleManualOnboardingUpdate((prev) => ({
                          ...prev,
                          eventDate: e.target.value
                        }))
                      }
                      className="mt-1.5 w-full px-4 py-2.5 text-base font-mono bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      4. Event Vibe
                    </label>
                    <input
                      type="text"
                      value={plan.onboarding.experienceStyle}
                      onChange={(e) =>
                        handleManualOnboardingUpdate((prev) => ({
                          ...prev,
                          experienceStyle: e.target.value
                        }))
                      }
                      className="mt-1.5 w-full px-4 py-2.5 text-base bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      5. Must-Haves (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={plan.onboarding.mustHaves.join(', ')}
                      onChange={(e) =>
                        handleManualOnboardingUpdate((prev) => ({
                          ...prev,
                          mustHaves: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                          audienceNotes: e.target.value
                        }))
                      }
                      className="mt-1.5 w-full px-4 py-2.5 text-base bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
                    />
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* SLIDE 2: BUDGET & CUTS */}
        {activeTab === 'BUDGET' && (
          <BudgetSection
            plan={plan}
            onUpdatePlan={setPlan}
            onRequestAiTradeOffs={handleRequestAiTradeOffs}
            isGeneratingTradeOffs={isGeneratingTradeOffs}
            isDark={isDark}
            privacyMask={privacyMask}
            onLoadDemoEvent={() => handleSelectCelebrationMode('anniversary')}
          />
        )}

        {/* SLIDE 3: VENDOR QUOTES */}
        {activeTab === 'VENDORS' && (
          <VendorComparisonSection
            plan={plan}
            onUpdatePlan={setPlan}
            onAuditVendorQuote={handleAuditVendorQuote}
            isAuditingQuote={isAuditingQuote}
            privacyMask={privacyMask}
            onLoadDemoEvent={() => handleSelectCelebrationMode('anniversary')}
          />
        )}

        {/* SLIDE 4: TIMELINE */}
        {activeTab === 'TIMELINE' && (
          <TimelineSection
            plan={plan}
            onUpdatePlan={setPlan}
            onLoadDemoEvent={() => handleSelectCelebrationMode('anniversary')}
          />
        )}

        {/* SLIDE 5: GUEST NEEDS */}
        {activeTab === 'PERSONALIZATION' && (
          <PersonalizationSection
            plan={plan}
            onUpdatePlan={setPlan}
            privacyMask={privacyMask}
            onLoadDemoEvent={() => handleSelectCelebrationMode('anniversary')}
          />
        )}
      </main>
    </div>
  );
}

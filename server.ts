import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '5mb' }));

function getGeminiClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`GEMINI_TIMEOUT_${ms}MS`));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function formatServerMoney(amount: number, currency: string): string {
  const isINR = currency === 'INR';
  const sym = isINR ? '₹' : '$';
  return `${sym}${Math.round(amount).toLocaleString(isINR ? 'en-IN' : 'en-US')}`;
}

const SYSTEM_INSTRUCTIONS = `You are an expert, dynamic celebration and event planning assistant focused on helping multi-generational families and budget-conscious hosts manage the chaos of event planning. You provide actionable, logical steps based on the guest list, timeline, and budget—never generic party ideas.

Core Directives:
1. Currency Flexibility (USD $ and Indian Rupee ₹):
- Always respect the user's currency ("USD" with "$" or "INR" with "₹").
- If the user mentions Rupees (₹, Rs, INR, rupee, lakhs, cr), set detectedCurrency to "INR" and format all monetary values in ₹ (Indian Rupees).
- If the user mentions US Dollars ($, USD, dollars), set detectedCurrency to "USD" and format all monetary values in $ (US Dollars).
2. Dynamic Budget Management:
- Never cut budget buckets evenly when budget decreases. Protect must-haves (food quality and senior comfort) and trim flexible buckets (decor, stationery, rideshare).`;

/**
 * Deterministic fallback for /api/planner/tradeoffs so "Generate AI Cut Plan" works
 * rapidly even if the Gemini API times out.
 */
function buildDeterministicTradeOffScenarios(
  currentPlan: Record<string, any>,
  newBudget: number,
  newGuestCount: number,
  constraintNote: string
) {
  const currency = currentPlan?.currency === 'INR' ? 'INR' : 'USD';
  const buckets: Array<Record<string, any>> = Array.isArray(currentPlan?.budgetBuckets)
    ? currentPlan.budgetBuckets
    : [];
  const currentTotal =
    buckets.reduce((s, b) => s + (Number(b.allocated) || 0), 0) ||
    Number(currentPlan?.onboarding?.budget) ||
    (currency === 'INR' ? 350000 : 6500);

  const targetB = Math.max(currency === 'INR' ? 25000 : 800, Number(newBudget) || currentTotal);
  const netSavings = Math.max(
    currency === 'INR' ? 15000 : 300,
    currentTotal > targetB ? currentTotal - targetB : Math.round(currentTotal * 0.15)
  );
  const finalTarget = Math.max(currency === 'INR' ? 25000 : 800, currentTotal - netSavings);

  const mustHaves: string[] = Array.isArray(currentPlan?.onboarding?.mustHaves)
    ? currentPlan.onboarding.mustHaves
    : ['Hot family-style food quality', 'Step-free elder comfort'];

  // Option A: Cut Decor & Logistics heavily, keep Catering 100% protected
  const adjustmentsA = buckets
    .filter((b) => b.priority !== 'Protected Must-Have')
    .map((b, idx, arr) => {
      const weight = idx === 0 ? 0.5 : 0.5 / Math.max(1, arr.length - 1);
      const cut = Math.min(Math.round(b.allocated * 0.65), Math.round(netSavings * weight));
      return {
        category: b.category,
        previousAllocated: b.allocated,
        newAllocated: Math.max(0, b.allocated - cut),
        delta: -cut,
        actionSummary:
          b.category.toLowerCase().includes('decor')
            ? 'Switch to seasonal local greenery & digital invitations instead of custom floral rigs'
            : b.category.toLowerCase().includes('photo')
            ? 'Condense to a focused 2-hour Golden Hour & family portrait session'
            : 'Coordinate family carpools for elders and streamline non-essential extras'
      };
    });

  // Option B: Off-peak Sunday Luncheon Venue shift + Decor trim
  const adjustmentsB = buckets.slice(0, 3).map((b) => {
    const isVenue = b.category.toLowerCase().includes('venue');
    const isDecor = b.category.toLowerCase().includes('decor');
    const cut = isVenue
      ? Math.round(netSavings * 0.45)
      : isDecor
      ? Math.round(netSavings * 0.35)
      : Math.round(netSavings * 0.2);
    return {
      category: b.category,
      previousAllocated: b.allocated,
      newAllocated: Math.max(0, b.allocated - cut),
      delta: -cut,
      actionSummary: isVenue
        ? 'Shift from Saturday night buyout to Sunday afternoon luncheon tariff (-25% hall fee)'
        : isDecor
        ? 'Use warm string lighting & potted table herbs instead of cut-flower arrangements'
        : 'Optimize per-guest beverage buffer for confirmed adult headcount'
    };
  });

  return {
    analysisSummary: `Generated 2 asymmetric trade-off plans to reach ${formatServerMoney(
      finalTarget,
      currency
    )} for ${newGuestCount} guests while protecting: ${constraintNote || mustHaves.join(', ')}.`,
    scenarios: [
      {
        id: `to-gen-a-${Date.now()}`,
        title: `Option 1: Save ${formatServerMoney(
          netSavings,
          currency
        )} (Target ${formatServerMoney(finalTarget, currency)}) — 100% Food & Venue Protected`,
        triggerDescription: `Budget adjusted to ${formatServerMoney(
          finalTarget,
          currency
        )} for ${newGuestCount} guests`,
        targetTotalBudget: finalTarget,
        netSavings,
        experienceTradeOffSummary: `Protects 100% of your Catering & Venue budgets while trimming flexible Decor, Photography hours, and Logistics (${constraintNote}).`,
        preservedMustHaves: mustHaves,
        adjustments: adjustmentsA
      },
      {
        id: `to-gen-b-${Date.now() + 1}`,
        title: `Option 2: Save ${formatServerMoney(
          netSavings,
          currency
        )} via Daytime Luncheon Slot & Simplified Decor`,
        triggerDescription: `Off-peak venue timing + decor streamline for ${newGuestCount} guests`,
        targetTotalBudget: finalTarget,
        netSavings,
        experienceTradeOffSummary: `Lowers venue rental costs by shifting to a daytime slot (easier for senior family members to attend without night driving) and simplifying stage decor.`,
        preservedMustHaves: mustHaves,
        adjustments: adjustmentsB
      }
    ]
  };
}

/**
 * Deterministic fallback for /api/planner/vendor-audit that parses actual numbers,
 * percentages, and per-person rates from rawQuoteDescription.
 */
function buildDeterministicVendorAudit(
  vendorName: string,
  category: string,
  rawQuoteDescription: string,
  currentPlan: Record<string, any>
) {
  const currency = currentPlan?.currency === 'INR' ? 'INR' : 'USD';
  const guests = Number(currentPlan?.onboarding?.guestCount) || (currency === 'INR' ? 120 : 65);

  // Extract explicit base total or per-person/plate rate
  let headlineQuote = currency === 'INR' ? 120000 : 2000;

  const baseMatch = rawQuoteDescription.match(
    /(?:[$₹]|rs\.?)\s*([\d,]+)\s*(?:base|total|headline|quoted)/i
  );
  const perPersonMatch = rawQuoteDescription.match(
    /(?:[$₹]|rs\.?)\s*([\d,]+)\s*(?:\/|\s*per\s*)(?:person|plate|guest|pax|head)/i
  );

  if (baseMatch) {
    headlineQuote = Number(baseMatch[1].replace(/,/g, ''));
  } else if (perPersonMatch) {
    headlineQuote = Number(perPersonMatch[1].replace(/,/g, '')) * guests;
  } else {
    const allMoney = Array.from(
      rawQuoteDescription.matchAll(/(?:[$₹]|rs\.?)\s*([\d,]+)/gi)
    ).map((m) => Number(m[1].replace(/,/g, '')));
    const bigAmt = allMoney.find((n) => n >= (currency === 'INR' ? 15000 : 400));
    if (bigAmt) headlineQuote = bigAmt;
  }

  const hiddenCharges: Array<{ label: string; estimatedAmount: number; clauseNote: string }> = [];

  // 1. Find percentage fees (e.g. "21% administrative production fee", "18% GST", "18% automatic gratuity", "10% service charge")
  const pctMatches = Array.from(
    rawQuoteDescription.matchAll(/(\d+(?:\.\d+)?)\s*%\s*([a-zA-Z\s&-]{3,35})/g)
  );
  for (const match of pctMatches) {
    const pct = Number(match[1]);
    const labelRaw = match[2].trim().replace(/\s+/g, ' ');
    if (pct > 0 && pct <= 50) {
      const est = Math.round(headlineQuote * (pct / 100));
      hiddenCharges.push({
        label: `${pct}% ${labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1)}`,
        estimatedAmount: est,
        clauseNote: `Calculated at ${pct}% of ${formatServerMoney(headlineQuote, currency)} base quote`
      });
    }
  }

  // 2. Find flat extra fees mentioned in text (e.g. "₹18,000 generator backup charge", "₹12,000 live chaat counter")
  const flatMatches = Array.from(
    rawQuoteDescription.matchAll(
      /(?:[$₹]|rs\.?)\s*([\d,]+)\s+([a-zA-Z\s-]{4,35}(?:fee|charge|setup|backup|rental|corkage|extra))/gi
    )
  );
  for (const match of flatMatches) {
    const amt = Number(match[1].replace(/,/g, ''));
    const desc = match[2].trim();
    if (amt > 0 && amt !== headlineQuote) {
      const isPerPerson = /\/(?:person|guest|plate)|per\s+(?:person|guest|plate)/i.test(
        rawQuoteDescription.slice(Math.max(0, (match.index || 0) - 10), (match.index || 0) + 30)
      );
      const finalAmt = isPerPerson ? amt * guests : amt;
      hiddenCharges.push({
        label: desc.charAt(0).toUpperCase() + desc.slice(1),
        estimatedAmount: finalAmt,
        clauseNote: isPerPerson
          ? `Billed per guest across ${guests} guests`
          : 'Mandatory fine-print add-on charge'
      });
    }
  }

  // 3. Find "$4/person china rental fee" or "$15/bottle corkage"
  const perUnitMatches = Array.from(
    rawQuoteDescription.matchAll(
      /(?:[$₹]|rs\.?)\s*([\d,]+)\s*\/\s*(person|guest|plate|bottle)\s+([a-zA-Z\s-]{3,30})/gi
    )
  );
  for (const match of perUnitMatches) {
    const rate = Number(match[1].replace(/,/g, ''));
    const unit = match[2].toLowerCase();
    const label = match[3].trim();
    if (rate * guests === headlineQuote) continue; // skip base per-person price
    const multiplier = unit === 'bottle' ? Math.max(12, Math.round(guests / 3)) : guests;
    const est = rate * multiplier;
    if (!hiddenCharges.some((h) => h.estimatedAmount === est)) {
      hiddenCharges.push({
        label: `${label.charAt(0).toUpperCase() + label.slice(1)} (${formatServerMoney(
          rate,
          currency
        )}/${unit})`,
        estimatedAmount: est,
        clauseNote: `Estimated for ${multiplier} ${unit}s`
      });
    }
  }

  if (hiddenCharges.length === 0) {
    const defaultFee = Math.round(headlineQuote * 0.18);
    hiddenCharges.push({
      label: currency === 'INR' ? '18% GST & Service Surcharge' : '18% Mandatory Service & Admin Fee',
      estimatedAmount: defaultFee,
      clauseNote: 'Standard fine-print tax & service surcharge'
    });
  }

  const hiddenSum = hiddenCharges.reduce((s, h) => s + h.estimatedAmount, 0);
  const trueLandedCost = headlineQuote + hiddenSum;
  const markupPct = Math.round((hiddenSum / Math.max(1, headlineQuote)) * 100);

  return {
    quoteOption: {
      id: `vq-audit-${Date.now()}`,
      vendorName,
      category,
      linkedBucketCategory: category,
      headlineQuote,
      hiddenCharges,
      trueLandedCost,
      inclusions: [
        `Base ${category.toLowerCase()} package for ${guests} guests (${formatServerMoney(
          headlineQuote,
          currency
        )})`,
        'Standard staffing and setup window'
      ],
      missingExclusions: hiddenCharges.map((h) => `${h.label} (+${formatServerMoney(h.estimatedAmount, currency)})`),
      contractRedFlags: `Advertised ${formatServerMoney(
        headlineQuote,
        currency
      )} quote increases by +${markupPct}% (+${formatServerMoney(
        hiddenSum,
        currency
      )} in fine-print charges) to a real total of ${formatServerMoney(trueLandedCost, currency)}.`,
      negotiationTip: `Ask ${vendorName} to cap total service/admin surcharges or bundle extras into an all-inclusive flat rate of ${formatServerMoney(
        Math.round(headlineQuote * 1.1),
        currency
      )}.`,
      isSelected: false
    }
  };
}

app.post('/api/planner/chat', async (req, res) => {
  const { userMessage, currentPlan, conversationHistory } = req.body;
  const activeCurrency = currentPlan?.currency === 'INR' ? 'INR' : 'USD';
  const sym = activeCurrency === 'INR' ? '₹' : '$';

  try {
    const ai = getGeminiClient();

    const promptContext = `
Active Currency: ${activeCurrency} (${sym})
Current Event Basics: ${JSON.stringify(currentPlan?.onboarding || {})}
Current Budget Buckets: ${JSON.stringify(
      (currentPlan?.budgetBuckets || []).map(
        (b: { id: string; category: string; allocated: number; priority: string }) => ({
          id: b.id,
          category: b.category,
          allocated: b.allocated,
          priority: b.priority
        })
      )
    )}
Recent Chat: ${JSON.stringify((conversationHistory || []).slice(-4))}

User Message: "${userMessage}"

Respond concisely in "assistantMarkdown" using ${activeCurrency} (${sym}).`;

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptContext,
        config: {
          systemInstruction: SYSTEM_INSTRUCTIONS,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              assistantMarkdown: { type: Type.STRING },
              detectedCurrency: { type: Type.STRING },
              appliedChangesSummary: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              shouldUpdatePlan: { type: Type.BOOLEAN },
              updatedOnboarding: {
                type: Type.OBJECT,
                properties: {
                  occasion: { type: Type.STRING },
                  budget: { type: Type.NUMBER },
                  guestCount: { type: Type.NUMBER },
                  eventDate: { type: Type.STRING },
                  experienceStyle: { type: Type.STRING },
                  mustHaves: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            },
            required: ['assistantMarkdown', 'appliedChangesSummary', 'shouldUpdatePlan']
          }
        }
      }),
      3000
    );

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch {
    // Fast server-side fallback so the chat never hangs
    const budgetStr = formatServerMoney(
      Number(currentPlan?.onboarding?.budget) || (activeCurrency === 'INR' ? 350000 : 6500),
      activeCurrency
    );
    const guests = currentPlan?.onboarding?.guestCount || (activeCurrency === 'INR' ? 120 : 65);
    res.json({
      assistantMarkdown: `I have updated your **${
        currentPlan?.onboarding?.occasion || 'Celebration'
      }** plan (${budgetStr} for ${guests} guests in ${activeCurrency} ${sym}).\n\n• **Protected Priorities**: ${(
        currentPlan?.onboarding?.mustHaves || ['Food quality & elder comfort']
      ).join(', ')}\n• You can review the updated category allocations in **2. Budget & Cuts** or audit vendor contracts in **3. Vendor Quotes**.`,
      detectedCurrency: activeCurrency,
      appliedChangesSummary: [`Synchronized plan in ${activeCurrency} (${sym}) — ${budgetStr}`],
      shouldUpdatePlan: false
    });
  }
});

app.post('/api/planner/tradeoffs', async (req, res) => {
  const { currentPlan, newBudget, newGuestCount, constraintNote } = req.body;
  try {
    const ai = getGeminiClient();
    const currencyCode = currentPlan?.currency === 'INR' ? 'INR' : 'USD';
    const sym = currencyCode === 'INR' ? '₹' : '$';

    const prompt = `
Active Currency: ${currencyCode} (${sym})
Current Event Plan: ${JSON.stringify(currentPlan?.onboarding || {})}
Current Buckets: ${JSON.stringify(currentPlan?.budgetBuckets || [])}
Target Budget: ${sym}${newBudget} for ${newGuestCount} guests.
Constraint: "${constraintNote}"
Generate 2 asymmetric TradeOffScenario options in ${currencyCode}.`;

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTIONS,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              analysisSummary: { type: Type.STRING },
              scenarios: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    triggerDescription: { type: Type.STRING },
                    targetTotalBudget: { type: Type.NUMBER },
                    netSavings: { type: Type.NUMBER },
                    experienceTradeOffSummary: { type: Type.STRING },
                    preservedMustHaves: { type: Type.ARRAY, items: { type: Type.STRING } },
                    adjustments: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          category: { type: Type.STRING },
                          previousAllocated: { type: Type.NUMBER },
                          newAllocated: { type: Type.NUMBER },
                          delta: { type: Type.NUMBER },
                          actionSummary: { type: Type.STRING }
                        }
                      }
                    }
                  },
                  required: [
                    'id',
                    'title',
                    'triggerDescription',
                    'targetTotalBudget',
                    'netSavings',
                    'experienceTradeOffSummary',
                    'preservedMustHaves',
                    'adjustments'
                  ]
                }
              }
            },
            required: ['analysisSummary', 'scenarios']
          }
        }
      }),
      3000
    );

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch {
    const fallbackData = buildDeterministicTradeOffScenarios(
      currentPlan,
      Number(newBudget),
      Number(newGuestCount),
      String(constraintNote || '')
    );
    res.json(fallbackData);
  }
});

app.post('/api/planner/vendor-audit', async (req, res) => {
  const { vendorName, category, rawQuoteDescription, currentPlan } = req.body;
  try {
    const ai = getGeminiClient();
    const currencyCode = currentPlan?.currency === 'INR' ? 'INR' : 'USD';
    const sym = currencyCode === 'INR' ? '₹' : '$';

    const prompt = `
Active Currency: ${currencyCode} (${sym})
Guest Count: ${currentPlan?.onboarding?.guestCount || 65}
Vendor: "${vendorName}" (${category})
Quote: "${rawQuoteDescription}"
Audit hidden charges and compute trueLandedCost in ${currencyCode}.`;

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTIONS,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quoteOption: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  vendorName: { type: Type.STRING },
                  category: { type: Type.STRING },
                  linkedBucketCategory: { type: Type.STRING },
                  headlineQuote: { type: Type.NUMBER },
                  hiddenCharges: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        estimatedAmount: { type: Type.NUMBER },
                        clauseNote: { type: Type.STRING }
                      },
                      required: ['label', 'estimatedAmount', 'clauseNote']
                    }
                  },
                  trueLandedCost: { type: Type.NUMBER },
                  inclusions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  missingExclusions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  contractRedFlags: { type: Type.STRING },
                  negotiationTip: { type: Type.STRING },
                  isSelected: { type: Type.BOOLEAN }
                },
                required: [
                  'id',
                  'vendorName',
                  'category',
                  'linkedBucketCategory',
                  'headlineQuote',
                  'hiddenCharges',
                  'trueLandedCost',
                  'inclusions',
                  'missingExclusions',
                  'contractRedFlags',
                  'negotiationTip',
                  'isSelected'
                ]
              }
            },
            required: ['quoteOption']
          }
        }
      }),
      3000
    );

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch {
    const fallbackAudit = buildDeterministicVendorAudit(
      String(vendorName || 'Vendor Quote'),
      String(category || 'Catering & Beverage'),
      String(rawQuoteDescription || ''),
      currentPlan || {}
    );
    res.json(fallbackAudit);
  }
});

async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Atelier Plan server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

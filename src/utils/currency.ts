export type CurrencyCode = 'USD' | 'INR';

export const USD_TO_INR_RATE = 80;

export function getCurrencySymbol(currency: CurrencyCode = 'USD'): string {
  return currency === 'INR' ? '₹' : '$';
}

export function formatMoney(
  amount: number | null | undefined,
  currency: CurrencyCode = 'USD'
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return currency === 'INR' ? '₹0' : '$0';
  }
  const rounded = Math.round(amount);
  const absFormatted = Math.abs(rounded).toLocaleString(
    currency === 'INR' ? 'en-IN' : 'en-US'
  );
  const symbol = getCurrencySymbol(currency);
  return rounded < 0 ? `-${symbol}${absFormatted}` : `${symbol}${absFormatted}`;
}

export function formatSignedMoney(delta: number, currency: CurrencyCode = 'USD'): string {
  const symbol = getCurrencySymbol(currency);
  const absFormatted = Math.abs(Math.round(delta)).toLocaleString(
    currency === 'INR' ? 'en-IN' : 'en-US'
  );
  return delta >= 0 ? `+${symbol}${absFormatted}` : `-${symbol}${absFormatted}`;
}

/**
 * Detects whether a user's message specifies INR (₹, Rs, INR, rupee, lakh) or USD ($, USD, dollar),
 * whether the money mention is a relative delta ("cut by $1,000", "dropped by ₹50,000", "increase by $500"),
 * and parses flexible amounts like "5 lakhs", "2.5 lakh", "₹3,50,000", "$6,500", "50k", etc.
 */
export function parseMoneyAndGuestInput(
  text: string,
  fallbackCurrency: CurrencyCode
): {
  detectedCurrency: CurrencyCode;
  currencyWasExplicit: boolean;
  budget: number | null;
  isRelativeDelta: boolean;
  relativeSign: 1 | -1;
  percentageDelta: number | null;
  guestCount: number | null;
} {
  const lower = text.toLowerCase();

  let detectedCurrency: CurrencyCode = fallbackCurrency;
  let currencyWasExplicit = false;

  if (
    text.includes('₹') ||
    /\b(inr|rs\.?|rupees?|lakh|lakhs|lac|lacs|crore|cr)\b/i.test(text)
  ) {
    detectedCurrency = 'INR';
    currencyWasExplicit = true;
  } else if (text.includes('$') || /\b(usd|dollars?)\b/i.test(text)) {
    detectedCurrency = 'USD';
    currencyWasExplicit = true;
  }

  // Detect if user is asking for a relative cut/reduction or increase (e.g. "dropped by $1,000", "cut budget by ₹50,000")
  const isReduction =
    /\b(drop|dropped|cut|cuts|reduce|reduced|decrease|decreased|lower|save|trim|less|minus)\b/i.test(
      text
    ) && !/\bto\s+(?:[$₹]|rs\.?|inr|usd)?\s*\d/i.test(text);

  const isIncrease =
    /\b(increase|increased|add|added|raise|raised|more|plus|extra)\b/i.test(text) &&
    !/\bto\s+(?:[$₹]|rs\.?|inr|usd)?\s*\d/i.test(text);

  const isRelativeDelta = isReduction || isIncrease;
  const relativeSign: 1 | -1 = isReduction ? -1 : 1;

  // Check for percentage cut/increase (e.g. "cut budget by 15%")
  let percentageDelta: number | null = null;
  const pctMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pctMatch && isRelativeDelta) {
    percentageDelta = Number(pctMatch[1]) * relativeSign;
  }

  let budget: number | null = null;
  let guestCount: number | null = null;

  // Remove ISO dates (e.g. 2027-01-24) and task IDs (e.g. T-01) and day delays ("7 days") before number extraction
  const scrubbedText = text
    .replace(/\b202\d-\d{2}-\d{2}\b/g, ' ')
    .replace(/\bT-0?\d+\b/gi, ' ')
    .replace(/\b\d+\s*(?:days?|weeks?|months?|hours?|yrs?|years?|th|st|nd|rd)\b/gi, ' ');

  // 1. Check for explicit guest count first (e.g. "65 guests", "120 people", "80 members", "for 100")
  let remainingText = scrubbedText;
  const guestMatch =
    remainingText.match(
      /(\d+)\s*(?:guests?|people|persons?|members?|attendees?|pax|family|relatives|invitees)/i
    ) || remainingText.match(/\bfor\s+(\d{1,4})\b(?!\s*(?:dollars|rupees|lakhs|lacs|k\b))/i);

  if (guestMatch) {
    const parsedGuests = Number(guestMatch[1]);
    if (!isNaN(parsedGuests) && parsedGuests > 0 && parsedGuests <= 10000) {
      guestCount = parsedGuests;
      remainingText = remainingText.replace(guestMatch[0], ' ');
    }
  }

  // 2. Check for "X lakh(s)" / "X lac(s)" (e.g., "5 lakhs", "3.5 lakh")
  const lakhMatch = remainingText.match(/(?:[$₹]|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?)\b/i);
  if (lakhMatch) {
    budget = Math.round(Number(lakhMatch[1]) * 100000);
    remainingText = remainingText.replace(lakhMatch[0], ' ');
  }

  // 3. Check for "X crore(s)" / "X cr"
  if (!budget) {
    const crMatch = remainingText.match(/(?:[$₹]|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:crores?|cr)\b/i);
    if (crMatch) {
      budget = Math.round(Number(crMatch[1]) * 10000000);
      remainingText = remainingText.replace(crMatch[0], ' ');
    }
  }

  // 4. Check for "Xk" (e.g., "50k", "$12k", "₹200k")
  if (!budget) {
    const kMatch = remainingText.match(/(?:[$₹]|rs\.?\s*)?(\d+(?:\.\d+)?)\s*k\b/i);
    if (kMatch) {
      budget = Math.round(Number(kMatch[1]) * 1000);
      remainingText = remainingText.replace(kMatch[0], ' ');
    }
  }

  // 5. Check for explicit currency-prefixed number (e.g., "$6,500", "₹3,50,000", "Rs 150000", "INR 200000")
  if (!budget) {
    const explicitCurrMatch = remainingText.match(
      /(?:[$₹]|rs\.?|inr|usd)\s*([\d,]+(?:\.\d+)?)/i
    );
    if (explicitCurrMatch) {
      const val = Number(explicitCurrMatch[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) {
        budget = Math.round(val);
        remainingText = remainingText.replace(explicitCurrMatch[0], ' ');
      }
    }
  }

  // 6. Check for number followed by currency word (e.g., "6500 dollars", "250000 rupees")
  if (!budget) {
    const suffixCurrMatch = remainingText.match(
      /([\d,]+)\s*(?:dollars?|usd|rupees?|inr|rs\.?|budget)/i
    );
    if (suffixCurrMatch) {
      const val = Number(suffixCurrMatch[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) {
        budget = Math.round(val);
        remainingText = remainingText.replace(suffixCurrMatch[0], ' ');
      }
    }
  }

  // 7. Fallback: extract remaining plain numbers
  const rawTokens = remainingText.match(/\d[\d,]*/g) || [];
  const plainNumbers = rawTokens
    .map((t) => Number(t.replace(/,/g, '')))
    .filter((n) => !isNaN(n) && n > 0);

  if (plainNumbers.length > 0 && percentageDelta === null) {
    if (budget === null && guestCount !== null) {
      const other = plainNumbers[0];
      if (other !== undefined) {
        budget = other;
      }
    } else if (budget !== null && guestCount === null) {
      const other = plainNumbers.find((n) => n <= 5000);
      if (other !== undefined) {
        guestCount = other;
      }
    } else if (budget === null && guestCount === null) {
      if (plainNumbers.length >= 2) {
        const sorted = [...plainNumbers].sort((a, b) => b - a);
        budget = sorted[0];
        guestCount = sorted[1];
      } else if (plainNumbers.length === 1) {
        const onlyNum = plainNumbers[0];
        if (onlyNum >= 400) {
          budget = onlyNum;
        } else {
          guestCount = onlyNum;
        }
      }
    }
  }

  return {
    detectedCurrency,
    currencyWasExplicit,
    budget,
    isRelativeDelta,
    relativeSign,
    percentageDelta,
    guestCount
  };
}

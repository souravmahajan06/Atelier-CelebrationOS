import React, { useEffect, useState } from 'react';
import { EventPlan, VendorQuoteOption } from '../types/planner';
import { formatMoney, getCurrencySymbol } from '../utils/currency';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

interface VendorComparisonSectionProps {
  plan: EventPlan;
  onUpdatePlan: (updater: (prev: EventPlan) => EventPlan) => void;
  onAuditVendorQuote: (
    vendorName: string,
    category: string,
    rawQuoteDescription: string
  ) => Promise<void>;
  isAuditingQuote: boolean;
  privacyMask?: boolean;
  onLoadDemoEvent?: () => void;
}

export const VendorComparisonSection: React.FC<VendorComparisonSectionProps> = ({
  plan,
  onUpdatePlan,
  onAuditVendorQuote,
  isAuditingQuote,
  privacyMask = false,
  onLoadDemoEvent
}) => {
  const currency = plan.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currency);

  const maskMoney = (amount: number) =>
    privacyMask ? (currency === 'INR' ? '₹••,•••' : '$•,•••') : formatMoney(amount, currency);

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(
    plan.vendorQuotes[1]?.id || plan.vendorQuotes[0]?.id || null
  );

  const [vendorName, setVendorName] = useState(
    currency === 'INR' ? 'Royal Palace Banquet & Caterers' : 'Bella Vista Banquet Hall & Catering'
  );
  const [vendorCategory, setVendorCategory] = useState('Catering & Beverage');
  const [rawQuoteText, setRawQuoteText] = useState(
    currency === 'INR'
      ? 'Quoted ₹950/plate for 120 guests (₹1,14,000 base). Fine print mentions 18% GST extra, ₹18,000 generator backup charge, ₹12,000 live chaat counter setup fee, and 10% service charge.'
      : 'Quoted $29/person for 65 guests ($1,885 base). Fine print mentions a 21% administrative production fee, 18% automatic gratuity, $15/bottle corkage if family brings wine, and $4/person china rental fee.'
  );

  useEffect(() => {
    if (currency === 'INR') {
      setVendorName('Royal Palace Banquet & Caterers');
      setRawQuoteText(
        'Quoted ₹950/plate for 120 guests (₹1,14,000 base). Fine print mentions 18% GST extra, ₹18,000 generator backup charge, ₹12,000 live chaat counter setup fee, and 10% service charge.'
      );
    } else {
      setVendorName('Bella Vista Banquet Hall & Catering');
      setRawQuoteText(
        'Quoted $29/person for 65 guests ($1,885 base). Fine print mentions a 21% administrative production fee, 18% automatic gratuity, $15/bottle corkage if family brings wine, and $4/person china rental fee.'
      );
    }
  }, [currency]);

  useEffect(() => {
    if (plan.vendorQuotes.length > 0) {
      const defaultId = plan.vendorQuotes[1]?.id || plan.vendorQuotes[0]?.id;
      setExpandedQuoteId((prev) =>
        prev && plan.vendorQuotes.some((q) => q.id === prev) ? prev : defaultId
      );
    } else {
      setExpandedQuoteId(null);
    }
  }, [plan.vendorQuotes]);

  const handleSelectVendorQuote = (selectedQuote: VendorQuoteOption) => {
    onUpdatePlan((prev) => {
      const updatedQuotes = prev.vendorQuotes.map((q) => {
        if (q.category.toLowerCase() === selectedQuote.category.toLowerCase()) {
          return { ...q, isSelected: q.id === selectedQuote.id };
        }
        return q;
      });

      const updatedBuckets = prev.budgetBuckets.map((bucket) => {
        if (
          bucket.category.toLowerCase().includes(selectedQuote.linkedBucketCategory.toLowerCase()) ||
          selectedQuote.linkedBucketCategory.toLowerCase().includes(bucket.category.toLowerCase())
        ) {
          return {
            ...bucket,
            allocated: selectedQuote.trueLandedCost,
            rationale: `Synced with selected vendor "${selectedQuote.vendorName}" (Real Total Cost: ${formatMoney(
              selectedQuote.trueLandedCost,
              prev.currency
            )}).`
          };
        }
        return bucket;
      });

      return {
        ...prev,
        vendorQuotes: updatedQuotes,
        budgetBuckets: updatedBuckets
      };
    });
  };

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim() || !rawQuoteText.trim() || isAuditingQuote) return;
    await onAuditVendorQuote(vendorName.trim(), vendorCategory, rawQuoteText.trim());
    setShowAuditForm(false);
  };

  const categories = Array.from(new Set(plan.vendorQuotes.map((q) => q.category)));
  const filteredQuotes = plan.vendorQuotes.filter((q) =>
    categoryFilter === 'ALL' ? true : q.category === categoryFilter
  );

  return (
    <div className="space-y-6">
      {/* Clear Header + Action Button */}
      <div className="bg-white dark:bg-[#1A142D] border border-[#E5DDCF] dark:border-[#2A2244] rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 festive-card-glow">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Compare Vendor Quotes & Uncover Hidden Fees ({currencySymbol})
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Low advertised quotes often hide service fees, GST/taxes, generator charges, or missing furniture rentals. Compare the <strong>Real Total Cost</strong> below before signing.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAuditForm((v) => !v)}
          className="px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-[#6D28D9] to-[#EC4899] hover:opacity-95 rounded-xl transition-all flex items-center gap-2 shrink-0 self-start md:self-center cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          {showAuditForm ? 'Close Quote Auditor' : 'Paste & Audit a New Quote'}
        </button>
      </div>

      {/* Collapsible AI Quote Auditor Drawer */}
      {showAuditForm && (
        <form
          onSubmit={handleAuditSubmit}
          className="bg-white dark:bg-[#1A142D] border-2 border-violet-500 dark:border-violet-400 rounded-3xl p-6 space-y-5 festive-card-glow"
        >
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              AI Vendor Quote Auditor ({currency})
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Paste a vendor&apos;s email or price sheet. We will calculate the true total in {currencySymbol} for your {plan.onboarding.guestCount || 65} guests and flag hidden charges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Vendor Name
              </label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="mt-1.5 w-full px-4 py-2.5 text-base bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Category
              </label>
              <select
                value={vendorCategory}
                onChange={(e) => setVendorCategory(e.target.value)}
                className="mt-1.5 w-full px-4 py-2.5 text-base bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
              >
                <option value="Catering & Beverage">Catering & Beverage</option>
                <option value="Venue & Spatial">Venue & Spatial</option>
                <option value="Photography & Sound">Photography & Sound</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Quote Details / Fine Print
            </label>
            <textarea
              rows={3}
              value={rawQuoteText}
              onChange={(e) => setRawQuoteText(e.target.value)}
              className="mt-1.5 w-full px-4 py-2.5 text-base bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isAuditingQuote}
              className="px-6 py-3 text-base font-bold text-white bg-gradient-to-r from-[#FF5E14] to-[#EC4899] rounded-xl flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {isAuditingQuote ? 'Analyzing Hidden Fees...' : 'Calculate Real Total Cost'}
            </button>
          </div>
        </form>
      )}

      {plan.vendorQuotes.length === 0 ? (
        <div className="border border-[#E5DDCF] dark:border-[#2A2244] bg-white dark:bg-[#1A142D] p-10 rounded-3xl text-center max-w-2xl mx-auto space-y-4 festive-card-glow">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            No Vendor Quotes Added Yet
          </h3>
          <p className="text-base text-slate-600 dark:text-slate-300">
            Answer the 5 setup questions on <strong>Slide 01: AI Co-Pilot &amp; Setup</strong>, click <strong>Try Demo Event</strong>, or audit a vendor proposal right now.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            {onLoadDemoEvent && (
              <button
                type="button"
                onClick={onLoadDemoEvent}
                className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#FF5E14] to-[#EC4899] rounded-xl inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Load Demo Event Quotes
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAuditForm(true)}
              className="px-5 py-2.5 text-sm font-bold text-violet-800 dark:text-violet-200 bg-violet-100 dark:bg-violet-950/70 border border-violet-300 dark:border-violet-800 rounded-xl inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Paste &amp; Audit a Vendor Quote
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Simple Category Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCategoryFilter('ALL')}
              className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors cursor-pointer ${
                categoryFilter === 'ALL'
                  ? 'bg-gradient-to-r from-[#6D28D9] to-[#EC4899] text-white'
                  : 'bg-white dark:bg-[#1A142D] border border-[#E5DDCF] dark:border-[#2A2244] text-slate-700 dark:text-slate-300'
              }`}
            >
              All Quotes ({plan.vendorQuotes.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-gradient-to-r from-[#6D28D9] to-[#EC4899] text-white'
                    : 'bg-white dark:bg-[#1A142D] border border-[#E5DDCF] dark:border-[#2A2244] text-slate-700 dark:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Clean, High-Readability Quote Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {filteredQuotes.map((quote) => {
              const hiddenSum = quote.hiddenCharges.reduce((s, h) => s + h.estimatedAmount, 0);
              const markupPct = Math.round((hiddenSum / Math.max(1, quote.headlineQuote)) * 100);
              const isExpanded = expandedQuoteId === quote.id;

              return (
                <div
                  key={quote.id}
                  className={`bg-white dark:bg-[#1A142D] border-2 rounded-3xl p-6 transition-colors festive-card-glow ${
                    quote.isSelected
                      ? 'border-emerald-600 dark:border-emerald-400'
                      : 'border-[#E5DDCF] dark:border-[#2A2244]'
                  }`}
                >
                  {/* Vendor Title & Select Button */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-[#E5DDCF] dark:border-[#2A2244]">
                    <div>
                      <div className="text-sm font-semibold text-violet-600 dark:text-pink-400">
                        {quote.category}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                        {quote.vendorName}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectVendorQuote(quote)}
                      className={`px-4 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2 shrink-0 cursor-pointer ${
                        quote.isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gradient-to-r from-[#6D28D9] to-[#EC4899] text-white hover:opacity-95'
                      }`}
                    >
                      {quote.isSelected ? (
                        <>
                          <Check className="w-4 h-4" />
                          Selected Vendor
                        </>
                      ) : (
                        'Select This Vendor'
                      )}
                    </button>
                  </div>

                  {/* Big, Easy-to-Read Numbers Strip */}
                  <div className="grid grid-cols-3 gap-4 my-5 p-4 bg-[#FBF9F5] dark:bg-[#140F23] rounded-2xl border border-[#E5DDCF] dark:border-[#2A2244]">
                    <div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Advertised Price
                      </div>
                      <div className="text-xl font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200 mt-1">
                        {maskMoney(quote.headlineQuote)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Hidden Fees (+{markupPct}%)
                      </div>
                      <div
                        className={`text-xl font-bold font-mono tabular-nums mt-1 ${
                          markupPct > 25
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        +{maskMoney(hiddenSum)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Real Total Cost
                      </div>
                      <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                        {maskMoney(quote.trueLandedCost)}
                      </div>
                    </div>
                  </div>

                  {/* Plain-English Verdict */}
                  <div className="p-4 bg-[#FBF9F5]/80 dark:bg-[#140F23]/80 rounded-2xl flex items-start gap-3">
                    <ShieldAlert
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        markupPct > 25
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    />
                    <div className="text-base text-slate-700 dark:text-slate-200">
                      <strong>Bottom Line: </strong>
                      {quote.contractRedFlags}
                    </div>
                  </div>

                  {/* Toggle Button for Full Fine-Print Breakdown */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedQuoteId((prev) => (prev === quote.id ? null : quote.id))
                    }
                    className="mt-4 w-full py-2.5 px-4 text-sm font-bold text-slate-700 dark:text-slate-200 bg-violet-50/70 dark:bg-[#221A3A] hover:bg-violet-100/80 dark:hover:bg-[#2A2046] rounded-xl flex items-center justify-between cursor-pointer"
                  >
                    <span>
                      {isExpanded
                        ? 'Hide Fine Print & Inclusions'
                        : `Inspect ${quote.hiddenCharges.length} Hidden Charges & Inclusions`}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {/* Expandable Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-[#E5DDCF] dark:border-[#2A2244] space-y-5">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                          Hidden Charges Breakdown
                        </h4>
                        <div className="space-y-2.5">
                          {quote.hiddenCharges.map((hc, i) => (
                            <div
                              key={i}
                              className="p-3.5 bg-[#FBF9F5] dark:bg-[#140F23] rounded-xl flex items-start justify-between gap-4"
                            >
                              <div>
                                <div className="text-base font-semibold text-slate-900 dark:text-white">
                                  {hc.label}
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                                  {hc.clauseNote}
                                </div>
                              </div>
                              <span className="text-base font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400 shrink-0">
                                +{maskMoney(hc.estimatedAmount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl">
                          <div className="font-bold text-emerald-800 dark:text-emerald-400 mb-2">
                            What’s Included
                          </div>
                          <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 list-disc pl-4">
                            {quote.inclusions.map((inc, i) => (
                              <li key={i}>{inc}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl">
                          <div className="font-bold text-amber-800 dark:text-amber-400 mb-2">
                            Not Included
                          </div>
                          <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 list-disc pl-4">
                            {quote.missingExclusions.map((exc, i) => (
                              <li key={i}>{exc}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="p-4 bg-[#FBF9F5] dark:bg-[#140F23] rounded-xl flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Negotiation Tip: </strong>
                          {quote.negotiationTip}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

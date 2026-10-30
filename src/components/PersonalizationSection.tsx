import React, { useEffect, useState } from 'react';
import { EventPlan, PersonalizationRule } from '../types/planner';
import { formatMoney, getCurrencySymbol } from '../utils/currency';
import { Check, Plus, Sparkles } from 'lucide-react';

interface PersonalizationSectionProps {
  plan: EventPlan;
  onUpdatePlan: (updater: (prev: EventPlan) => EventPlan) => void;
  privacyMask?: boolean;
  onLoadDemoEvent?: () => void;
}

export const PersonalizationSection: React.FC<PersonalizationSectionProps> = ({
  plan,
  onUpdatePlan,
  privacyMask = false,
  onLoadDemoEvent
}) => {
  const currency = plan.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currency);

  const maskMoney = (amount: number) =>
    privacyMask ? (currency === 'INR' ? '₹••,•••' : '$•,•••') : formatMoney(amount, currency);

  const [showAddForm, setShowAddForm] = useState(false);
  const [segment, setSegment] = useState('');
  const [category, setCategory] = useState<PersonalizationRule['category']>('Accessibility');
  const [observation, setObservation] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [costImpact, setCostImpact] = useState(currency === 'INR' ? '5000' : '200');

  useEffect(() => {
    setCostImpact(currency === 'INR' ? '5000' : '200');
  }, [currency]);

  const handleToggleRule = (rule: PersonalizationRule) => {
    onUpdatePlan((prev) => {
      const nextApplied = !rule.applied;
      const updatedBuckets = prev.budgetBuckets.map((b, idx) => {
        if (idx === prev.budgetBuckets.length - 1) {
          const delta = nextApplied ? rule.estimatedCostImpact : -rule.estimatedCostImpact;
          return {
            ...b,
            allocated: Math.max(0, b.allocated + delta)
          };
        }
        return b;
      });

      return {
        ...prev,
        budgetBuckets: updatedBuckets,
        personalizationRules: prev.personalizationRules.map((r) =>
          r.id === rule.id ? { ...r, applied: nextApplied } : r
        )
      };
    });
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!segment.trim() || !recommendation.trim()) return;
    const cost = Number(costImpact) || 0;

    const newRule: PersonalizationRule = {
      id: `pers-${Date.now()}`,
      segment: segment.trim(),
      category,
      observation: observation.trim() || 'Family guest requirement.',
      recommendation: recommendation.trim(),
      estimatedCostImpact: cost,
      applied: true
    };

    onUpdatePlan((prev) => {
      const updatedBuckets = prev.budgetBuckets.map((b, idx) =>
        idx === prev.budgetBuckets.length - 1
          ? { ...b, allocated: Math.max(0, b.allocated + cost) }
          : b
      );
      return {
        ...prev,
        budgetBuckets: updatedBuckets,
        personalizationRules: [newRule, ...prev.personalizationRules]
      };
    });

    setSegment('');
    setObservation('');
    setRecommendation('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1A142D] border border-[#E5DDCF] dark:border-[#2A2244] rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 festive-card-glow">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Guest Comfort &amp; Accessibility Plan
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Practical adjustments for grandparents, young children, and dietary needs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-[#6D28D9] to-[#EC4899] rounded-xl flex items-center gap-2 shrink-0 self-start md:self-center cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {showAddForm ? 'Close Form' : 'Add Guest Need'}
        </button>
      </div>

      {/* Guest List Summary */}
      <div className="p-6 bg-white dark:bg-[#1A142D] border border-[#E5DDCF] dark:border-[#2A2244] rounded-3xl festive-card-glow">
        <div className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-pink-400">
          Who Is Attending
        </div>
        <p className="text-lg font-medium text-slate-900 dark:text-white mt-1">
          {plan.onboarding.audienceNotes ||
            'No guest details added yet. Answer the 5 questions on Slide 01 or load a demo celebration preset.'}
        </p>
      </div>

      {/* Collapsible Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddRule}
          className="bg-white dark:bg-[#1A142D] border-2 border-violet-500 dark:border-violet-400 rounded-3xl p-6 space-y-4 festive-card-glow"
        >
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Add Guest Group Accommodation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Guest Group
              </label>
              <input
                type="text"
                placeholder="e.g., Grandparents with Walkers"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                className="mt-1.5 w-full px-4 py-2.5 text-base bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Type of Need
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PersonalizationRule['category'])}
                className="mt-1.5 w-full px-4 py-2.5 text-base bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
              >
                <option value="Accessibility">Accessibility</option>
                <option value="Culinary & Dietary">Culinary &amp; Dietary</option>
                <option value="Acoustic & Pacing">Acoustic &amp; Pacing</option>
                <option value="Transit & Arrival">Transit &amp; Arrival</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Estimated Cost ({currencySymbol})
              </label>
              <input
                type="number"
                value={costImpact}
                onChange={(e) => setCostImpact(e.target.value)}
                className="mt-1.5 w-full px-4 py-2.5 text-base font-mono bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Why Is This Needed?
              </label>
              <input
                type="text"
                placeholder="e.g., Standing in buffet lines is tiring"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                className="mt-1.5 w-full px-4 py-2.5 text-base bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Action Step
              </label>
              <input
                type="text"
                placeholder="e.g., Serve family-style platters directly to Table 1"
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                className="mt-1.5 w-full px-4 py-2.5 text-base bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 text-base font-bold text-white bg-gradient-to-r from-[#FF5E14] to-[#EC4899] rounded-xl cursor-pointer"
            >
              Save Guest Need
            </button>
          </div>
        </form>
      )}

      {/* Clean, Easy-to-Read Cards */}
      {plan.personalizationRules.length === 0 ? (
        <div className="border border-[#E5DDCF] dark:border-[#2A2244] bg-white dark:bg-[#1A142D] p-10 rounded-3xl text-center max-w-2xl mx-auto space-y-4 festive-card-glow">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            No Guest Comfort Rules Added Yet
          </h3>
          <p className="text-base text-slate-600 dark:text-slate-300">
            Answer the 5 setup questions on <strong>Slide 01: AI Co-Pilot &amp; Setup</strong>, load a demo celebration preset, or click <strong>Add Guest Need</strong> above.
          </p>
          {onLoadDemoEvent && (
            <button
              type="button"
              onClick={onLoadDemoEvent}
              className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#FF5E14] to-[#EC4899] rounded-xl inline-flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Load Demo Guest Comfort Plan
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {plan.personalizationRules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white dark:bg-[#1A142D] border-2 border-[#E5DDCF] dark:border-[#2A2244] rounded-3xl p-6 flex flex-col justify-between festive-card-glow"
            >
              <div>
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E5DDCF] dark:border-[#2A2244]">
                  <div>
                    <div className="text-sm font-semibold text-violet-600 dark:text-pink-400">
                      {rule.category} · Est. Cost: {maskMoney(rule.estimatedCostImpact)}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {rule.segment}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleRule(rule)}
                    className={`px-4 py-2 text-sm font-bold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      rule.applied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-violet-100 dark:bg-[#251C3F] text-violet-900 dark:text-violet-200'
                    }`}
                  >
                    {rule.applied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Active
                      </>
                    ) : (
                      'Enable'
                    )}
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Why It Matters
                    </div>
                    <p className="text-base text-slate-700 dark:text-slate-300 mt-0.5">
                      {rule.observation}
                    </p>
                  </div>

                  <div className="p-4 bg-[#FBF9F5] dark:bg-[#140F23] rounded-2xl border border-[#E5DDCF] dark:border-[#2A2244]">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Recommended Action
                    </div>
                    <p className="text-base font-medium text-slate-900 dark:text-white mt-1">
                      {rule.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

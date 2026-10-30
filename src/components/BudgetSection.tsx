import React, { useEffect, useState } from 'react';
import { BudgetBucket, EventPlan, TradeOffScenario } from '../types/planner';
import { formatMoney, formatSignedMoney, getCurrencySymbol } from '../utils/currency';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCcw,
  Sliders,
  Sparkles,
  Trash2,
  Users,
  Volume2,
  Wallet
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const BUCKET_COLORS_LIGHT = [
  '#6D28D9', // Royal Violet
  '#FF5E14', // Marigold Saffron
  '#059669', // Emerald Green
  '#EC4899', // Gulabi Pink
  '#F59E0B', // Festive Gold
  '#4F46E5'  // Deep Indigo
];

const BUCKET_COLORS_DARK = [
  '#A78BFA', // Soft Violet
  '#FF8A00', // Bright Saffron
  '#34D399', // Bright Emerald
  '#F472B6', // Bright Gulabi
  '#FBBF24', // Warm Gold
  '#818CF8'  // Soft Indigo
];

interface BudgetSectionProps {
  plan: EventPlan;
  onUpdatePlan: (updater: (prev: EventPlan) => EventPlan) => void;
  onRequestAiTradeOffs: (newBudget: number, newGuestCount: number, note: string) => Promise<void>;
  isGeneratingTradeOffs: boolean;
  isDark?: boolean;
  privacyMask?: boolean;
  onLoadDemoEvent?: () => void;
}

export const BudgetSection: React.FC<BudgetSectionProps> = ({
  plan,
  onUpdatePlan,
  onRequestAiTradeOffs,
  isGeneratingTradeOffs,
  isDark = false,
  privacyMask = false,
  onLoadDemoEvent
}) => {
  const [subView, setSubView] = useState<'OVERVIEW' | 'TRADEOFFS'>('OVERVIEW');
  const [expandedBucketId, setExpandedBucketId] = useState<string | null>(
    plan.budgetBuckets[0]?.id || null
  );
  const [hoveredBucketId, setHoveredBucketId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [recentlyDeleted, setRecentlyDeleted] = useState<
    Array<{
      bucketId: string;
      bucketName: string;
      item: { id: string; name: string; cost: number; isMustHave: boolean; notes: string };
    }>
  >([]);

  const currency = plan.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currency);
  const quickDelta = currency === 'INR' ? 5000 : 200;
  const defaultCutStep = currency === 'INR' ? 40000 : 1000;

  const fmt = (amt: number | null | undefined) =>
    privacyMask ? `${currencySymbol}••,•••` : formatMoney(amt, currency);
  const fmtSigned = (delta: number) =>
    privacyMask ? `${delta >= 0 ? '+' : '-'}${currencySymbol}••,•••` : formatSignedMoney(delta, currency);

  const currentTotalAllocated = plan.budgetBuckets.reduce((sum, b) => sum + b.allocated, 0);
  const targetBudget = plan.onboarding.budget || currentTotalAllocated;
  const variance = targetBudget - currentTotalAllocated;
  const percentConsumed =
    targetBudget > 0 ? Math.round((currentTotalAllocated / targetBudget) * 100) : 100;

  const currentGuests = plan.onboarding.guestCount || (currency === 'INR' ? 120 : 65);
  const [whatIfGuests, setWhatIfGuests] = useState<number>(currentGuests);

  const [simBudget, setSimBudget] = useState<number>(
    Math.max(currency === 'INR' ? 25000 : 1000, targetBudget - defaultCutStep)
  );
  const [simGuests, setSimGuests] = useState<number>(currentGuests);
  const [simConstraintNote, setSimConstraintNote] = useState<string>(
    'Keep food quality and senior comfort intact; cut decor and flexible extras.'
  );

  useEffect(() => {
    setSimBudget(Math.max(currency === 'INR' ? 25000 : 1000, targetBudget - defaultCutStep));
    setSimGuests(plan.onboarding.guestCount || 65);
    setWhatIfGuests(plan.onboarding.guestCount || (currency === 'INR' ? 120 : 65));
  }, [targetBudget, plan.onboarding.guestCount, currency, defaultCutStep]);

  const [selectedBucketId, setSelectedBucketId] = useState<string>(plan.budgetBuckets[0]?.id || '');
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemMustHave, setNewItemMustHave] = useState(false);

  // Keep expandedBucketId and selectedBucketId synced when buckets are generated or currency switches
  useEffect(() => {
    if (plan.budgetBuckets.length > 0) {
      const firstId = plan.budgetBuckets[0].id;
      setExpandedBucketId((prev) =>
        prev && plan.budgetBuckets.some((b) => b.id === prev) ? prev : firstId
      );
      setSelectedBucketId((prev) =>
        prev && plan.budgetBuckets.some((b) => b.id === prev) ? prev : firstId
      );
    } else {
      setExpandedBucketId(null);
      setSelectedBucketId('');
    }
  }, [plan.budgetBuckets]);

  const palette = isDark ? BUCKET_COLORS_DARK : BUCKET_COLORS_LIGHT;

  // Calculate What-If Guest Elasticity (Catering scales 95% with guest ratio; Venue/Photo stay fixed)
  const guestRatio = whatIfGuests / Math.max(1, currentGuests);
  const projectedElasticSpend = plan.budgetBuckets.reduce((sum, bucket) => {
    const isPerHeadCategory = /cater|food|beverage|meal/i.test(bucket.category);
    const elasticity = isPerHeadCategory ? 0.95 : /logistics|decor/i.test(bucket.category) ? 0.25 : 0;
    const scaled = Math.round(bucket.allocated * (1 + (guestRatio - 1) * elasticity));
    return sum + scaled;
  }, 0);
  const elasticDelta = projectedElasticSpend - currentTotalAllocated;

  const handleApplyWhatIfGuests = () => {
    if (whatIfGuests === currentGuests) return;
    onUpdatePlan((prev) => {
      const prevG = prev.onboarding.guestCount || (prev.currency === 'INR' ? 120 : 65);
      const ratio = whatIfGuests / Math.max(1, prevG);
      const updatedBuckets = prev.budgetBuckets.map((bucket) => {
        const isPerHeadCategory = /cater|food|beverage|meal/i.test(bucket.category);
        const elasticity = isPerHeadCategory
          ? 0.95
          : /logistics|decor/i.test(bucket.category)
          ? 0.25
          : 0;
        const newAlloc = Math.round(bucket.allocated * (1 + (ratio - 1) * elasticity));
        return {
          ...bucket,
          allocated: newAlloc,
          items: bucket.items.map((it, idx) =>
            idx === 0
              ? {
                  ...it,
                  cost: Math.max(0, it.cost + (newAlloc - bucket.allocated))
                }
              : it
          )
        };
      });
      return {
        ...prev,
        onboarding: {
          ...prev.onboarding,
          guestCount: whatIfGuests
        },
        budgetBuckets: updatedBuckets
      };
    });
  };

  const handleApplyScenario = (scenario: TradeOffScenario) => {
    onUpdatePlan((prev) => {
      const updatedBuckets: BudgetBucket[] = prev.budgetBuckets.map((bucket) => {
        const adj = scenario.adjustments.find(
          (a) => a.category.toLowerCase() === bucket.category.toLowerCase()
        );
        if (!adj) return bucket;
        return {
          ...bucket,
          allocated: adj.newAllocated,
          rationale: `${adj.actionSummary}`
        };
      });

      return {
        ...prev,
        activeTradeOffId: scenario.id,
        onboarding: {
          ...prev.onboarding,
          budget: scenario.targetTotalBudget
        },
        budgetBuckets: updatedBuckets
      };
    });
  };

  const handleAdjustBucketAllocation = (bucketId: string, delta: number) => {
    onUpdatePlan((prev) => {
      const updatedBuckets = prev.budgetBuckets.map((b) =>
        b.id === bucketId ? { ...b, allocated: Math.max(0, b.allocated + delta) } : b
      );
      const newTotal = updatedBuckets.reduce((sum, b) => sum + b.allocated, 0);
      return {
        ...prev,
        onboarding: {
          ...prev.onboarding,
          budget: newTotal
        },
        budgetBuckets: updatedBuckets
      };
    });
  };

  const handleAddLineItem = (e: React.FormEvent) => {
    e.preventDefault();
    const costNum = Number(newItemCost);
    if (!newItemName.trim() || isNaN(costNum) || costNum <= 0) return;

    const targetId =
      selectedBucketId && plan.budgetBuckets.some((b) => b.id === selectedBucketId)
        ? selectedBucketId
        : plan.budgetBuckets[0]?.id;
    if (!targetId) return;

    onUpdatePlan((prev) => {
      const updatedBuckets = prev.budgetBuckets.map((b) => {
        if (b.id !== targetId) return b;
        return {
          ...b,
          allocated: b.allocated + costNum,
          items: [
            ...b.items,
            {
              id: `item-${Date.now()}`,
              name: newItemName.trim(),
              cost: costNum,
              isMustHave: newItemMustHave,
              notes: newItemMustHave ? 'Protected must-have' : 'Flexible item'
            }
          ]
        };
      });
      return {
        ...prev,
        budgetBuckets: updatedBuckets
      };
    });

    setNewItemName('');
    setNewItemCost('');
    setNewItemMustHave(false);
    setShowAddModal(false);
  };

  const handleDeleteLineItem = (bucketId: string, itemId: string, itemCost: number) => {
    const targetBucket = plan.budgetBuckets.find((b) => b.id === bucketId);
    const targetItem = targetBucket?.items.find((i) => i.id === itemId);
    if (targetBucket && targetItem) {
      setRecentlyDeleted((prev) => [
        {
          bucketId,
          bucketName: targetBucket.category,
          item: targetItem
        },
        ...prev.slice(0, 4)
      ]);
    }

    onUpdatePlan((prev) => ({
      ...prev,
      budgetBuckets: prev.budgetBuckets.map((b) => {
        if (b.id !== bucketId) return b;
        return {
          ...b,
          allocated: Math.max(0, b.allocated - itemCost),
          items: b.items.filter((i) => i.id !== itemId)
        };
      })
    }));
  };

  const handleUndoDeleteItem = (indexToRestore: number) => {
    const entry = recentlyDeleted[indexToRestore];
    if (!entry) return;

    onUpdatePlan((prev) => ({
      ...prev,
      budgetBuckets: prev.budgetBuckets.map((b) => {
        if (b.id !== entry.bucketId) return b;
        if (b.items.some((i) => i.id === entry.item.id)) return b;
        return {
          ...b,
          allocated: b.allocated + entry.item.cost,
          items: [...b.items, entry.item]
        };
      })
    }));

    setExpandedBucketId(entry.bucketId);
    setRecentlyDeleted((prev) => prev.filter((_, idx) => idx !== indexToRestore));
  };

  // Check if Sound / Audio item or Photography & Sound allocation is missing/deleted
  const photoSoundBucket = plan.budgetBuckets.find((b) =>
    /photo|sound|audio|music/i.test(b.category)
  );
  const hasSoundItem = Boolean(
    photoSoundBucket &&
      photoSoundBucket.allocated > 0 &&
      photoSoundBucket.items.some((i) => /sound|audio|mic|speaker|pa\b|music/i.test(i.name))
  );

  const handleRestoreSoundBudget = () => {
    const baseTarget =
      plan.onboarding.budget ||
      plan.budgetBuckets.reduce((s, b) => s + b.allocated, 0) ||
      (currency === 'INR' ? 350000 : 6500);
    const defaultSoundCost =
      currency === 'INR'
        ? Math.max(8000, Math.round(baseTarget * 0.04))
        : Math.max(200, Math.round(baseTarget * 0.04));
    const defaultPhotoCost =
      currency === 'INR'
        ? Math.max(20000, Math.round(baseTarget * 0.1))
        : Math.max(650, Math.round(baseTarget * 0.1));

    const soundItem = {
      id: `sound-restored-${Date.now()}`,
      name:
        currency === 'INR'
          ? 'Acoustic Sound Setup & 2 Cordless Mics for Family Speeches'
          : 'Portable Directional PA Speaker & 2 Wireless Speech Microphones',
      cost: defaultSoundCost,
      isMustHave: true,
      notes: 'Clear speech projection & warm background music without booming echo'
    };

    const photoItem = {
      id: `photo-restored-${Date.now() + 1}`,
      name:
        currency === 'INR'
          ? 'Candid + Traditional Photographer & Family Portrait Session'
          : 'Documentary Photographer — Golden Hour & Toast Package',
      cost: defaultPhotoCost,
      isMustHave: true,
      notes: 'Covers multi-generational group portraits and candid moments'
    };

    onUpdatePlan((prev) => {
      const existingBucket = prev.budgetBuckets.find((b) =>
        /photo|sound|audio|music/i.test(b.category)
      );

      if (existingBucket) {
        const hasPhoto = existingBucket.items.some((i) =>
          /photo|camera|portrait|candid|documentary/i.test(i.name)
        );
        const hasSound = existingBucket.items.some((i) =>
          /sound|audio|mic|speaker|pa\b|music/i.test(i.name)
        );

        const itemsToAdd = [
          ...(!hasPhoto && existingBucket.items.length === 0 ? [photoItem] : []),
          ...(!hasSound ? [soundItem] : [])
        ];

        if (itemsToAdd.length === 0 && existingBucket.allocated > 0) {
          return prev;
        }

        const addedCost = itemsToAdd.reduce((sum, i) => sum + i.cost, 0);
        const updatedBuckets = prev.budgetBuckets.map((b) => {
          if (b.id !== existingBucket.id) return b;
          const nextItems = [...b.items, ...itemsToAdd];
          const nextAllocated =
            b.allocated === 0
              ? nextItems.reduce((sum, i) => sum + i.cost, 0)
              : b.allocated + addedCost;
          return {
            ...b,
            allocated: nextAllocated,
            items: nextItems
          };
        });

        setExpandedBucketId(existingBucket.id);
        return {
          ...prev,
          budgetBuckets: updatedBuckets
        };
      }

      // If the entire bucket was somehow removed, recreate it
      const newBucketId = 'gen-photo-sound';
      const newBucket: BudgetBucket = {
        id: newBucketId,
        category: 'Photography & Sound',
        allocated: defaultPhotoCost + defaultSoundCost,
        committed: 0,
        priority: 'High Impact',
        rationale: 'Event photography and clear wireless microphone audio for speeches.',
        items: [photoItem, soundItem]
      };
      setExpandedBucketId(newBucketId);
      return {
        ...prev,
        budgetBuckets: [...prev.budgetBuckets, newBucket]
      };
    });
  };

  const handleRestoreBucketDefaults = (bucket: BudgetBucket) => {
    if (/photo|sound|audio|music/i.test(bucket.category)) {
      handleRestoreSoundBudget();
      return;
    }
    const baseTarget =
      plan.onboarding.budget ||
      plan.budgetBuckets.reduce((s, b) => s + b.allocated, 0) ||
      (currency === 'INR' ? 350000 : 6500);
    const guests = plan.onboarding.guestCount || (currency === 'INR' ? 120 : 65);

    let defaultCost = Math.round(baseTarget * 0.12);
    let defaultName = `${bucket.category} Core Allocation`;
    let defaultMustHave = bucket.priority === 'Protected Must-Have';

    if (/venue|spatial/i.test(bucket.category)) {
      defaultCost = Math.round(baseTarget * 0.22);
      defaultName = `Private Venue / Banquet Hall (${guests} Guests Capacity)`;
      defaultMustHave = true;
    } else if (/cater|food|beverage/i.test(bucket.category)) {
      defaultCost = Math.round(baseTarget * 0.46);
      defaultName = `Full Meal & Beverage Service (${guests} Guests)`;
      defaultMustHave = true;
    } else if (/decor|floral/i.test(bucket.category)) {
      defaultCost = Math.round(baseTarget * 0.1);
      defaultName = 'Floral Decor, Warm Lighting & Invitations';
    } else if (/logistic|access/i.test(bucket.category)) {
      defaultCost = Math.round(baseTarget * 0.08);
      defaultName = 'Elder Comfort Seating & Contingency Buffer';
    }

    onUpdatePlan((prev) => ({
      ...prev,
      budgetBuckets: prev.budgetBuckets.map((b) => {
        if (b.id !== bucket.id) return b;
        const restoredItem = {
          id: `restored-${Date.now()}`,
          name: defaultName,
          cost: defaultCost,
          isMustHave: defaultMustHave,
          notes: 'Restored default category allocation'
        };
        return {
          ...b,
          allocated: b.allocated > 0 ? b.allocated + defaultCost : defaultCost,
          items: [...b.items, restoredItem]
        };
      })
    }));
  };

  if (plan.budgetBuckets.length === 0) {
    return (
      <div className="border border-[#e5ddcf] dark:border-[#2d2442] bg-white dark:bg-[#1A142D] p-10 rounded-3xl text-center max-w-2xl mx-auto space-y-4 festive-card-glow">
        <h2 className="text-2xl font-bold text-[#18122b] dark:text-white">
          No Budget Breakdown Yet
        </h2>
        <p className="text-base text-[#544c60] dark:text-[#a8a1b7]">
          Answer the 5 setup questions on <strong>Slide 01</strong> or click one of the <strong>Celebration Mode pills (Shaadi / B&apos;day)</strong> in the top bar to generate your category breakdown and smart trade-offs.
        </p>
        {onLoadDemoEvent && (
          <button
            type="button"
            onClick={onLoadDemoEvent}
            className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#FF5E14] to-[#EC4899] rounded-xl inline-flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Load Demo Celebration Budget
          </button>
        )}
      </div>
    );
  }

  const chartData = plan.budgetBuckets.map((bucket, index) => {
    const sharePct = Math.round(
      (bucket.allocated / Math.max(1, currentTotalAllocated)) * 100
    );
    return {
      id: bucket.id,
      name: bucket.category,
      value: bucket.allocated,
      priority: bucket.priority,
      sharePct,
      color: palette[index % palette.length]
    };
  });

  const activeSlice =
    chartData.find((d) => d.id === (hoveredBucketId || expandedBucketId)) ||
    chartData[0] ||
    null;

  return (
    <div className="space-y-6">
      {/* 3-Card Festive Executive Budget & Elasticity Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: Budget Consumption & Progress Bar */}
        <div className="bg-white dark:bg-[#151024] border border-[#e5ddcf] dark:border-[#2d2442] p-5 rounded-2xl festive-card-glow flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#544c60] dark:text-[#a8a1b7]">
              Planned Spend vs Cap ({currency})
            </span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#fff1eb] to-[#fef3c7] dark:from-[#3d1704] dark:to-[#451a03] flex items-center justify-center text-[#ff5e14] border border-[#fed7aa] dark:border-[#7c2d12]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[#18122b] dark:text-white">
                {fmt(currentTotalAllocated)}
              </span>
              <span className="text-sm font-mono text-[#544c60] dark:text-[#a8a1b7] font-semibold">
                / {fmt(targetBudget)}
              </span>
            </div>
            <div className="mt-1 text-xs font-semibold text-[#544c60] dark:text-[#a8a1b7]">
              ~{fmt(Math.round(currentTotalAllocated / Math.max(1, currentGuests)))} per guest across{' '}
              {plan.budgetBuckets.length} categories
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-[#f8f4ed] dark:bg-[#231b38] h-2.5 rounded-full overflow-hidden flex border border-[#e5ddcf]/70 dark:border-[#382d54]">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  variance < 0
                    ? 'bg-gradient-to-r from-[#e11d48] to-[#f43f5e]'
                    : 'bg-gradient-to-r from-[#6d28d9] via-[#ec4899] to-[#ff5e14]'
                }`}
                style={{ width: `${Math.min(100, percentConsumed)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Remaining Buffer / Reserve Status */}
        <div className="bg-white dark:bg-[#151024] border border-[#e5ddcf] dark:border-[#2d2442] p-5 rounded-2xl festive-card-glow flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#544c60] dark:text-[#a8a1b7]">
              Unallocated Reserve / Buffer
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                variance < 0
                  ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              {variance < 0 ? 'Over Cap' : 'Healthy Reserve'}
            </span>
          </div>
          <div
            className={`mt-3 text-2xl sm:text-3xl font-bold font-mono tabular-nums ${
              variance < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-[#059669] dark:text-[#10b981]'
            }`}
          >
            {fmtSigned(variance)}
          </div>
          <div className="mt-2 text-xs sm:text-sm text-[#544c60] dark:text-[#a8a1b7]">
            {variance < 0
              ? 'Over target cap — switch to Smart Budget Cuts below to trim flexible extras.'
              : 'Protected must-haves (Food & Venue) are 100% funded within cap.'}
          </div>
        </div>

        {/* Card 3: Interactive What-If Guest Elasticity Simulator */}
        <div className="bg-gradient-to-br from-[#fff9f5] via-white to-[#f5f3ff] dark:from-[#1d1532] dark:via-[#151024] dark:to-[#24162b] border border-[#fed7aa] dark:border-[#4c1d95] p-5 rounded-2xl festive-card-glow flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6d28d9] dark:text-[#c4b5fd] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#ff5e14]" />
              What-If Guest Elasticity
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-[#fff1eb] dark:bg-[#3d1704] text-[#c2410c] dark:text-[#ffbc99] border border-[#fed7aa] dark:border-[#7c2d12]">
              <Users className="w-3 h-3 inline mr-1" />
              {whatIfGuests} Guests
            </span>
          </div>

          <div className="my-2.5">
            <input
              type="range"
              min={20}
              max={400}
              step={5}
              value={whatIfGuests}
              onChange={(e) => setWhatIfGuests(Number(e.target.value))}
              aria-label="Simulate Guest Count Elasticity"
              className="w-full accent-[#ff5e14] cursor-pointer"
            />
            <div className="flex items-center justify-between text-xs font-mono text-[#544c60] dark:text-[#a8a1b7] mt-1">
              <span>Current: {currentGuests} pax</span>
              <span
                className={
                  elasticDelta > 0
                    ? 'text-amber-700 dark:text-amber-300 font-bold'
                    : elasticDelta < 0
                    ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                    : ''
                }
              >
                Est. Total: {fmt(projectedElasticSpend)} ({fmtSigned(elasticDelta)})
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={whatIfGuests === currentGuests}
            onClick={handleApplyWhatIfGuests}
            className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#6d28d9] to-[#ff5e14] hover:opacity-95 disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
          >
            {whatIfGuests === currentGuests
              ? 'Drag Slider to Simulate Headcount Change'
              : `Apply ${whatIfGuests} Guests (${fmtSigned(elasticDelta)} F&B Scale)`}
          </button>
        </div>
      </div>

      {/* Clear Sub-View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5ddcf] dark:border-[#2d2442] pb-4">
        <div className="flex items-center gap-2 p-1.5 bg-[#f3ede2] dark:bg-[#1e1732] rounded-xl self-start border border-[#e5ddcf] dark:border-[#2d2442]">
          <button
            type="button"
            onClick={() => setSubView('OVERVIEW')}
            className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${
              subView === 'OVERVIEW'
                ? 'bg-gradient-to-r from-[#6d28d9] to-[#4f46e5] text-white shadow-xs'
                : 'text-[#544c60] dark:text-[#a8a1b7] hover:text-[#18122b] dark:hover:text-white'
            }`}
          >
            1. Category Breakdown & Chart
          </button>
          <button
            type="button"
            onClick={() => setSubView('TRADEOFFS')}
            className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${
              subView === 'TRADEOFFS'
                ? 'bg-gradient-to-r from-[#ff5e14] to-[#ff8a00] text-white shadow-xs'
                : 'text-[#544c60] dark:text-[#a8a1b7] hover:text-[#18122b] dark:hover:text-white'
            }`}
          >
            2. Smart Budget Cuts ({plan.tradeOffScenarios.length} Options)
          </button>
        </div>

        {subView === 'OVERVIEW' && (
          <div className="flex flex-wrap items-center gap-2.5 self-start">
            {!hasSoundItem && (
              <button
                type="button"
                onClick={handleRestoreSoundBudget}
                className="px-4 py-2.5 text-sm font-bold text-[#6d28d9] dark:text-[#e9d5ff] bg-[#f5f3ff] dark:bg-[#281f3d] hover:bg-[#ede9fe] dark:hover:bg-[#382d54] border border-[#c4b5fd] dark:border-[#6d28d9] rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Volume2 className="w-4 h-4 text-[#ff5e14]" />
                Restore Sound Budget
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddModal((v) => !v)}
              className="px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#ff5e14] to-[#ff8a00] hover:opacity-95 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              {showAddModal ? 'Close Add Form' : 'Add Expense Item'}
            </button>
          </div>
        )}
      </div>

      {/* 1-Click Undo Banner when any expense item was recently deleted */}
      {recentlyDeleted.length > 0 && subView === 'OVERVIEW' && (
        <div className="bg-[#f5f3ff] dark:bg-[#231b38] border border-[#c4b5fd] dark:border-[#5b21b6] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 festive-card-glow">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#6d28d9]/10 dark:bg-[#a78bfa]/20 flex items-center justify-center text-[#6d28d9] dark:text-[#c4b5fd] shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div className="text-sm">
              <span className="font-bold text-[#18122b] dark:text-white">
                Removed &ldquo;{recentlyDeleted[0].item.name}&rdquo; ({fmt(recentlyDeleted[0].item.cost)})
              </span>{' '}
              <span className="text-[#544c60] dark:text-[#c4b5fd]">
                from {recentlyDeleted[0].bucketName}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleUndoDeleteItem(0)}
              className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#6d28d9] to-[#ff5e14] rounded-xl hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Bring Back Item ({fmt(recentlyDeleted[0].item.cost)})
            </button>
            <button
              type="button"
              onClick={() => setRecentlyDeleted((prev) => prev.slice(1))}
              className="px-2.5 py-2 text-xs font-semibold text-[#544c60] dark:text-[#a8a1b7] hover:text-[#18122b] dark:hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Optional Add Expense Drawer */}
      {showAddModal && subView === 'OVERVIEW' && (
        <form
          onSubmit={handleAddLineItem}
          className="bg-white dark:bg-[#151024] border-2 border-[#6d28d9] dark:border-[#a78bfa] rounded-2xl p-6 space-y-4 festive-card-glow"
        >
          <h3 className="text-lg font-bold text-[#18122b] dark:text-white">
            Add New Expense Line Item ({currencySymbol})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#544c60] dark:text-[#a8a1b7]">
                Category
              </label>
              <select
                value={selectedBucketId}
                onChange={(e) => setSelectedBucketId(e.target.value)}
                className="mt-1.5 w-full px-4 py-2.5 text-base bg-[#fbf9f5] dark:bg-[#1d1630] border border-[#e5ddcf] dark:border-[#382d54] text-[#18122b] dark:text-white rounded-xl"
              >
                {plan.budgetBuckets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#544c60] dark:text-[#a8a1b7]">
                Item Name
              </label>
              <input
                type="text"
                placeholder="e.g., Anniversary Cake"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="mt-1.5 w-full px-4 py-2.5 text-base bg-[#fbf9f5] dark:bg-[#1d1630] border border-[#e5ddcf] dark:border-[#382d54] text-[#18122b] dark:text-white rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#544c60] dark:text-[#a8a1b7]">
                Cost ({currencySymbol})
              </label>
              <input
                type="number"
                placeholder={currency === 'INR' ? '15000' : '250'}
                value={newItemCost}
                onChange={(e) => setNewItemCost(e.target.value)}
                className="mt-1.5 w-full px-4 py-2.5 text-base font-mono tabular-nums bg-[#fbf9f5] dark:bg-[#1d1630] border border-[#e5ddcf] dark:border-[#382d54] text-[#18122b] dark:text-white rounded-xl"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2.5 text-base text-[#18122b] dark:text-[#e2dcf0] cursor-pointer">
              <input
                type="checkbox"
                checked={newItemMustHave}
                onChange={(e) => setNewItemMustHave(e.target.checked)}
                className="w-4 h-4 rounded accent-[#6d28d9]"
              />
              Mark as a Must-Have (protect from budget cuts)
            </label>
            <button
              type="submit"
              className="px-6 py-2.5 text-base font-bold text-white bg-gradient-to-r from-[#6d28d9] to-[#4f46e5] rounded-xl cursor-pointer"
            >
              Save Item
            </button>
          </div>
        </form>
      )}

      {/* SUB-VIEW 1: DONUT CHART + CLEAN ACCORDION CATEGORY CARDS */}
      {subView === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Clean Donut Chart Card */}
          <div className="lg:col-span-5 bg-white dark:bg-[#151024] border border-[#e5ddcf] dark:border-[#2d2442] rounded-2xl p-6 lg:sticky lg:top-24 festive-card-glow">
            <h2 className="text-xl font-bold text-[#18122b] dark:text-white">
              Where Your Money Goes
            </h2>
            <p className="text-sm text-[#544c60] dark:text-[#a8a1b7] mt-1">
              Hover or click any slice to see its category name, budget amount, and exact items.
            </p>

            <div className="relative h-72 mt-3 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    onMouseEnter={(_, index) => {
                      const item = chartData[index];
                      if (item) setHoveredBucketId(item.id);
                    }}
                    onMouseLeave={() => setHoveredBucketId(null)}
                    onClick={(_, index) => {
                      const item = chartData[index];
                      if (item) setExpandedBucketId(item.id);
                    }}
                  >
                    {chartData.map((entry) => {
                      const activeTargetId = hoveredBucketId || expandedBucketId;
                      const isHighlighted = !activeTargetId || activeTargetId === entry.id;
                      return (
                        <Cell
                          key={entry.id}
                          fill={entry.color}
                          fillOpacity={isHighlighted ? 1 : 0.3}
                          stroke={isDark ? '#151024' : '#FFFFFF'}
                          strokeWidth={2}
                          className="cursor-pointer outline-none"
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, item) => {
                      const pct = item?.payload?.sharePct;
                      const formattedVal = `${fmt(Number(value) || 0)}${
                        pct !== undefined ? ` (${pct}%)` : ''
                      }`;
                      return [formattedVal, String(name || item?.payload?.name || 'Category')];
                    }}
                    contentStyle={{
                      backgroundColor: '#18122B',
                      border: '1px solid #4C1D95',
                      borderRadius: '12px',
                      color: '#F8FAFC',
                      fontSize: '14px',
                      fontWeight: 600,
                      padding: '10px 14px'
                    }}
                    itemStyle={{ color: '#F8FAFC' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {activeSlice && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-8">
                  <span className="text-xs font-bold text-[#544c60] dark:text-[#c4b5fd] max-w-[145px] leading-tight">
                    {activeSlice.name}
                  </span>
                  <span className="text-2xl font-bold font-mono tabular-nums text-[#18122b] dark:text-white mt-1">
                    {fmt(activeSlice.value)}
                  </span>
                  <span className="text-xs font-mono font-bold tabular-nums text-[#ff5e14] dark:text-[#ff8a00] mt-0.5">
                    {activeSlice.sharePct}% of budget
                  </span>
                </div>
              )}
            </div>

            {/* Interactive Category Color Legend Right Inside the Chart Card */}
            <div className="mt-3 pt-3 border-t border-[#f0eae1] dark:border-[#2d2442] space-y-1.5">
              {chartData.map((entry) => {
                const isCurrent = (hoveredBucketId || expandedBucketId) === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onMouseEnter={() => setHoveredBucketId(entry.id)}
                    onMouseLeave={() => setHoveredBucketId(null)}
                    onClick={() => setExpandedBucketId(entry.id)}
                    className={`w-full px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-[#fff1eb] dark:bg-[#281f3d] font-bold border border-[#fed7aa] dark:border-[#4c1d95]'
                        : 'hover:bg-[#fbf9f5] dark:hover:bg-[#1e1732]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-sm shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm text-[#18122b] dark:text-[#f5f3ff] truncate">
                        {entry.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-sm font-mono tabular-nums">
                      <span className="text-[#18122b] dark:text-white font-semibold">
                        {fmt(entry.value)}
                      </span>
                      <span className="text-xs text-[#544c60] dark:text-[#a8a1b7] w-10 text-right">
                        ({entry.sharePct}%)
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Clean Expandable Category Cards (One expanded at a time) */}
          <div className="lg:col-span-7 space-y-4">
            {plan.budgetBuckets.map((bucket, idx) => {
              const sharePct = Math.round(
                (bucket.allocated / Math.max(1, currentTotalAllocated)) * 100
              );
              const color = palette[idx % palette.length];
              const isExpanded = expandedBucketId === bucket.id;

              return (
                <div
                  key={bucket.id}
                  className={`bg-white dark:bg-[#151024] border-2 rounded-2xl transition-all festive-card-glow ${
                    isExpanded
                      ? 'border-[#6d28d9] dark:border-[#a78bfa]'
                      : 'border-[#e5ddcf] dark:border-[#2d2442]'
                  }`}
                >
                  {/* Clickable Card Header */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedBucketId((prev) => (prev === bucket.id ? null : bucket.id))
                    }
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-start gap-3.5">
                      <span
                        className="w-4 h-4 rounded-md shrink-0 mt-1.5"
                        style={{ backgroundColor: color }}
                      />
                      <div>
                        <h3 className="text-lg font-bold text-[#18122b] dark:text-white">
                          {bucket.category}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              bucket.priority === 'Protected Must-Have'
                                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                                : bucket.priority === 'High Impact'
                                ? 'bg-violet-100 dark:bg-violet-950/70 text-violet-800 dark:text-violet-300'
                                : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {bucket.priority}
                          </span>
                          <span className="text-xs font-mono text-[#544c60] dark:text-[#a8a1b7]">
                            {sharePct}% of total budget
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-xl font-bold font-mono tabular-nums text-[#18122b] dark:text-white">
                          {fmt(bucket.allocated)}
                        </div>
                        <div className="text-xs text-[#544c60] dark:text-[#a8a1b7]">
                          {bucket.items.length} items
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-[#6d28d9] dark:text-[#a78bfa]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#544c60]" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 border-t border-[#f0eae1] dark:border-[#2d2442] space-y-4">
                      <p className="text-base text-[#544c60] dark:text-[#d1cbe0]">
                        {bucket.rationale}
                      </p>

                      {/* Line Items */}
                      <div className="space-y-3">
                        {bucket.items.map((item) => (
                          <div
                            key={item.id}
                            className="p-4 bg-[#fbf9f5] dark:bg-[#1d1630] border border-[#e5ddcf]/70 dark:border-[#382d54] rounded-xl flex items-center justify-between gap-4"
                          >
                            <div>
                              <div className="text-base font-semibold text-[#18122b] dark:text-white">
                                {item.name}
                              </div>
                              <div className="text-sm text-[#544c60] dark:text-[#a8a1b7] mt-0.5">
                                {item.isMustHave ? 'Must-Have Priority' : 'Flexible Item'} · {item.notes}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-base font-bold font-mono tabular-nums text-[#18122b] dark:text-white">
                                {fmt(item.cost)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteLineItem(bucket.id, item.id, item.cost)}
                                title="Delete item"
                                className="p-2 text-[#544c60] hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Empty or Deleted Item Recovery Prompt */}
                        {(bucket.items.length === 0 ||
                          bucket.allocated === 0 ||
                          (/photo|sound|audio|music/i.test(bucket.category) && !hasSoundItem)) && (
                          <div className="p-4 rounded-xl border border-dashed border-[#c4b5fd] dark:border-[#5b21b6] bg-[#f5f3ff]/60 dark:bg-[#231b38]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="text-sm text-[#544c60] dark:text-[#d1cbe0]">
                              {/photo|sound|audio|music/i.test(bucket.category) && !hasSoundItem
                                ? 'Sound & Wireless Mic item was deleted from this category.'
                                : 'All items in this category were deleted.'}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRestoreBucketDefaults(bucket)}
                              className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#6d28d9] to-[#ff5e14] rounded-xl hover:opacity-95 transition-all inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 cursor-pointer shadow-2xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              {/photo|sound|audio|music/i.test(bucket.category)
                                ? 'Restore Sound Budget'
                                : `Restore ${bucket.category} Default`}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Quick Adjust Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                        <span className="text-sm font-medium text-[#544c60] dark:text-[#a8a1b7]">
                          Quick-tune category budget:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAdjustBucketAllocation(bucket.id, -quickDelta)}
                            className="px-3.5 py-1.5 text-sm font-mono font-bold bg-[#f3ede2] dark:bg-[#281f3d] hover:bg-[#e5ddcf] dark:hover:bg-[#382d54] text-[#18122b] dark:text-white rounded-lg cursor-pointer"
                          >
                            -{formatMoney(quickDelta, currency)}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustBucketAllocation(bucket.id, quickDelta)}
                            className="px-3.5 py-1.5 text-sm font-mono font-bold bg-[#fff1eb] dark:bg-[#3d1704] hover:bg-[#fed7aa] text-[#c2410c] dark:text-[#ffbc99] border border-[#fed7aa] dark:border-[#7c2d12] rounded-lg cursor-pointer"
                          >
                            +{formatMoney(quickDelta, currency)}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: SMART BUDGET CUTS (ASYMMETRIC TRADE-OFFS) */}
      {subView === 'TRADEOFFS' && (
        <div className="space-y-8">
          <div className="bg-white dark:bg-[#151024] border border-[#e5ddcf] dark:border-[#2d2442] rounded-2xl p-6 festive-card-glow">
            <h2 className="text-xl font-bold text-[#18122b] dark:text-white">
              Need to Lower Your Total Cost?
            </h2>
            <p className="text-base text-[#544c60] dark:text-[#d1cbe0] mt-1">
              Instead of cutting every category evenly, pick a realistic trade-off plan below that protects your food and family comfort while cutting flexible extras.
            </p>

            {/* Custom AI Trade-Off Generator Bar */}
            <div className="mt-6 p-5 bg-[#fbf9f5] dark:bg-[#1d1630] border border-[#e5ddcf] dark:border-[#382d54] rounded-xl grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-[#544c60] dark:text-[#a8a1b7]">
                  New Target Budget ({currencySymbol})
                </label>
                <input
                  type="number"
                  step={currency === 'INR' ? 10000 : 250}
                  value={simBudget}
                  onChange={(e) => setSimBudget(Number(e.target.value))}
                  className="mt-1.5 w-full px-4 py-2.5 text-base font-mono tabular-nums bg-white dark:bg-[#120e22] border border-[#e5ddcf] dark:border-[#382d54] text-[#18122b] dark:text-white rounded-xl"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#544c60] dark:text-[#a8a1b7]">
                  Guest Count
                </label>
                <input
                  type="number"
                  value={simGuests}
                  onChange={(e) => setSimGuests(Number(e.target.value))}
                  className="mt-1.5 w-full px-4 py-2.5 text-base font-mono tabular-nums bg-white dark:bg-[#120e22] border border-[#e5ddcf] dark:border-[#382d54] text-[#18122b] dark:text-white rounded-xl"
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-[#544c60] dark:text-[#a8a1b7]">
                  What Must Be Protected?
                </label>
                <input
                  type="text"
                  value={simConstraintNote}
                  onChange={(e) => setSimConstraintNote(e.target.value)}
                  className="mt-1.5 w-full px-4 py-2.5 text-base bg-white dark:bg-[#120e22] border border-[#e5ddcf] dark:border-[#382d54] text-[#18122b] dark:text-white rounded-xl"
                />
              </div>
              <div className="md:col-span-3">
                <button
                  type="button"
                  disabled={isGeneratingTradeOffs}
                  onClick={() => onRequestAiTradeOffs(simBudget, simGuests, simConstraintNote)}
                  className="w-full px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-[#6d28d9] via-[#ec4899] to-[#ff5e14] rounded-xl hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-4 h-4" />
                  {isGeneratingTradeOffs ? 'Calculating...' : 'Generate AI Cut Plan'}
                </button>
              </div>
            </div>
          </div>

          {/* Trade-Off Option Cards */}
          <div className="space-y-6">
            {plan.tradeOffScenarios.map((scenario) => {
              const isApplied = plan.activeTradeOffId === scenario.id;
              return (
                <div
                  key={scenario.id}
                  className={`bg-white dark:bg-[#151024] border-2 rounded-2xl p-6 festive-card-glow ${
                    isApplied
                      ? 'border-emerald-600 dark:border-emerald-400'
                      : 'border-[#e5ddcf] dark:border-[#2d2442]'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#f0eae1] dark:border-[#2d2442]">
                    <div>
                      <div className="text-sm font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-bold">
                        Saves {fmt(scenario.netSavings)} · New Total:{' '}
                        {fmt(scenario.targetTotalBudget)}
                      </div>
                      <h3 className="text-xl font-bold text-[#18122b] dark:text-white mt-1">
                        {scenario.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyScenario(scenario)}
                      className={`px-5 py-3 text-sm font-bold rounded-xl flex items-center gap-2 shrink-0 cursor-pointer transition-all ${
                        isApplied
                          ? 'bg-emerald-700 dark:bg-emerald-500 text-white dark:text-slate-950'
                          : 'bg-gradient-to-r from-[#ff5e14] to-[#ff8a00] text-white hover:opacity-95 shadow-xs'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Applied to Your Budget
                        </>
                      ) : (
                        <>
                          Apply This Trade-Off Plan
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-base text-[#544c60] dark:text-[#d1cbe0] mt-4 leading-relaxed">
                    {scenario.experienceTradeOffSummary}
                  </p>

                  {/* Simple List of Category Changes */}
                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {scenario.adjustments.map((adj, i) => (
                      <div
                        key={i}
                        className="p-4 bg-[#fbf9f5] dark:bg-[#1d1630] border border-[#e5ddcf] dark:border-[#382d54] rounded-xl"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base font-bold text-[#18122b] dark:text-white">
                            {adj.category}
                          </span>
                          <span className="text-base font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                            {fmtSigned(adj.delta)}
                          </span>
                        </div>
                        <div className="text-sm font-mono tabular-nums text-[#544c60] dark:text-[#a8a1b7] mt-0.5">
                          Was {fmt(adj.previousAllocated)} → Now {fmt(adj.newAllocated)}
                        </div>
                        <p className="text-sm text-[#544c60] dark:text-[#d1cbe0] mt-2">
                          {adj.actionSummary}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

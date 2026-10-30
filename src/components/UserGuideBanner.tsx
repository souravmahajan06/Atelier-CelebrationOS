import React from 'react';
import { CurrencyCode, formatMoney } from '../utils/currency';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  X
} from 'lucide-react';

export type ActiveTab = 'ONBOARDING' | 'BUDGET' | 'VENDORS' | 'TIMELINE' | 'PERSONALIZATION';

interface GuideStep {
  stepNumber: number;
  tab: ActiveTab;
  title: string;
  whatYouLearn: string;
  howToUseIt: string[];
  demoButtonLabel: string;
  demoFeedbackText: string;
}

interface UserGuideBannerProps {
  isOpen: boolean;
  currentStepIndex: number;
  currency: CurrencyCode;
  hasCompletedDemoOnStep: boolean;
  onStartGuide: () => void;
  onCloseGuide: () => void;
  onSelectStep: (index: number) => void;
  onTriggerStepDemo: (stepIndex: number) => void;
  onResetToFreshPlan: () => void;
}

export const UserGuideBanner: React.FC<UserGuideBannerProps> = ({
  isOpen,
  currentStepIndex,
  currency,
  hasCompletedDemoOnStep,
  onCloseGuide,
  onSelectStep,
  onTriggerStepDemo,
  onResetToFreshPlan
}) => {
  if (!isOpen) return null;

  const sampleCutStr =
    currency === 'INR' ? formatMoney(50000, 'INR') : formatMoney(1000, 'USD');

  const steps: GuideStep[] = [
    {
      stepNumber: 1,
      tab: 'ONBOARDING',
      title: 'Step 1: Event Search, Q&A Setup & Currency Switcher',
      whatYouLearn:
        'Use the top search & setup bar to answer 5 practical questions (Occasion, Budget & Guests, Date, Vibe, and Must-Haves) and automatically populate your 5 Core Event Basics below.',
      howToUseIt: [
        'Use the "$ USD | ₹ INR" toggle in the top bar anytime, or type amounts like "₹3,50,000", "5 lakhs", or "$6,500" directly in the search box.',
        'Click any 1-Click Answer chip (or type your own answer) and watch the 5 Core Event Basics below turn green.',
        'Want to preview a completed event right away? Click the green action button on the right!'
      ],
      demoButtonLabel: 'Preview: Auto-Fill Sample Family Event',
      demoFeedbackText:
        'Loaded! Scroll down to see all 5 Core Event Basics populated with a complete family celebration plan and 1-Click Smart Optimization Swaps.'
    },
    {
      stepNumber: 2,
      tab: 'BUDGET',
      title: 'Step 2: Visual Budget Breakdown, Guest Slider & Smart Cuts',
      whatYouLearn:
        'Hover over any Donut Chart slice to see the exact Category Name, Amount, and % Share, or drag the What-If Guest Elasticity Slider to see per-head Catering changes live.',
      howToUseIt: [
        'Hover or click any slice of the Donut Chart to inspect its category name and line items.',
        'Drag the What-If Guest Count Slider to test how adding or removing guests impacts food costs while keeping Venue fixed.',
        'Click the green action button on the right to simulate a smart budget cut without hurting food quality!'
      ],
      demoButtonLabel: `Preview: Apply a ${sampleCutStr} Smart Budget Cut`,
      demoFeedbackText: `Applied! Notice how your Target Budget Cap dropped by ${sampleCutStr} while Catering stayed 100% protected.`
    },
    {
      stepNumber: 3,
      tab: 'VENDORS',
      title: 'Step 3: Compare Vendor Quotes & Uncover Hidden Fees',
      whatYouLearn:
        'A caterer or banquet hall advertising a low base price often hides 18%–22% service fees, GST/taxes, generator charges, or corkage penalties in the fine print.',
      howToUseIt: [
        'Compare the "Advertised Price" against the "Real Total Cost" on each vendor card below.',
        'Click "Inspect Hidden Charges & Inclusions" on any card to reveal the fine-print surcharges.',
        'Click "Paste & Audit a New Quote" to calculate the true cost of any vendor proposal.'
      ],
      demoButtonLabel: 'Preview: Audit a Vendor Quote with Hidden Fees',
      demoFeedbackText:
        'Audited! A new vendor quote card was added below showing its Advertised Price vs. Real Total Cost.'
    },
    {
      stepNumber: 4,
      tab: 'TIMELINE',
      title: 'Step 4: Linked Checklist & Automatic Delay Cascade',
      whatYouLearn:
        'Event tasks depend on each other: you cannot print invitations or lock catering until the venue is booked. If one task runs late, all dependent deadlines shift automatically.',
      howToUseIt: [
        'Each step card below shows which upstream step it depends on and which downstream steps it controls.',
        'When a vendor or task is delayed, click "+7 Days Delay" on that card (or type "Venue delayed by 7 days" in the search bar).',
        'Click the action button on the right to delay Step T-01 by +7 days and watch dependent tasks shift!'
      ],
      demoButtonLabel: 'Preview: Delay Step T-01 by +7 Days',
      demoFeedbackText:
        'Shifted! Look at the amber Automatic Schedule Update banner below—Steps T-02, T-03, and T-04 automatically moved forward by +7 days.'
    },
    {
      stepNumber: 5,
      tab: 'PERSONALIZATION',
      title: 'Step 5: Multi-Generational Guest Comfort & Export',
      whatYouLearn:
        'Great family celebrations take care of every generation—from grandparents who need step-free seating and table service to children who need early meals and activities.',
      howToUseIt: [
        'Toggle practical guest comfort rules below (such as VIP elder seating away from loud speakers or dedicated dietary counters).',
        'Click "+ Add Guest Need" to add custom accommodations for your family.',
        'Click "Export" in the top bar anytime to copy or download your entire plan as Markdown or JSON!'
      ],
      demoButtonLabel: 'Preview: Add a Grandparent Comfort Rule',
      demoFeedbackText:
        'Added! A new Grandparent Comfort & Accessibility rule is now active in your guest plan below.'
    }
  ];

  const activeStep = steps[currentStepIndex] || steps[0];

  return (
    <div className="bg-white dark:bg-[#1A142D] border-2 border-violet-500/80 dark:border-violet-500/70 rounded-3xl overflow-hidden festive-card-glow">
      {/* Top Progress Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-[#2E1065] via-[#6D28D9] to-[#BE185D] text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-amber-400 text-slate-950 rounded-lg flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            App Guide · Step {activeStep.stepNumber} of 5
          </span>
          <span className="text-sm sm:text-base font-medium text-pink-100">
            Quick overview of each workspace feature and 1-click live preview
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            {steps.map((st, idx) => (
              <button
                key={st.stepNumber}
                type="button"
                onClick={() => onSelectStep(idx)}
                className={`w-8 h-8 rounded-lg text-sm font-mono font-bold transition-colors cursor-pointer ${
                  idx === currentStepIndex
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : idx < currentStepIndex
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white/15 text-slate-200 hover:bg-white/25 hover:text-white'
                }`}
                title={st.title}
              >
                {st.stepNumber}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onCloseGuide}
            className="px-3 py-1.5 text-xs font-bold text-white bg-white/15 hover:bg-white/25 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            Close Guide
          </button>
        </div>
      </div>

      {/* Main Guide Content + Interactive Preview Box */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {activeStep.title}
          </h3>
          <p className="text-base text-slate-700 dark:text-slate-200 leading-relaxed">
            {activeStep.whatYouLearn}
          </p>
          <div className="space-y-2 pt-1">
            <div className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-pink-400">
              How to use this feature:
            </div>
            <ul className="space-y-2">
              {activeStep.howToUseIt.map((bullet, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-base text-slate-700 dark:text-slate-300"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right 5 Cols: Quick Feature Preview Action Box */}
        <div className="lg:col-span-5 bg-gradient-to-br from-violet-50/90 via-white to-amber-50/70 dark:from-[#221A3A] dark:via-[#1E1734] dark:to-[#24193C] border border-[#E5DDCF] dark:border-[#342856] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-violet-700 dark:text-pink-300">
            <Sparkles className="w-4 h-4" />
            <span>1-Click Feature Preview</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Click below to preview this feature directly on the current slide:
          </p>

          <button
            type="button"
            onClick={() => onTriggerStepDemo(currentStepIndex)}
            className="w-full py-3.5 px-5 text-base font-bold text-white bg-gradient-to-r from-[#059669] to-[#10B981] hover:opacity-95 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            {activeStep.demoButtonLabel}
          </button>

          {hasCompletedDemoOnStep && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-sm font-medium text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{activeStep.demoFeedbackText}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation Footer */}
      <div className="px-6 py-4 bg-[#FBF9F5] dark:bg-[#140F23] border-t border-[#E5DDCF] dark:border-[#2A2244] flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          disabled={currentStepIndex === 0}
          onClick={() => onSelectStep(Math.max(0, currentStepIndex - 1))}
          className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1E1736] border border-[#E5DDCF] dark:border-[#2E254D] rounded-xl disabled:opacity-40 flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous Step
        </button>

        <div className="flex flex-wrap items-center gap-3">
          {currentStepIndex === steps.length - 1 ? (
            <>
              <button
                type="button"
                onClick={onResetToFreshPlan}
                className="px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1E1736] border border-[#E5DDCF] dark:border-[#2E254D] rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Close &amp; Start Blank Event
              </button>
              <button
                type="button"
                onClick={onCloseGuide}
                className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#6D28D9] to-[#EC4899] rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Finish App Guide
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onSelectStep(Math.min(steps.length - 1, currentStepIndex + 1))}
              className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#6D28D9] to-[#EC4899] rounded-xl flex items-center gap-2 cursor-pointer shadow-xs"
            >
              Next Step: {steps[currentStepIndex + 1]?.title.split(':')[0]}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

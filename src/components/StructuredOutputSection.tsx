import React, { useState } from 'react';
import { EventPlan } from '../types/planner';
import { formatPlanAsMarkdown } from '../utils/dependencyEngine';
import { Check, Copy, Download, FileCode, FileText, X } from 'lucide-react';

interface StructuredOutputSectionProps {
  plan: EventPlan;
  onClose?: () => void;
}

export const StructuredOutputSection: React.FC<StructuredOutputSectionProps> = ({
  plan,
  onClose
}) => {
  const [formatMode, setFormatMode] = useState<'JSON' | 'MARKDOWN'>('MARKDOWN');
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(plan, null, 2);
  const markdownString = formatPlanAsMarkdown(plan);
  const activeContent = formatMode === 'JSON' ? jsonString : markdownString;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    const ext = formatMode === 'JSON' ? 'json' : 'md';
    const mime = formatMode === 'JSON' ? 'application/json' : 'text/markdown';
    const blob = new Blob([activeContent], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan.id || 'event-plan'}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Export Event Plan (Markdown & JSON)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Copy or download your live event plan, budget buckets, and timeline checklist.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setFormatMode('MARKDOWN')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  formatMode === 'MARKDOWN'
                    ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Markdown Report
              </button>
              <button
                type="button"
                onClick={() => setFormatMode('JSON')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  formatMode === 'JSON'
                    ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                JSON Schema
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? 'Copied!' : 'Copy'}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download .{formatMode === 'JSON' ? 'json' : 'md'}
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
                title="Close Export Modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-950">
          <pre className="text-slate-100 text-sm font-mono tabular-nums overflow-x-auto leading-relaxed">
            {activeContent}
          </pre>
        </div>
      </div>
    </div>
  );
};

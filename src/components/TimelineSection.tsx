import React, { useState } from 'react';
import { EventPlan, TaskPriority, TaskStatus, TimelineTask } from '../types/planner';
import { cascadeTaskDelay } from '../utils/dependencyEngine';
import {
  Clock,
  GitBranch,
  Plus,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface TimelineSectionProps {
  plan: EventPlan;
  onUpdatePlan: (updater: (prev: EventPlan) => EventPlan) => void;
  onLoadDemoEvent?: () => void;
}

export const TimelineSection: React.FC<TimelineSectionProps> = ({
  plan,
  onUpdatePlan,
  onLoadDemoEvent
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'DELAYED'>('ALL');
  const [showAddForm, setShowAddForm] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Venue & Spatial');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('High');
  const [newTaskDueDate, setNewTaskDueDate] = useState('2027-01-15');
  const [newTaskDependsOn, setNewTaskDependsOn] = useState<string>('T-01');
  const [newTaskRule, setNewTaskRule] = useState('');

  const handleDelayTask = (taskId: string, daysToAdd: number) => {
    onUpdatePlan((prev) => {
      const { updatedTasks, logEntry } = cascadeTaskDelay(prev.timelineTasks, taskId, daysToAdd);
      return {
        ...prev,
        timelineTasks: updatedTasks,
        cascadeLogs: logEntry ? [logEntry, ...prev.cascadeLogs] : prev.cascadeLogs
      };
    });
  };

  const handleResetTaskDelay = (taskId: string) => {
    const target = plan.timelineTasks.find((t) => t.id === taskId);
    if (!target || target.delayedByDays === 0) return;
    handleDelayTask(taskId, -target.delayedByDays);
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    onUpdatePlan((prev) => {
      const target = prev.timelineTasks.find((t) => t.id === taskId);
      if (!target) return prev;

      if (status === 'Delayed' && target.delayedByDays === 0) {
        const { updatedTasks, logEntry } = cascadeTaskDelay(prev.timelineTasks, taskId, 7);
        return {
          ...prev,
          timelineTasks: updatedTasks,
          cascadeLogs: logEntry ? [logEntry, ...prev.cascadeLogs] : prev.cascadeLogs
        };
      }

      if ((status === 'Completed' || status === 'Pending') && target.delayedByDays > 0) {
        const { updatedTasks, logEntry } = cascadeTaskDelay(
          prev.timelineTasks,
          taskId,
          -target.delayedByDays
        );
        return {
          ...prev,
          timelineTasks: updatedTasks.map((t) =>
            t.id === taskId ? { ...t, status } : t
          ),
          cascadeLogs: logEntry ? [logEntry, ...prev.cascadeLogs] : prev.cascadeLogs
        };
      }

      return {
        ...prev,
        timelineTasks: prev.timelineTasks.map((t) =>
          t.id === taskId ? { ...t, status } : t
        )
      };
    });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const nextIndex = plan.timelineTasks.length + 1;
    const nextId = `T-${String(nextIndex).padStart(2, '0')}`;
    const depArray = newTaskDependsOn ? [newTaskDependsOn] : [];

    const newTask: TimelineTask = {
      id: nextId,
      title: newTaskTitle.trim(),
      category: newTaskCategory,
      priority: newTaskPriority,
      originalDueDate: newTaskDueDate,
      dueDate: newTaskDueDate,
      delayedByDays: 0,
      status: 'Pending',
      dependsOn: depArray,
      dependencyRule:
        newTaskRule.trim() ||
        (depArray.length > 0
          ? `Depends on ${depArray.join(', ')}: Upstream step must finish first.`
          : 'Independent milestone.'),
      owner: 'Family Host'
    };

    onUpdatePlan((prev) => ({
      ...prev,
      timelineTasks: [...prev.timelineTasks, newTask]
    }));

    setNewTaskTitle('');
    setNewTaskRule('');
    setShowAddForm(false);
  };

  const filteredTasks = plan.timelineTasks.filter((t) => {
    if (statusFilter === 'CRITICAL') return t.priority === 'Critical';
    if (statusFilter === 'DELAYED') return t.delayedByDays > 0 || t.status === 'Delayed';
    return true;
  });

  if (plan.timelineTasks.length === 0) {
    return (
      <div className="border border-[#E5DDCF] dark:border-[#2A2244] bg-white dark:bg-[#1A142D] p-10 rounded-3xl text-center max-w-2xl mx-auto space-y-4 festive-card-glow">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          No Timeline Created Yet
        </h2>
        <p className="text-base text-slate-600 dark:text-slate-300">
          Complete the 5 setup questions in <strong>Slide 01: AI Co-Pilot &amp; Setup</strong> or load a sample celebration preset to generate your dependency-linked checklist.
        </p>
        {onLoadDemoEvent && (
          <button
            type="button"
            onClick={onLoadDemoEvent}
            className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#FF5E14] to-[#EC4899] rounded-xl inline-flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Load Demo Celebration Timeline
          </button>
        )}
      </div>
    );
  }

  const delayedCount = plan.timelineTasks.filter(
    (t) => t.delayedByDays > 0 || t.status === 'Delayed'
  ).length;
  const latestCascade = plan.cascadeLogs[0] || null;

  return (
    <div className="space-y-6">
      {/* Clear Header + Filter Bar */}
      <div className="bg-white dark:bg-[#1A142D] border border-[#E5DDCF] dark:border-[#2A2244] rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 festive-card-glow">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Step-by-Step Timeline &amp; Delay Manager
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Tasks are linked in logical order. If a vendor or step runs late, click <strong>+7 Days Delay</strong> and all dependent deadlines automatically move forward.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 p-1.5 bg-[#FBF9F5] dark:bg-[#140F23] border border-[#E5DDCF] dark:border-[#2A2244] rounded-xl">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-gradient-to-r from-[#6D28D9] to-[#EC4899] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              All ({plan.timelineTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('CRITICAL')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'CRITICAL'
                  ? 'bg-gradient-to-r from-[#6D28D9] to-[#EC4899] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Must-Do First
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('DELAYED')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'DELAYED'
                  ? 'bg-gradient-to-r from-[#6D28D9] to-[#EC4899] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Delayed ({delayedCount})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#FF5E14] to-[#EC4899] rounded-xl flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {showAddForm ? 'Close Form' : 'Add Step'}
          </button>
        </div>
      </div>

      {/* Live Banner When a Delay Cascade Happens */}
      {latestCascade && (
        <div className="p-6 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-base font-bold text-amber-900 dark:text-amber-300">
              <Clock className="w-5 h-5 shrink-0" />
              <span>
                Automatic Schedule Update: &ldquo;{latestCascade.sourceTaskTitle}&rdquo; shifted by{' '}
                {latestCascade.delayAddedDays > 0
                  ? `+${latestCascade.delayAddedDays} days`
                  : `${latestCascade.delayAddedDays} days`}
              </span>
            </div>
            <span className="text-sm font-mono text-amber-800 dark:text-amber-400">
              {latestCascade.timestamp}
            </span>
          </div>

          {latestCascade.affectedTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {latestCascade.affectedTasks.map((aff) => (
                <div
                  key={aff.taskId}
                  className="p-3.5 bg-white dark:bg-[#140F23] rounded-xl flex items-center justify-between gap-3 text-sm"
                >
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {aff.taskId}: {aff.title}
                  </span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400 shrink-0">
                    {aff.oldDate} → {aff.newDate}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-amber-800 dark:text-amber-300">
              No downstream tasks were impacted by this change.
            </p>
          )}
        </div>
      )}

      {/* Optional Add Task Drawer */}
      {showAddForm && (
        <form
          onSubmit={handleAddTask}
          className="bg-white dark:bg-[#1A142D] border-2 border-violet-500 dark:border-violet-400 rounded-3xl p-6 space-y-4 festive-card-glow"
        >
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Add New Checklist Step
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Step Title
              </label>
              <input
                type="text"
                placeholder="e.g., Order Large-Print Table Menus"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="mt-1.5 w-full px-4 py-2.5 text-base bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Target Due Date
              </label>
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="mt-1.5 w-full px-4 py-2.5 text-base font-mono bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Must Finish After Step:
              </label>
              <select
                value={newTaskDependsOn}
                onChange={(e) => setNewTaskDependsOn(e.target.value)}
                className="mt-1.5 w-full px-4 py-2.5 text-base bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
              >
                <option value="">None (Can start immediately)</option>
                {plan.timelineTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id} — {t.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Category
              </label>
              <input
                type="text"
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value)}
                className="mt-1.5 w-full px-4 py-2.5 text-base bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Priority
              </label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                className="mt-1.5 w-full px-4 py-2.5 text-base bg-[#FBF9F5] dark:bg-[#120E22] border border-[#E5DDCF] dark:border-[#2E254D] text-slate-900 dark:text-white rounded-xl"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Standard">Standard</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 text-base font-bold text-white bg-gradient-to-r from-[#6D28D9] to-[#EC4899] rounded-xl cursor-pointer"
            >
              Add to Timeline
            </button>
          </div>
        </form>
      )}

      {/* Spacious, Easy-to-Scan Step Cards */}
      <div className="space-y-4">
        {filteredTasks.map((task) => {
          const downstreamIds = plan.timelineTasks
            .filter((t) => t.dependsOn.includes(task.id))
            .map((t) => t.id);

          return (
            <div
              key={task.id}
              className={`bg-white dark:bg-[#1A142D] border-2 rounded-3xl p-6 transition-colors festive-card-glow ${
                task.delayedByDays > 0
                  ? 'border-amber-400 dark:border-amber-500/80'
                  : 'border-[#E5DDCF] dark:border-[#2A2244]'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Left: Step ID, Title, and Dependency Explanation */}
                <div className="space-y-2 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-bold text-violet-700 dark:text-pink-400 text-base">
                      Step {task.id}
                    </span>
                    <span>·</span>
                    <span>{task.category}</span>
                    <span>·</span>
                    <span
                      className={
                        task.priority === 'Critical'
                          ? 'font-bold text-slate-900 dark:text-white'
                          : ''
                      }
                    >
                      {task.priority} Priority
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {task.title}
                  </h3>

                  <div className="flex items-start gap-2 text-base text-slate-600 dark:text-slate-300">
                    <GitBranch className="w-4 h-4 text-violet-500 shrink-0 mt-1" />
                    <span>
                      {task.dependencyRule}
                      {downstreamIds.length > 0 && (
                        <strong className="text-slate-900 dark:text-slate-100 ml-1">
                          (Delaying this automatically shifts: {downstreamIds.join(', ')})
                        </strong>
                      )}
                    </span>
                  </div>

                  {task.audienceTailoring && (
                    <div className="text-sm text-slate-500 dark:text-slate-400 pt-1">
                      <strong>Family Note:</strong> {task.audienceTailoring}
                    </div>
                  )}
                </div>

                {/* Right: Due Date, Status & Delay Controls */}
                <div className="flex flex-wrap lg:flex-col items-start lg:items-end justify-between gap-4 shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-[#E5DDCF] dark:border-[#2A2244]">
                  <div className="text-left lg:text-right">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Due Date
                    </div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                      {task.dueDate}
                    </div>
                    {task.delayedByDays > 0 && (
                      <div className="text-sm font-semibold text-amber-700 dark:text-amber-400 mt-0.5">
                        Delayed +{task.delayedByDays} days (was {task.originalDueDate})
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                      className={`px-3.5 py-2 text-sm font-bold rounded-xl border cursor-pointer ${
                        task.status === 'Completed'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                          : task.status === 'Delayed'
                          ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300'
                          : 'bg-[#FBF9F5] dark:bg-[#140F23] border-[#E5DDCF] dark:border-[#2E254D] text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <option value="Completed">Completed</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Pending">Pending</option>
                      <option value="Delayed">Delayed</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleDelayTask(task.id, 7)}
                      className="px-4 py-2 text-sm font-bold bg-violet-50 dark:bg-[#221A3A] hover:bg-amber-100 dark:hover:bg-amber-950 hover:text-amber-900 dark:hover:text-amber-300 text-violet-900 dark:text-violet-200 rounded-xl transition-colors cursor-pointer"
                    >
                      +7 Days Delay
                    </button>

                    {task.delayedByDays > 0 && (
                      <button
                        type="button"
                        onClick={() => handleResetTaskDelay(task.id)}
                        title="Reset to original date"
                        className="px-3 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#221A3A] rounded-xl flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

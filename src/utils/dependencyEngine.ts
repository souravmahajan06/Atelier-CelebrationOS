import { CascadeEventLog, EventPlan, TimelineTask } from '../types/planner';
import { formatMoney } from './currency';

function addDaysToIsoDate(isoDate: string, daysToAdd: number): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return isoDate;
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
}

/**
 * Given a list of timeline tasks, delays `targetTaskId` by `additionalDelayDays`
 * (can be positive or negative/reset) and cascades the delay to all downstream
 * dependent tasks in topological order.
 */
export function cascadeTaskDelay(
  tasks: TimelineTask[],
  targetTaskId: string,
  additionalDelayDays: number
): { updatedTasks: TimelineTask[]; logEntry: CascadeEventLog | null } {
  const sourceTask = tasks.find((t) => t.id === targetTaskId);
  if (!sourceTask || additionalDelayDays === 0) {
    return { updatedTasks: tasks, logEntry: null };
  }

  const affectedIds = new Set<string>();
  const queue: string[] = [targetTaskId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    for (const task of tasks) {
      if (task.dependsOn.includes(currentId) && !affectedIds.has(task.id)) {
        if (task.status !== 'Completed') {
          affectedIds.add(task.id);
          queue.push(task.id);
        }
      }
    }
  }

  const affectedReport: CascadeEventLog['affectedTasks'] = [];

  const updatedTasks = tasks.map((task) => {
    if (task.id === targetTaskId) {
      const nextDelay = Math.max(0, task.delayedByDays + additionalDelayDays);
      const actualDelta = nextDelay - task.delayedByDays;
      const nextDueDate = addDaysToIsoDate(task.originalDueDate, nextDelay);
      return {
        ...task,
        delayedByDays: nextDelay,
        dueDate: nextDueDate,
        status:
          nextDelay > 0 && task.status !== 'Completed'
            ? ('Delayed' as const)
            : task.status === 'Delayed' && nextDelay === 0
            ? ('Pending' as const)
            : task.status,
        _actualDelta: actualDelta
      };
    }
    return task;
  });

  const updatedSource = updatedTasks.find((t) => t.id === targetTaskId)!;
  const sourceDelta = updatedSource.delayedByDays - sourceTask.delayedByDays;

  if (sourceDelta === 0) {
    return { updatedTasks: tasks, logEntry: null };
  }

  const finalTasks = updatedTasks.map((task) => {
    if (affectedIds.has(task.id)) {
      const nextDelay = Math.max(0, task.delayedByDays + sourceDelta);
      const nextDueDate = addDaysToIsoDate(task.originalDueDate, nextDelay);
      affectedReport.push({
        taskId: task.id,
        title: task.title,
        oldDate: task.dueDate,
        newDate: nextDueDate,
        reason: task.dependencyRule
      });
      return {
        ...task,
        delayedByDays: nextDelay,
        dueDate: nextDueDate,
        status:
          nextDelay > 0 && task.status === 'Pending'
            ? ('Delayed' as const)
            : nextDelay === 0 && task.status === 'Delayed'
            ? ('Pending' as const)
            : task.status
      };
    }
    return task;
  });

  const logEntry: CascadeEventLog = {
    id: `cascade-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    sourceTaskId: sourceTask.id,
    sourceTaskTitle: sourceTask.title,
    delayAddedDays: sourceDelta,
    affectedTasks: affectedReport
  };

  return { updatedTasks: finalTasks, logEntry };
}

export function formatPlanAsMarkdown(plan: EventPlan): string {
  const curr = plan.currency || 'USD';
  const totalAllocated = plan.budgetBuckets.reduce((sum, b) => sum + b.allocated, 0);
  const totalCommitted = plan.budgetBuckets.reduce((sum, b) => sum + b.committed, 0);

  const lines: string[] = [
    `# ${plan.name} (${curr})`,
    ``,
    `## 1. Onboarding & Event Parameters`,
    `- **Occasion**: ${plan.onboarding.occasion || 'Unset (Pending Onboarding)'}`,
    `- **Currency**: ${curr}`,
    `- **Target Budget**: ${plan.onboarding.budget ? formatMoney(plan.onboarding.budget, curr) : 'Unset'}`,
    `- **Expected Guests**: ${plan.onboarding.guestCount ?? 'Unset'}`,
    `- **Event Date**: ${plan.onboarding.eventDate || 'Unset'}`,
    `- **Experience Direction**: ${plan.onboarding.experienceStyle || 'Unset'}`,
    `- **Absolute Must-Haves**: ${plan.onboarding.mustHaves.length > 0 ? plan.onboarding.mustHaves.join('; ') : 'Unset'}`,
    `- **Audience & Accessibility Profile**: ${plan.onboarding.audienceNotes || 'Unset'}`,
    ``,
    `## 2. Dynamic Budget Allocation (${formatMoney(totalAllocated, curr)} Allocated / ${formatMoney(totalCommitted, curr)} Committed)`,
    `| Bucket | Priority | Allocated | Committed | Strategic Rationale |`,
    `| :--- | :--- | ---: | ---: | :--- |`,
    ...plan.budgetBuckets.map(
      (b) =>
        `| ${b.category} | ${b.priority} | ${formatMoney(b.allocated, curr)} | ${formatMoney(b.committed, curr)} | ${b.rationale} |`
    ),
    ``,
    `## 3. Adaptive Checklist & Dependency Chain`,
    `| ID | Task | Priority | Status | Due Date | Shift | Depends On | Dependency Logic |`,
    `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |`,
    ...plan.timelineTasks.map(
      (t) =>
        `| ${t.id} | ${t.title} | ${t.priority} | ${t.status} | ${t.dueDate} | ${t.delayedByDays > 0 ? `+${t.delayedByDays}d` : '0d'} | ${t.dependsOn.length ? t.dependsOn.join(', ') : 'Root'} | ${t.dependencyRule} |`
    ),
    ``,
    `## 4. Audience Personalization & Accessibility Matrix`,
    ...plan.personalizationRules.map(
      (p) =>
        `- **[${p.category}] ${p.segment}** (${p.applied ? 'Applied' : 'Recommended'} · Est. ${formatMoney(p.estimatedCostImpact, curr)}): ${p.recommendation}`
    )
  ];

  return lines.join('\n');
}

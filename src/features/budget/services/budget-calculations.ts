export type BudgetState = { remainingCents: number | null; usagePercent: number; warning: boolean; overBudget: boolean };

export function calculateBudgetState(budgetCents: number | null, totalCents: number): BudgetState {
  if (budgetCents === null) return { remainingCents: null, usagePercent: 0, warning: false, overBudget: false };
  const remainingCents = budgetCents - totalCents;
  const usagePercent = budgetCents === 0 ? (totalCents > 0 ? 100 : 0) : Math.min((totalCents / budgetCents) * 100, 100);
  return { remainingCents, usagePercent, warning: budgetCents === 0 ? totalCents > 0 : usagePercent >= 80, overBudget: remainingCents < 0 || (budgetCents === 0 && totalCents > 0) };
}

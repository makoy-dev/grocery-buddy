import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { formatPhpCents } from '@/utils/format-money';
import { calculateBudgetState } from '@/features/budget/services/budget-calculations';

type Props = { budgetCents: number | null; totalCents: number; isBusy?: boolean; error?: string | null; onSave: (amount: string) => Promise<void>; onRemove: () => Promise<void> };

export function BudgetPanel({ budgetCents, totalCents, isBusy = false, error, onSave, onRemove }: Props) {
  const [amount, setAmount] = useState(budgetCents === null ? '' : (budgetCents / 100).toFixed(2));
  const budget = calculateBudgetState(budgetCents, totalCents);
  const remaining = budget.remainingCents;
  const warning = budget.warning;
  const over = budget.overBudget;
  return <View className="mt-5 rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"><View className="flex-row items-center justify-between"><Text className="text-lg font-semibold text-ink dark:text-ink-dark">Budget</Text>{budgetCents !== null && <Pressable onPress={() => void onRemove()}><Text className="font-semibold text-red-700 dark:text-red-300">Remove</Text></Pressable>}</View>{budgetCents === null ? <Text className="mt-2 text-sm text-muted dark:text-muted-dark">No budget set for this session.</Text> : <><View className="mt-3 flex-row justify-between"><Text className="text-sm text-muted dark:text-muted-dark">Estimated {formatPhpCents(totalCents)}</Text><Text className="text-sm text-muted dark:text-muted-dark">Budget {formatPhpCents(budgetCents)}</Text></View><View className="mt-2 h-3 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700"><View className={`h-full ${over ? 'bg-red-600' : warning ? 'bg-amber-500' : 'bg-emerald-600'}`} style={{ width: `${budget.usagePercent}%` }} /></View><Text className={`mt-2 text-sm ${over ? 'font-semibold text-red-700 dark:text-red-300' : warning ? 'font-semibold text-amber-700 dark:text-amber-300' : 'text-muted dark:text-muted-dark'}`}>{over ? `Over budget by ${formatPhpCents(Math.abs(remaining ?? 0))}` : warning ? 'You have used 80% or more of this budget.' : `Remaining ${formatPhpCents(remaining ?? 0)}`}</Text></>}{error && <Text className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</Text>}<View className="mt-4 flex-row gap-2"><TextInput accessibilityLabel="Shopping budget" className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-base text-ink dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark" keyboardType="decimal-pad" onChangeText={setAmount} placeholder="Budget in PHP" placeholderTextColor="#78716c" value={amount} /><Pressable className="rounded-xl bg-primary px-4 py-3" disabled={isBusy} onPress={() => void onSave(amount)}><Text className="font-semibold text-white">{budgetCents === null ? 'Set' : 'Update'}</Text></Pressable></View></View>;
}

import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ReportsSnapshot } from '@/domain/entities/report';
import { useReportService } from '@/features/reports/hooks/use-report-service';
import { formatPhpCents } from '@/utils/format-money';

type Preset = 'week' | 'month';
function rangeFor(preset: Preset) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (preset === 'week' ? 6 : 29));
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

export default function ReportsScreen() {
  const service = useReportService();
  const [preset, setPreset] = useState<Preset>('week');
  const [report, setReport] = useState<ReportsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (selected: Preset = preset) => {
    try { setReport(await service.getSnapshot(rangeFor(selected))); setError(null); }
    catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'Unable to load reports.'); }
  }, [preset, service]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const changePreset = (value: Preset) => { setPreset(value); void load(value); };
  const maxPeriod = Math.max(...(report?.periods.map((item) => item.estimatedTotalCents) ?? [0]), 1);
  const maxStore = Math.max(...(report?.byStore.map((item) => item.estimatedTotalCents) ?? [0]), 1);

  return <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark"><ScrollView className="flex-1 px-5 py-6" contentContainerStyle={{ paddingBottom: 40 }}>
    <Link href="/(tabs)/more" className="mb-4 self-start"><Text className="font-semibold text-primary">← Back to More</Text></Link>
    <Text className="text-3xl font-bold text-ink dark:text-ink-dark">Reports & insights</Text>
    <Text className="mt-2 text-sm leading-5 text-muted dark:text-muted-dark">Local summaries from completed shopping sessions. Actual totals are shown only when recorded at checkout.</Text>
    <View className="mt-5 flex-row rounded-xl border border-border bg-surface p-1 dark:border-border-dark dark:bg-surface-dark" accessibilityRole="tablist">
      {(['week', 'month'] as const).map((value) => <Pressable key={value} onPress={() => changePreset(value)} accessibilityRole="tab" accessibilityState={{ selected: preset === value }} className={`flex-1 rounded-lg px-3 py-2 ${preset === value ? 'bg-primary' : ''}`}><Text className={`text-center font-semibold ${preset === value ? 'text-white' : 'text-ink dark:text-ink-dark'}`}>{value === 'week' ? 'Last 7 days' : 'Last 30 days'}</Text></Pressable>)}
    </View>
    {error && <Text className="mt-4 text-sm text-red-700 dark:text-red-300">{error}</Text>}
    {!report || report.summary.completedSessions === 0 ? <View className="mt-5 rounded-2xl border border-border bg-surface p-5 dark:border-border-dark dark:bg-surface-dark"><Text className="font-semibold text-ink dark:text-ink-dark">No completed trips in this period</Text><Text className="mt-2 text-sm text-muted dark:text-muted-dark">Complete a shopping session to start building your local insights.</Text></View> : <>
      <View className="mt-5 flex-row gap-3"><Metric label="Estimated" value={formatPhpCents(report.summary.estimatedTotalCents)} /><Metric label="Recorded actual" value={report.summary.sessionsWithActualTotal ? formatPhpCents(report.summary.actualTotalCents) : 'Unknown'} /></View>
      <Text className="mt-6 text-xs font-bold uppercase tracking-widest text-muted dark:text-muted-dark">Spending trend</Text>
      <View className="mt-3 rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">{report.periods.length === 0 ? <Text className="text-sm text-muted dark:text-muted-dark">Not enough history for a chart.</Text> : report.periods.map((item) => <View key={item.period} className="mb-3"><View className="flex-row justify-between"><Text className="text-sm text-ink dark:text-ink-dark">{item.period}</Text><Text className="text-sm font-semibold text-ink dark:text-ink-dark">{formatPhpCents(item.estimatedTotalCents)}</Text></View><View className="mt-1 h-3 overflow-hidden rounded-full bg-border dark:bg-border-dark" accessibilityLabel={`${item.period} estimated spending`}><View className="h-full rounded-full bg-primary" style={{ width: `${Math.round((item.estimatedTotalCents / maxPeriod) * 100)}%` }} /></View></View>)}</View>
      <Section title="By store">{report.byStore.map((item) => <View key={item.storeId} className="mb-4"><View className="flex-row justify-between"><Text className="font-semibold text-ink dark:text-ink-dark">{item.storeName}</Text><Text className="font-semibold text-ink dark:text-ink-dark">{formatPhpCents(item.estimatedTotalCents)}</Text></View><Text className="mt-1 text-xs text-muted dark:text-muted-dark">{item.sessionCount} trip(s) · Actual {item.actualTotalCents ? formatPhpCents(item.actualTotalCents) : 'Unknown'}</Text><View className="mt-2 h-2 overflow-hidden rounded-full bg-border dark:bg-border-dark"><View className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round((item.estimatedTotalCents / maxStore) * 100)}%` }} /></View></View>)}</Section>
      <Section title="Most frequently purchased">{report.frequentProducts.length ? report.frequentProducts.map((item) => <Row key={item.productId} title={item.productName} detail={`${item.quantity} item(s) across ${item.sessionCount} trip(s)`} />) : <Empty text="No product purchase history yet." />}</Section>
      <Section title="Most expensive products">{report.expensiveProducts.length ? report.expensiveProducts.map((item) => <Row key={item.productId} title={item.productName} detail={`Highest unit price ${formatPhpCents(item.highestUnitPriceCents)} · Total ${formatPhpCents(item.totalSpentCents)}`} />) : <Empty text="No product purchase history yet." />}</Section>
      <Section title="Price changes">{report.priceChanges.length ? report.priceChanges.map((item) => <Row key={item.productId} title={item.productName} detail={`${formatPhpCents(item.firstPriceCents)} → ${formatPhpCents(item.latestPriceCents)} (${item.changeCents >= 0 ? '+' : ''}${formatPhpCents(item.changeCents)})`} />) : <Empty text="Not enough saved price history to show changes." />}</Section>
      <Section title="Budget usage"><Text className="text-sm text-muted dark:text-muted-dark">{report.budgetUsage.sessionsWithBudget === 0 ? 'No budgets recorded in this period.' : `${report.budgetUsage.sessionsWithBudget} budgeted trip(s) · ${report.budgetUsage.overBudgetCount} over budget`}</Text>{report.budgetUsage.sessionsWithBudget > 0 && <Text className="mt-2 font-semibold text-ink dark:text-ink-dark">{formatPhpCents(report.budgetUsage.estimatedTotalCents)} estimated of {formatPhpCents(report.budgetUsage.budgetCents)}</Text>}</Section>
    </>}
  </ScrollView></SafeAreaView>;
}

function Metric({ label, value }: { label: string; value: string }) { return <View className="flex-1 rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"><Text className="text-xs text-muted dark:text-muted-dark">{label}</Text><Text className="mt-2 text-lg font-bold text-ink dark:text-ink-dark">{value}</Text></View>; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View className="mt-6 rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"><Text className="mb-4 text-xs font-bold uppercase tracking-widest text-muted dark:text-muted-dark">{title}</Text>{children}</View>; }
function Row({ title, detail }: { title: string; detail: string }) { return <View className="mb-3 border-b border-border pb-3 last:mb-0 last:border-b-0 last:pb-0 dark:border-border-dark"><Text className="font-semibold text-ink dark:text-ink-dark">{title}</Text><Text className="mt-1 text-sm text-muted dark:text-muted-dark">{detail}</Text></View>; }
function Empty({ text }: { text: string }) { return <Text className="text-sm text-muted dark:text-muted-dark">{text}</Text>; }

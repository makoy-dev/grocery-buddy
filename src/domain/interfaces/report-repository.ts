import type { ReportDateRange, ReportsSnapshot } from '@/domain/entities/report';

export interface ReportRepository {
  getSnapshot(range: ReportDateRange): Promise<ReportsSnapshot>;
}

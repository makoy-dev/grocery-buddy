import type { ReportDateRange, ReportsSnapshot } from '@/domain/entities/report';
import type { ReportRepository } from '@/domain/interfaces/report-repository';

export class ReportService {
  constructor(private readonly repository: ReportRepository) {}
  getSnapshot(range: ReportDateRange): Promise<ReportsSnapshot> { return this.repository.getSnapshot(range); }
}

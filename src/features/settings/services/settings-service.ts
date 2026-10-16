import type { BackupData, StorageInfo } from '@/domain/entities/backup';
import type { BackupRepository } from '@/domain/interfaces/backup-repository';
import { assertBackupFormat } from '@/database/repositories/backup-repository';

export class SettingsService {
  constructor(private readonly backups: BackupRepository) {}
  exportBackup(): Promise<BackupData> { return this.backups.exportData(); }
  async importBackup(value: unknown): Promise<void> { assertBackupFormat(value); await this.backups.importData(value); }
  storageInfo(): Promise<StorageInfo> { return this.backups.getStorageInfo(); }
  clearHistory(): Promise<void> { return this.backups.clearShoppingHistory(); }
  resetData(): Promise<void> { return this.backups.resetAllData(); }
  historyCsv(): Promise<string> { return this.backups.exportHistoryCsv(); }
}

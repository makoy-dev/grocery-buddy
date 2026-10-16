import type { BackupData, StorageInfo } from '@/domain/entities/backup';

export interface BackupRepository {
  exportData(exportedAt?: string): Promise<BackupData>;
  importData(backup: BackupData): Promise<void>;
  getStorageInfo(): Promise<StorageInfo>;
  clearShoppingHistory(): Promise<void>;
  resetAllData(): Promise<void>;
  exportHistoryCsv(): Promise<string>;
}

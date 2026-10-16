export const BACKUP_FORMAT_VERSION = 1 as const;

export type BackupStore = { id: number; name: string; normalized_name: string; is_favorite: 0 | 1; created_at: string; updated_at: string };
export type BackupProduct = { id: number; barcode: string; name: string; brand: string | null; category: string | null; unit: string | null; package_size: string | null; archived_at: string | null; created_at: string; updated_at: string };
export type BackupStoreProduct = { id: number; store_id: number; product_id: number; current_price_cents: number; updated_at: string };
export type BackupPriceHistory = { id: number; store_id: number; product_id: number; price_cents: number; recorded_at: string };
export type BackupSession = { id: number; store_id: number; status: 'active' | 'completed' | 'cancelled'; budget_cents: number; budget_set?: 0 | 1; estimated_total_cents: number; actual_total_cents: number | null; started_at: string; completed_at: string | null };
export type BackupShoppingItem = { id: number; session_id: number; product_id: number; quantity: number; unit_price_cents: number; product_name_snapshot: string | null };
export type BackupList = { id: number; name: string; created_at: string; updated_at: string };
export type BackupListItem = { id: number; list_id: number; product_id: number; quantity: number; picked_up: 0 | 1 };
export type BackupSetting = { key: string; value: string };

export type BackupData = {
  format: 'grocery-godz-backup';
  version: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  data: {
    stores: BackupStore[];
    products: BackupProduct[];
    store_products: BackupStoreProduct[];
    price_history: BackupPriceHistory[];
    shopping_sessions: BackupSession[];
    shopping_items: BackupShoppingItem[];
    shopping_lists: BackupList[];
    shopping_list_items: BackupListItem[];
    app_settings: BackupSetting[];
  };
};

export type StorageInfo = { databaseName: string; pageCount: number; pageSize: number; freePages: number; estimatedBytes: number; rowCounts: Record<string, number> };

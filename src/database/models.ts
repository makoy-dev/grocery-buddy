export type StoreRow = {
  id: number;
  name: string;
  normalized_name: string;
  is_favorite: 0 | 1;
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
  id: number;
  barcode: string;
  name: string;
  brand: string | null;
  category: string | null;
  unit: string | null;
  package_size: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StoreProductRow = {
  id: number;
  store_id: number;
  product_id: number;
  current_price_cents: number;
  updated_at: string;
};

export type PriceHistoryRow = {
  id: number;
  store_id: number;
  product_id: number;
  price_cents: number;
  recorded_at: string;
};

export type ShoppingSessionStatus = 'active' | 'completed' | 'cancelled';

export type ShoppingSessionRow = {
  id: number;
  store_id: number;
  status: ShoppingSessionStatus;
  budget_cents: number;
  budget_set?: 0 | 1;
  estimated_total_cents: number;
  actual_total_cents: number | null;
  started_at: string;
  completed_at: string | null;
  store_name?: string;
  item_count?: number;
};

export type ShoppingItemRow = {
  id: number;
  session_id: number;
  product_id: number;
  quantity: number;
  unit_price_cents: number;
  product_name_snapshot: string | null;
};

export type ShoppingListRow = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
};

export type ShoppingListItemRow = {
  id: number;
  list_id: number;
  product_id: number;
  quantity: number;
  picked_up: 0 | 1;
};

export type AppSettingRow = {
  key: string;
  value: string;
};

export type StoreDeletionDependencyRow = {
  product_count: number;
  history_count: number;
  session_count: number;
};

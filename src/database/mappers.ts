import type { ProductRow, StoreProductRow, StoreRow } from '@/database/models';
import type { Product, ProductSummary } from '@/domain/entities/product';
import type { StoreProductPrice } from '@/domain/entities/store-product-price';
import type { Store, StoreSummary } from '@/domain/entities/store';

export function mapStoreRow(row: StoreRow): Store {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    isFavorite: row.is_favorite === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapStoreSummaryRow(row: StoreRow & { product_count: number }): StoreSummary {
  return {
    ...mapStoreRow(row),
    productCount: row.product_count,
  };
}

export function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    barcode: row.barcode,
    name: row.name,
    brand: row.brand,
    category: row.category,
    unit: row.unit,
    packageSize: row.package_size,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProductSummaryRow(row: ProductRow & { current_price_cents: number | null }): ProductSummary {
  return {
    ...mapProductRow(row),
    currentPriceCents: row.current_price_cents,
    hasPriceForStore: row.current_price_cents !== null,
  };
}

export function mapStoreProductRow(row: StoreProductRow): StoreProductPrice {
  return {
    id: row.id,
    storeId: row.store_id,
    productId: row.product_id,
    currentPriceCents: row.current_price_cents,
    updatedAt: row.updated_at,
  };
}

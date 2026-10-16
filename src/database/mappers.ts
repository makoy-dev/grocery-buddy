import type { ProductRow, StoreProductRow, StoreRow } from '@/database/models';
import type { Product } from '@/domain/entities/product';
import type { StoreProductPrice } from '@/domain/entities/store-product-price';
import type { Store } from '@/domain/entities/store';

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

export function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    barcode: row.barcode,
    name: row.name,
    brand: row.brand,
    category: row.category,
    unit: row.unit,
    packageSize: row.package_size,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

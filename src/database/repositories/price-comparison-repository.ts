import type { DatabaseConnection } from '@/database/connection';
import { mapProductRow } from '@/database/mappers';
import type { ProductRow } from '@/database/models';
import type { ListStoreComparison, ProductPriceComparison, StorePriceComparison } from '@/domain/entities/price-comparison';
import type { PriceComparisonRepository } from '@/domain/interfaces/price-comparison-repository';

type PriceRow = ProductRow & { store_id: number; store_name: string; price_cents: number | null; price_updated_at: string | null; is_outdated: 0 | 1 };
type ListPriceRow = { store_id: number; store_name: string; product_id: number; quantity: number; price_cents: number | null };

export class SQLitePriceComparisonRepository implements PriceComparisonRepository {
  constructor(private readonly database: DatabaseConnection, private readonly clock: () => string = () => new Date().toISOString()) {}

  async searchProducts(searchInput: string): Promise<ProductPriceComparison[]> {
    const search = searchInput.trim().toLowerCase();
    const rows = await this.database.all<PriceRow>(
      `SELECT products.*, stores.id AS store_id, stores.name AS store_name,
              store_products.current_price_cents AS price_cents,
              store_products.updated_at AS price_updated_at,
              CASE WHEN store_products.updated_at IS NOT NULL AND julianday(?) - julianday(store_products.updated_at) > 30 THEN 1 ELSE 0 END AS is_outdated
       FROM products CROSS JOIN stores
       LEFT JOIN store_products ON store_products.product_id = products.id AND store_products.store_id = stores.id
       WHERE products.archived_at IS NULL AND (lower(products.name) LIKE '%' || ? || '%' OR lower(products.barcode) LIKE '%' || ? || '%')
       ORDER BY products.name COLLATE NOCASE, stores.name COLLATE NOCASE`,
      [this.clock(), search, search],
    );
    const grouped = new Map<number, ProductPriceComparison>();
    for (const row of rows) {
      const current = grouped.get(row.id) ?? { product: mapProductRow(row), prices: [], lowestPriceCents: null };
      const price: StorePriceComparison = { storeId: row.store_id, storeName: row.store_name, priceCents: row.price_cents, updatedAt: row.price_updated_at, isOutdated: row.is_outdated === 1 };
      current.prices.push(price);
      if (price.priceCents !== null && (current.lowestPriceCents === null || price.priceCents < current.lowestPriceCents)) current.lowestPriceCents = price.priceCents;
      grouped.set(row.id, current);
    }
    return [...grouped.values()];
  }

  async compareShoppingList(listId: number): Promise<ListStoreComparison[]> {
    const rows = await this.database.all<ListPriceRow>(
      `SELECT stores.id AS store_id, stores.name AS store_name, sli.product_id, sli.quantity,
              store_products.current_price_cents AS price_cents
       FROM stores CROSS JOIN shopping_list_items sli
       LEFT JOIN store_products ON store_products.store_id = stores.id AND store_products.product_id = sli.product_id
       WHERE sli.list_id = ? ORDER BY stores.name COLLATE NOCASE`, [listId],
    );
    const grouped = new Map<number, ListStoreComparison>();
    for (const row of rows) {
      const current = grouped.get(row.store_id) ?? { storeId: row.store_id, storeName: row.store_name, totalCents: 0, missingProductIds: [], complete: true };
      if (row.price_cents === null) { current.missingProductIds.push(row.product_id); current.complete = false; current.totalCents = null; }
      else if (current.complete) current.totalCents = (current.totalCents ?? 0) + row.price_cents * row.quantity;
      grouped.set(row.store_id, current);
    }
    return [...grouped.values()];
  }
}

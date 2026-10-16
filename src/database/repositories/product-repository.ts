import type { DatabaseConnection } from '@/database/connection';
import { mapProductRow, mapProductSummaryRow } from '@/database/mappers';
import type { ProductRow } from '@/database/models';
import type { CreateProductInput, Product } from '@/domain/entities/product';
import type { ProductListOptions, ProductRepository } from '@/domain/interfaces/product-repository';

type Clock = () => string;

export class SQLiteProductRepository implements ProductRepository {
  constructor(
    private readonly database: DatabaseConnection,
    private readonly clock: Clock = () => new Date().toISOString(),
  ) {}

  async create(input: CreateProductInput): Promise<Product> {
    const timestamp = this.clock();
    const result = await this.database.run(
      `INSERT INTO products
        (barcode, name, brand, category, unit, package_size, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.barcode,
        input.name.trim(),
        input.brand?.trim() || null,
        input.category?.trim() || null,
        input.unit?.trim() || null,
        input.packageSize?.trim() || null,
        timestamp,
        timestamp,
      ],
    );

    const product = await this.findById(result.lastInsertRowId);
    if (!product) {
      throw new Error('Product insert succeeded but the stored row could not be read.');
    }

    return product;
  }

  async findById(id: number): Promise<Product | null> {
    const row = await this.database.first<ProductRow>('SELECT * FROM products WHERE id = ?', [id]);
    return row ? mapProductRow(row) : null;
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    const row = await this.database.first<ProductRow>('SELECT * FROM products WHERE barcode = ?', [
      barcode,
    ]);
    return row ? mapProductRow(row) : null;
  }

  async list(options: ProductListOptions = {}) {
    const search = options.search?.trim().toLowerCase() ?? '';
    const storeId = options.storeId ?? null;
    const rows = await this.database.all<ProductRow & { current_price_cents: number | null }>(
      `SELECT products.*, store_products.current_price_cents
       FROM products
       LEFT JOIN store_products
         ON store_products.product_id = products.id AND store_products.store_id = ?
       WHERE (? = 1 OR products.archived_at IS NULL)
         AND (? = '' OR lower(products.barcode) LIKE '%' || ? || '%' OR
              lower(products.name) LIKE '%' || ? || '%' OR lower(COALESCE(products.brand, '')) LIKE '%' || ? || '%')
         AND (? = 0 OR ? IS NULL OR store_products.id IS NULL)
       ORDER BY products.archived_at IS NOT NULL, products.name COLLATE NOCASE` ,
      [storeId, options.includeArchived ? 1 : 0, search, search, search, search, options.missingPriceOnly ? 1 : 0, storeId],
    );
    return rows.map(mapProductSummaryRow);
  }

  async update(id: number, input: CreateProductInput): Promise<Product> {
    const timestamp = this.clock();
    await this.database.run(
      `UPDATE products SET barcode = ?, name = ?, brand = ?, category = ?, unit = ?, package_size = ?, updated_at = ? WHERE id = ?`,
      [input.barcode, input.name.trim(), input.brand?.trim() || null, input.category?.trim() || null, input.unit?.trim() || null, input.packageSize?.trim() || null, timestamp, id],
    );
    const product = await this.findById(id);
    if (!product) throw new Error('Product update succeeded but the stored row could not be read.');
    return product;
  }

  async archive(id: number): Promise<Product> {
    const timestamp = this.clock();
    await this.database.run('UPDATE products SET archived_at = ?, updated_at = ? WHERE id = ?', [timestamp, timestamp, id]);
    const product = await this.findById(id);
    if (!product) throw new Error('Product archive succeeded but the stored row could not be read.');
    return product;
  }

  async unarchive(id: number): Promise<Product> {
    await this.database.run('UPDATE products SET archived_at = NULL, updated_at = ? WHERE id = ?', [this.clock(), id]);
    const product = await this.findById(id);
    if (!product) throw new Error('Product restore succeeded but the stored row could not be read.');
    return product;
  }
}

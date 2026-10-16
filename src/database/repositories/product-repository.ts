import type { DatabaseConnection } from '@/database/connection';
import { mapProductRow } from '@/database/mappers';
import type { ProductRow } from '@/database/models';
import type { CreateProductInput, Product } from '@/domain/entities/product';
import type { ProductRepository } from '@/domain/interfaces/product-repository';

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
}

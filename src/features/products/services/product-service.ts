import { DuplicateProductBarcodeError } from '@/domain/errors/product-errors';
import type { CreateProductInput, Product, ProductSummary, UpdateProductInput } from '@/domain/entities/product';
import type { ProductListOptions, ProductRepository } from '@/domain/interfaces/product-repository';

export class ProductService {
  constructor(private readonly products: ProductRepository) {}

  list(options?: ProductListOptions): Promise<ProductSummary[]> { return this.products.list(options); }
  getById(id: number): Promise<Product | null> { return this.products.findById(id); }

  async create(input: CreateProductInput): Promise<Product> {
    await this.assertBarcodeAvailable(input.barcode);
    return this.products.create(input);
  }

  async update(id: number, input: UpdateProductInput): Promise<Product> {
    await this.assertBarcodeAvailable(input.barcode, id);
    return this.products.update(id, input);
  }

  archive(id: number): Promise<Product> { return this.products.archive(id); }
  unarchive(id: number): Promise<Product> { return this.products.unarchive(id); }

  private async assertBarcodeAvailable(barcode: string, excludingId?: number) {
    const existing = await this.products.findByBarcode(barcode.trim());
    if (existing && existing.id !== excludingId) throw new DuplicateProductBarcodeError();
  }
}

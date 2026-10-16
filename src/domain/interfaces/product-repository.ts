import type { CreateProductInput, Product, ProductSummary, UpdateProductInput } from '@/domain/entities/product';

export type ProductListOptions = {
  search?: string;
  storeId?: number;
  missingPriceOnly?: boolean;
  includeArchived?: boolean;
};

export interface ProductRepository {
  create(input: CreateProductInput): Promise<Product>;
  findById(id: number): Promise<Product | null>;
  findByBarcode(barcode: string): Promise<Product | null>;
  list(options?: ProductListOptions): Promise<ProductSummary[]>;
  update(id: number, input: UpdateProductInput): Promise<Product>;
  archive(id: number): Promise<Product>;
  unarchive(id: number): Promise<Product>;
}

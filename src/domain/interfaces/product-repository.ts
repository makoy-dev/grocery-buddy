import type { CreateProductInput, Product } from '@/domain/entities/product';

export interface ProductRepository {
  create(input: CreateProductInput): Promise<Product>;
  findById(id: number): Promise<Product | null>;
  findByBarcode(barcode: string): Promise<Product | null>;
}

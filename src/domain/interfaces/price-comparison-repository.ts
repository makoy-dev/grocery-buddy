import type { ListStoreComparison, ProductPriceComparison } from '@/domain/entities/price-comparison';

export interface PriceComparisonRepository {
  searchProducts(search: string): Promise<ProductPriceComparison[]>;
  compareShoppingList(listId: number): Promise<ListStoreComparison[]>;
}

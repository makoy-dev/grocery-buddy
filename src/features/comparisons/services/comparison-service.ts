import type { ListStoreComparison, ProductPriceComparison } from '@/domain/entities/price-comparison';
import type { PriceComparisonRepository } from '@/domain/interfaces/price-comparison-repository';

export class ComparisonService {
  constructor(private readonly comparisons: PriceComparisonRepository) {}
  searchProducts(search: string): Promise<ProductPriceComparison[]> { return this.comparisons.searchProducts(search); }
  compareShoppingList(listId: number): Promise<ListStoreComparison[]> { return this.comparisons.compareShoppingList(listId); }
}

import type {
  CreateStoreInput,
  Store,
  StoreSummary,
  UpdateStoreInput,
} from '@/domain/entities/store';

export type StoreDeletionDependencies = {
  productCount: number;
  historyCount: number;
  sessionCount: number;
};

export interface StoreRepository {
  create(input: CreateStoreInput): Promise<Store>;
  findById(id: number): Promise<Store | null>;
  findSummaryById(id: number): Promise<StoreSummary | null>;
  findByNormalizedName(normalizedName: string, excludingId?: number): Promise<Store | null>;
  list(search?: string): Promise<StoreSummary[]>;
  update(id: number, input: UpdateStoreInput): Promise<Store>;
  setFavorite(id: number, isFavorite: boolean): Promise<Store>;
  getDeletionDependencies(id: number): Promise<StoreDeletionDependencies>;
  delete(id: number): Promise<void>;
}

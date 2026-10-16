import type { CreateStoreInput, Store } from '@/domain/entities/store';

export interface StoreRepository {
  create(input: CreateStoreInput): Promise<Store>;
  findById(id: number): Promise<Store | null>;
  list(): Promise<Store[]>;
}

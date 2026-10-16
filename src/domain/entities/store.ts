export type Store = {
  id: number;
  name: string;
  normalizedName: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StoreSummary = Store & {
  productCount: number;
};

export type CreateStoreInput = {
  name: string;
  isFavorite?: boolean;
};

export type UpdateStoreInput = {
  name: string;
};

export function normalizeStoreName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

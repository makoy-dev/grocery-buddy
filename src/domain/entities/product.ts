export type Product = {
  id: number;
  barcode: string;
  name: string;
  brand: string | null;
  category: string | null;
  unit: string | null;
  packageSize: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateProductInput = {
  barcode: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  unit?: string | null;
  packageSize?: string | null;
};

export type UpdateProductInput = CreateProductInput;

export type ProductSummary = Product & {
  currentPriceCents: number | null;
  hasPriceForStore: boolean;
};

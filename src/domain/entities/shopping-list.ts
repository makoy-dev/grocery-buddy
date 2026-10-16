export type ShoppingList = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type ShoppingListItem = {
  id: number;
  listId: number;
  productId: number;
  productName: string;
  barcode: string;
  quantity: number;
  pickedUp: boolean;
  priceCents: number | null;
  lineTotalCents: number | null;
};

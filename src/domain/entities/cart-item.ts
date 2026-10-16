export type CartItem = {
  id: number;
  sessionId: number;
  productId: number;
  productName: string;
  barcode: string;
  quantity: number;
  unitPriceCents: number;
  lineSubtotalCents: number;
};

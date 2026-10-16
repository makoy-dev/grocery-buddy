export function priceDifferenceCents(priceCents: number, lowestCents: number): number { return priceCents - lowestCents; }
export function priceDifferencePercent(priceCents: number, lowestCents: number): number | null { return lowestCents > 0 ? ((priceCents - lowestCents) / lowestCents) * 100 : null; }
export function lowestSavedPrice(prices: (number | null)[]): number | null { return prices.filter((price): price is number => price !== null).reduce<number | null>((lowest, price) => lowest === null || price < lowest ? price : lowest, null); }

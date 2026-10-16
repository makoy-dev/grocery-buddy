/** @jest-environment node */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseConnection } from '@/database/connection';
import { NodeSQLiteConnection } from '@/database/__test-support__/node-sqlite-connection';
import { configureDatabase } from '@/database/configure-database';
import { SQLiteCartRepository } from '@/database/repositories/cart-repository';
import { SQLiteProductRepository } from '@/database/repositories/product-repository';
import { SQLitePricingRepository } from '@/database/repositories/pricing-repository';
import { SQLiteReportRepository } from '@/database/repositories/report-repository';
import { SQLiteSessionRepository } from '@/database/repositories/session-repository';
import { SQLiteStoreRepository } from '@/database/repositories/store-repository';

describe('offline reports', () => {
  let directory: string;
  let database: DatabaseConnection;
  let storeId: number;
  let productId: number;

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), 'grocery-godz-reports-'));
    database = new NodeSQLiteConnection(join(directory, 'reports.db'));
    await configureDatabase(database);
    storeId = (await new SQLiteStoreRepository(database).create({ name: 'Report Market' })).id;
    productId = (await new SQLiteProductRepository(database).create({ barcode: '0001234567890', name: 'Coffee' })).id;
  });

  afterEach(async () => { await database.close(); rmSync(directory, { recursive: true, force: true }); });

  it('aggregates completed sessions by date and keeps estimated and actual totals distinct', async () => {
    const clock = () => '2026-10-10T10:00:00.000Z';
    const session = new SQLiteSessionRepository(database, clock);
    const started = await session.start(storeId);
    await new SQLiteCartRepository(database, clock).addItem({ storeId, productId, quantity: 2, unitPriceCents: 12500 });
    await session.complete(started.id, 26000);
    const report = await new SQLiteReportRepository(database).getSnapshot({ from: '2026-10-01T00:00:00.000Z', to: '2026-10-31T23:59:59.999Z' });
    expect(report.summary).toEqual({ completedSessions: 1, estimatedTotalCents: 25000, actualTotalCents: 26000, sessionsWithActualTotal: 1 });
    expect(report.periods).toEqual([{ period: '2026-10', estimatedTotalCents: 25000, actualTotalCents: 26000 }]);
    expect(report.frequentProducts[0]).toMatchObject({ productName: 'Coffee', quantity: 2 });
  });

  it('filters sessions outside the requested period and reports an empty period safely', async () => {
    const session = new SQLiteSessionRepository(database, () => '2026-09-10T10:00:00.000Z');
    const started = await session.start(storeId);
    await new SQLiteCartRepository(database, () => '2026-09-10T10:00:00.000Z').addItem({ storeId, productId, unitPriceCents: 5000 });
    await session.complete(started.id, null);
    const report = await new SQLiteReportRepository(database).getSnapshot({ from: '2026-10-01T00:00:00.000Z', to: '2026-10-31T23:59:59.999Z' });
    expect(report.summary.completedSessions).toBe(0);
    expect(report.summary.estimatedTotalCents).toBe(0);
    expect(report.byStore).toEqual([]);
  });

  it('aggregates budget usage and price changes from local history', async () => {
    const pricing = new SQLitePricingRepository(database, () => '2026-10-01T08:00:00.000Z');
    await pricing.record({ storeId, productId, priceCents: 10000, recordedAt: '2026-10-01T08:00:00.000Z' });
    await pricing.record({ storeId, productId, priceCents: 12000, recordedAt: '2026-10-05T08:00:00.000Z' });
    const session = new SQLiteSessionRepository(database, () => '2026-10-05T10:00:00.000Z');
    const started = await session.start(storeId);
    await session.setBudget(started.id, 10000);
    await new SQLiteCartRepository(database, () => '2026-10-05T10:00:00.000Z').addItem({ storeId, productId, unitPriceCents: 12000 });
    await session.complete(started.id, 12000);
    const report = await new SQLiteReportRepository(database).getSnapshot({ from: '2026-10-01T00:00:00.000Z', to: '2026-10-31T23:59:59.999Z' });
    expect(report.budgetUsage).toMatchObject({ sessionsWithBudget: 1, budgetCents: 10000, overBudgetCount: 1 });
    expect(report.priceChanges[0]).toMatchObject({ firstPriceCents: 10000, latestPriceCents: 12000, changeCents: 2000 });
  });
});

# Grocery Buddy database schema

The application stores all durable data in `grocery-buddy.db` through `expo-sqlite`. Startup enables WAL journaling and `PRAGMA foreign_keys = ON`, then applies each unapplied migration inside an exclusive transaction.

## Migration policy

- `schema_version` contains one immutable row per applied migration: version, name, and application timestamp.
- Migration files are ordered numerically in `src/database/migrations/`.
- Migrations are forward-only and transactional. The version row is committed in the same transaction as its schema change.
- Launches and upgrades never drop tables or recreate the database. Later changes must preserve existing rows or explicitly transform them in a new migration.
- Static migration DDL uses the unbound execution API. Repositories and version writes use prepared, parameterized statements.

Current schema version: **1** (`initial_schema`).

## Tables

| Table | Purpose | Important constraints |
| --- | --- | --- |
| `stores` | Grocery stores | Unique normalized name; favorite is `0` or `1` |
| `products` | Barcode-identified products | Barcode is unique `TEXT`, preserving leading zeros |
| `store_products` | Current store-specific product price | Unique store/product pair; non-negative integer cents |
| `price_history` | Append-only price observations | Non-negative integer cents with recorded timestamp |
| `shopping_sessions` | Store shopping trips | Status is active/completed/cancelled; money uses integer cents |
| `shopping_items` | Products in a shopping session | Positive integer quantity; unique session/product pair |
| `shopping_lists` | Reusable named lists | Non-empty name and timestamps |
| `shopping_list_items` | Products in a reusable list | Positive integer quantity; unique list/product pair |
| `app_settings` | Local key/value settings | Unique non-empty text key and text value |
| `schema_version` | Applied migrations | One row per migration version and name |

All application tables use SQLite `STRICT` mode. Money fields are constrained to non-negative `INTEGER` values and named with a `_cents` suffix. Packaged-product quantities are positive integers.

## Relationships and delete policies

- Deleting a store or product cascades through its current prices and price observations.
- A store referenced by a shopping session is restricted from deletion, preserving session history.
- Deleting a shopping session cascades to its items.
- Deleting a shopping list cascades to its items.
- Products referenced by shopping or list items are restricted from deletion.
- Parent key updates cascade to dependent rows.

Deletion is never part of initialization or migration startup.

## Indexes

- A partial unique index on `shopping_sessions(store_id)` where status is `active` enforces one active session per store.
- Price history is indexed by store, product, and newest recording time.
- Session lookup is indexed by store and newest start time.
- Foreign-key lookup indexes cover product references that are not already the leading columns of a unique index.

## Repository boundary

Domain repository interfaces live under `src/domain/interfaces/`. SQLite implementations live under `src/database/repositories/`. Database row types retain SQL column names in `src/database/models.ts`; mapper functions translate them into camel-cased domain entities. This keeps SQLite and schema details out of future business services and UI code.

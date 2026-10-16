# Grocery Buddy database schema

The application stores all durable data in `grocery-buddy.db` through `expo-sqlite`. Startup enables WAL journaling and `PRAGMA foreign_keys = ON`, then applies each unapplied migration inside an exclusive transaction.

## Migration policy

- `schema_version` contains one immutable row per applied migration: version, name, and application timestamp.
- Migration files are ordered numerically in `src/database/migrations/`.
- Migrations are forward-only and transactional. The version row is committed in the same transaction as its schema change.
- Launches and upgrades never drop tables or recreate the database. Later changes must preserve existing rows or explicitly transform them in a new migration.
- Static migration DDL uses the unbound execution API. Repositories and version writes use prepared, parameterized statements.

Current schema version: **4** (`add_explicit_session_budget_state`).

## Tables

| Table | Purpose | Important constraints |
| --- | --- | --- |
| `stores` | Grocery stores | Unique normalized name; favorite is `0` or `1` |
| `products` | Shared barcode-identified catalog | Barcode is unique `TEXT`, preserving leading zeros; `archived_at` retains old catalog records |
| `store_products` | Current store-specific product price | Unique store/product pair; non-negative integer cents |
| `price_history` | Append-only price observations | Non-negative integer cents with recorded timestamp |
| `shopping_sessions` | Store shopping trips | Status is active/completed/cancelled; money uses integer cents; `budget_set` distinguishes no budget from an explicit zero budget |
| `shopping_items` | Products in a shopping session | Positive integer quantity; unique session/product pair |
| `shopping_lists` | Reusable named lists | Non-empty name and timestamps |
| `shopping_list_items` | Products in a reusable list | Positive integer quantity; unique list/product pair |
| `app_settings` | Local key/value settings | Unique non-empty text key and text value |
| `schema_version` | Applied migrations | One row per migration version and name |

All application tables use SQLite `STRICT` mode. Money fields are constrained to non-negative `INTEGER` values and named with a `_cents` suffix. Packaged-product quantities are positive integers.

## Relationships and delete policies

- If a store or product is explicitly deleted after dependent price rows are absent, its derived current-price and observation rows cascade with it.
- A migration trigger blocks store deletion when current prices, price observations, or shopping sessions exist; this prevents an ordinary store-management action from silently deleting historical data.
- A product migration trigger blocks deletion when current prices, price observations, cart items, or shopping-list items exist. Product management archives records instead, preserving references and history.
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
- Archived products are indexed with their name for catalog administration.

## Repository boundary

Domain repository interfaces live under `src/domain/interfaces/`. SQLite implementations live under `src/database/repositories/`. Database row types retain SQL column names in `src/database/models.ts`; mapper functions translate them into camel-cased domain entities. This keeps SQLite and schema details out of future business services and UI code.

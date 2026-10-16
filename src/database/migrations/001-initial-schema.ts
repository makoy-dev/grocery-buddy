import type { DatabaseMigration } from '@/database/migrations/types';

export const initialSchemaMigration: DatabaseMigration = {
  version: 1,
  name: 'initial_schema',
  async up(database) {
    await database.exec(`
      CREATE TABLE stores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        normalized_name TEXT NOT NULL UNIQUE CHECK (length(normalized_name) > 0),
        is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barcode TEXT NOT NULL UNIQUE CHECK (length(trim(barcode)) > 0),
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        brand TEXT,
        category TEXT,
        unit TEXT,
        package_size TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE store_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        current_price_cents INTEGER NOT NULL
          CHECK (typeof(current_price_cents) = 'integer' AND current_price_cents >= 0),
        updated_at TEXT NOT NULL,
        FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE CASCADE,
        UNIQUE (store_id, product_id)
      ) STRICT;

      CREATE TABLE price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        price_cents INTEGER NOT NULL
          CHECK (typeof(price_cents) = 'integer' AND price_cents >= 0),
        recorded_at TEXT NOT NULL,
        FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE CASCADE
      ) STRICT;

      CREATE TABLE shopping_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
        budget_cents INTEGER NOT NULL DEFAULT 0
          CHECK (typeof(budget_cents) = 'integer' AND budget_cents >= 0),
        estimated_total_cents INTEGER NOT NULL DEFAULT 0
          CHECK (typeof(estimated_total_cents) = 'integer' AND estimated_total_cents >= 0),
        actual_total_cents INTEGER
          CHECK (actual_total_cents IS NULL OR
            (typeof(actual_total_cents) = 'integer' AND actual_total_cents >= 0)),
        started_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CHECK (
          (status = 'active' AND completed_at IS NULL AND actual_total_cents IS NULL) OR
          (status IN ('completed', 'cancelled') AND completed_at IS NOT NULL)
        )
      ) STRICT;

      CREATE TABLE shopping_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL CHECK (typeof(quantity) = 'integer' AND quantity > 0),
        unit_price_cents INTEGER NOT NULL
          CHECK (typeof(unit_price_cents) = 'integer' AND unit_price_cents >= 0),
        FOREIGN KEY (session_id) REFERENCES shopping_sessions(id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        UNIQUE (session_id, product_id)
      ) STRICT;

      CREATE TABLE shopping_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE shopping_list_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        list_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL CHECK (typeof(quantity) = 'integer' AND quantity > 0),
        FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON UPDATE CASCADE ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        UNIQUE (list_id, product_id)
      ) STRICT;

      CREATE TABLE app_settings (
        key TEXT PRIMARY KEY NOT NULL CHECK (length(trim(key)) > 0),
        value TEXT NOT NULL
      ) STRICT;

      CREATE INDEX idx_store_products_product_id
        ON store_products(product_id);
      CREATE INDEX idx_price_history_lookup
        ON price_history(store_id, product_id, recorded_at DESC);
      CREATE INDEX idx_price_history_product_id
        ON price_history(product_id);
      CREATE INDEX idx_shopping_sessions_store_started
        ON shopping_sessions(store_id, started_at DESC);
      CREATE UNIQUE INDEX idx_one_active_session_per_store
        ON shopping_sessions(store_id) WHERE status = 'active';
      CREATE INDEX idx_shopping_items_product_id
        ON shopping_items(product_id);
      CREATE INDEX idx_shopping_list_items_product_id
        ON shopping_list_items(product_id);
    `);
  },
};

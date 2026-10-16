# Grocery Godz Engineering Guide

Grocery Godz is an Android-first, iOS-compatible Expo application. It is a fully offline grocery price tracker: users select a store, scan a barcode, save a store-specific price, and estimate a shopping total.

## Non-negotiable offline rules

- The shipped app must work without an account or internet connection.
- Persist app data locally with `expo-sqlite`. Do not add a backend, cloud database, authentication, analytics, remote configuration, or runtime network calls.
- Do not send barcode, product, store, price, shopping-list, or usage data off-device.
- Treat the SQLite schema and migrations as the source of truth. Use parameterized queries for user-provided values.
- A feature is not complete until cold-start and offline behavior are validated on a device or emulator.

## Architecture

- `src/app/`: Expo Router route files and route layouts only. Keep screens thin.
- `src/components/ui/`: shared presentational primitives without feature-specific business rules.
- `src/features/<feature>/`: feature-owned UI, hooks, validation, state, use cases, and tests.
- `src/domain/entities/`: business entities with no React Native, Expo, or SQLite dependencies.
- `src/domain/interfaces/`: repository and service contracts needed by domain/use-case code.
- `src/database/migrations/`: ordered, forward-only SQLite migrations.
- `src/database/repositories/`: SQLite implementations of domain repository interfaces.
- `src/hooks/`, `src/lib/`, `src/types/`, `src/utils/`, and `src/theme/`: cross-cutting code that is genuinely shared.

The initial feature boundaries are `stores`, `products`, `pricing`, `scanner`, `cart`, `sessions`, `budget`, `shopping-lists`, `history`, `comparisons`, `reports`, and `settings`. Add code to a boundary only when that milestone is implemented. Prefer direct, readable use cases and repositories over generic base classes or speculative abstractions.

## Conventions

- TypeScript is strict. Do not use `any` to bypass domain or database types.
- Import project code through `@/…`; use relative imports only within a tightly coupled local folder.
- Expo Router owns navigation. Route files coordinate components and use cases but do not contain SQL or pricing calculations.
- Zustand stores hold transient application/session state. Durable records belong in SQLite.
- Validate form input with React Hook Form and Zod at the UI boundary, then pass typed values to use cases.
- Keep price values in integer minor currency units (for example, cents) unless a documented domain decision says otherwise.
- Keep platform behavior compatible with Android and iOS. Android is the primary manual-validation target.
- Use NativeWind for routine component styling and shared theme tokens for navigation or imperative APIs.
- Tests live beside the code they cover in `__tests__` folders or as `*.test.ts(x)` files.
- Do not present disabled or placeholder UI as a working feature. Label milestone scaffolding plainly.

## Expo dependencies

This project currently uses Expo SDK 58. Before changing an Expo API, confirm the installed `expo` major version and consult its matching versioned documentation. Add packages with `npx expo install` so native versions stay SDK-compatible. Do not hand-edit generated `android/` or `ios/` directories; configure native behavior through app config and config plugins.

## Commands

```bash
npm install
npm run start
npm run android
npm run lint
npm run typecheck
npm test
npm run doctor
```

## Milestone validation

For every milestone:

1. Run lint, TypeScript, and the relevant unit/component tests.
2. Run `npm run doctor` after dependency or Expo configuration changes.
3. Exercise the changed flow on Android; also check iOS when platform-specific code or configuration changes.
4. Validate once with the device/emulator offline and after a cold start.
5. For database changes, test both a fresh database and an upgrade from the prior schema version.
6. Report what was statically verified versus what was actually exercised on a device. Do not call build, lint, or unit tests end-to-end proof.

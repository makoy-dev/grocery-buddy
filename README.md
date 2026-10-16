# Grocery Buddy

Grocery Buddy is an Android-first, iOS-compatible grocery shopping price tracker built with Expo and React Native. It is designed to keep stores, products, prices, shopping sessions, and totals entirely on the device.

This repository currently contains the application foundation and five-tab navigation shell. Store management, barcode scanning, price persistence, and cart calculations are not implemented yet.

## Stack

- Expo SDK 58, React Native, and TypeScript
- Expo Router
- `expo-sqlite` for on-device persistence
- `expo-camera` for future barcode scanning
- Zustand for transient state
- NativeWind for styling
- React Hook Form and Zod for forms and validation
- Jest and React Native Testing Library

## Requirements

- Node.js supported by the installed Expo SDK
- npm
- Android Studio/emulator or an Android device for primary development
- macOS with Xcode for the iOS simulator, or a compatible physical-device workflow

## Setup

```bash
npm install
npm run start
```

From the Expo terminal, open Android, iOS, or web as supported by your machine. You can also start a target directly:

```bash
npm run android
npm run ios
npm run web
```

The camera dependency is configured with barcode scanning enabled and Android audio recording disabled. No camera permission is requested by the current shell because scanning is not implemented yet.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run doctor
```

## Project layout

```text
src/
  app/                    # Expo Router routes and layouts
  components/ui/          # Shared UI primitives
  features/               # Feature-owned modules
  database/
    migrations/           # Forward-only SQLite migrations
    repositories/         # SQLite repository implementations
  domain/
    entities/             # Framework-independent business entities
    interfaces/           # Repository and service contracts
  hooks/                  # Shared React hooks
  lib/                    # Shared infrastructure helpers
  types/                  # Shared TypeScript types
  utils/                  # Pure cross-feature utilities
  theme/                  # Design tokens and navigation themes
```

The feature boundaries are stores, products, pricing, scanner, cart, sessions, budget, shopping lists, history, comparisons, reports, and settings. Empty feature directories are intentional until their milestones begin.

## Offline guarantee

Runtime features must not depend on a backend, authentication provider, analytics service, or network request. Durable data belongs in SQLite. Changes that introduce network-capable SDKs or remote data flows require an explicit architecture decision and conflict with the current product goal.

The versioned SQLite schema, constraints, indexes, and delete policies are documented in [docs/database-schema.md](docs/database-schema.md).

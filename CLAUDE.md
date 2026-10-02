# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This repo is two independent projects sharing one git root:

- **Root (`/`)** — a React Native (0.82, React 19) app called Bahix/BillBook. TypeScript, no Redux despite `src/redux` naming convention in places — server state is managed with `@tanstack/react-query`, not a global store.
- **`backend/`** — a TypeScript Express API ("billbook-backend") deployed as an AWS Lambda via Serverless Framework, with Postgres (`pg`) as the database. Has its own `package.json`, `tsconfig.json`, and its own `AGENTS.md` — read `backend/AGENTS.md` before working there, it documents that project's structure/conventions and this file does not repeat it.

Treat them as separate codebases: run commands from the relevant directory (`backend/` vs repo root), and don't assume a shared toolchain.

## Commands (mobile app, repo root)

```sh
npm start                 # Metro dev server
npm run android           # build + run on Android
npm run ios               # build + run on iOS (run `bundle exec pod install` after native dep changes)
npm run lint               # eslint .
npm run type-check         # tsc --noEmit
npm test                   # jest
```

iOS first-time setup: `bundle install`, then `bundle exec pod install`.

## Commands (backend, `backend/`)

```sh
npm run dev            # tsx watch src/index.ts — local API with hot reload
npm run build           # tsc -> dist/
npm start               # run compiled dist/index.js (build first)
npm run setup            # tsx src/config/setup.ts — DB init
npm run update:schema     # tsx src/config/extra.ts — schema migrations
npm run deploy            # serverless deploy
```

No test framework is configured in `backend/`; `npm run build` is the minimum pre-PR check there.

## Architecture — mobile app

- **Navigation** (`src/navigation/`): `AppNavigator` swaps between `AuthStack` and `MainTabs` purely based on whether `AuthContext` has a token — there's no separate route-guarding logic. `MainTabs` composes per-feature stacks (`CustomerStack`, `DashboardStack`, `InvoicesStack`, `productStack`, `SettingsNavigator`).
- **Auth** (`src/context/AuthContext.tsx`): token is loaded from `src/utils/storage.ts` (AsyncStorage) on mount and held in a React context, not react-query. `axiosInstance.ts` registers a session-expired callback via `setSessionExpiredHandler`; a 401 response or a request with no token (for non-public auth paths) triggers this callback, which clears the token and the react-query cache. This is the one piece of cross-cutting wiring between the API layer and auth state — don't bypass it by calling `axios` directly.
- **API layer** (`src/apis/`): one file per resource (`InvoiceApis.ts`, `customerApis.ts`, `productApis.ts`, `authApi.ts`, `dashboardApi.ts`), all built on the shared `axiosInstance`. List endpoints go through `fetchPaginatedList` (`src/apis/pagination.ts`), which normalizes whatever shape the backend returns (`items`/`data`/`results`/etc., various meta field names) into `PaginatedResponse<T>`.
- **Pagination hook** (`src/hooks/usePaginatedListQuery.ts`): wraps react-query's `useInfiniteQuery` for infinite-scroll screens; pass it a `queryFn` returning `PaginatedResponse<T>` and it flattens pages into `items` + exposes `pagination` meta. This is the standard pattern for all list screens (customers, products, invoices) — use it rather than a fresh `useQuery`/manual pagination.
- **Screens** (`src/screens/`) are grouped by feature (`Clients`, `Inventory`, `Invoices`, `Settings`, `auth`, `Dashboard`), each with List/Add/Preview variants where applicable.
- **Config** (`src/config/index.ts`): reads `BASE_URL` from `react-native-config` (`.env.development` / `.env.production`), pointing at the deployed API Gateway URL.
- **Invoice PDF generation** (`src/utils/htmlTemplate.ts`, `pdfGenerator.ts`, `a5.ts`, `landScape.ts`): builds HTML invoice templates and renders them via `react-native-html-to-pdf`; `generateQrBase64.tsx` produces the QR embedded in the template.

## Architecture — backend

See `backend/AGENTS.md` for the authoritative structure/conventions doc. Key points relevant across both projects:

- Routes are versioned under `/api` → `v1` (`backend/src/routes/v1/`), one router per resource, each importing controllers from `backend/src/controllers/`.
- Auth is a bearer-JWT middleware (`backend/src/middleware/auth.ts`) applied per-router with `router.use(auth)`; it decodes the token and attaches `req.user`.
- Errors: controllers throw/`next()` an `ErrorHandler(statusCode, message)` (`backend/src/helper/error-handler.ts`); a single top-level error middleware in `index.ts` formats the response.
- The Express app is exported both as a normal listener (`app.listen`, for `npm run dev`/`npm start`) and wrapped with `serverless-http` as `handler` (for the Lambda deploy defined in `backend/serverless.yml`) — any change to the app setup in `index.ts` affects both entry points.
- SQL is raw `pg` with parameterized queries (`$1`, `$2`, …); responses are passed through `camelize` to convert Postgres snake_case columns to camelCase for the API/mobile boundary.

## Cross-cutting conventions worth knowing

- Frontend API response shapes are normalized client-side (`fetchPaginatedList`) rather than the backend guaranteeing one shape — when adding a new paginated list endpoint, you don't need to also update the client normalizer unless it returns array/meta keys outside the existing fallback lists in `src/apis/pagination.ts`.
- Mobile uses single quotes/no semicolons-optional Prettier config (`.prettierrc.js`); backend uses double quotes per `backend/AGENTS.md`. Don't cross-apply one project's style to the other.

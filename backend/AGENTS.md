# Repository Guidelines

## Project Structure & Module Organization

This is a TypeScript Express backend for BillBook. Application code lives in `src/` and compiles to `dist/`.

- `src/index.ts` wires Express middleware, routes, database checks, and the Serverless handler.
- `src/routes/` contains API route registration; versioned routes live under `src/routes/v1/`.
- `src/controllers/` contains request handlers for auth, invoices, customers, products, salesmen, and dashboards.
- `src/services/`, `src/helper/`, `src/utils/`, and `src/middleware/` hold shared business logic, error handling, utility functions, and Express middleware.
- `src/config/` contains database/setup scripts; `src/types/` contains local TypeScript declarations.
- Root assets such as `htmlTemplate.js`, `previewInvoice.js`, and `invoice-preview.html` support invoice preview/rendering.

## Build, Test, and Development Commands

- `npm run dev` starts the API locally with `tsx watch src/index.ts`.
- `npm run build` runs `tsc` and emits compiled files into `dist/`.
- `npm start` runs the compiled server from `dist/index.js`; run `npm run build` first.
- `npm run setup` executes `src/config/setup.ts` for database initialization.
- `npm run update:schema` executes `src/config/extra.ts` for schema updates.
- `npm run deploy` deploys with Serverless using `serverless.yml`.

## Coding Style & Naming Conventions

Use TypeScript with strict mode enabled. Follow the existing style: two-space indentation, double quotes, semicolons, ESM imports with `.js` extensions for local TypeScript modules, and async controller functions wrapped in `try/catch`. Name route files by resource, for example `products.routes.ts`; name controllers by resource, for example `products.controller.ts`. Keep SQL parameterized with `$1`, `$2`, etc. and pass values separately.

## Testing Guidelines

No automated test framework is currently configured. Before opening a pull request, run `npm run build` as the minimum validation. When adding tests, mirror the source layout and prefer names such as `src/controllers/auth.controller.test.ts` or `src/utils/pagination.test.ts`. Cover controller success paths, validation errors, auth failures, and database edge cases.

## Commit & Pull Request Guidelines

Recent commits use short, imperative summaries such as `added pagination and search (#12)` or `updated dashboard api (#9)`. Keep commit subjects concise and mention the issue or PR number when available. Pull requests should include a short description, linked issue, testing notes, and sample API responses or screenshots when behavior changes.

## Security & Configuration Tips

Keep secrets in `.env`; never commit database credentials, JWT secrets, or deployment keys. Confirm `JWT_SECRET`, database connection settings, and Serverless credentials are present before running locally or deploying.

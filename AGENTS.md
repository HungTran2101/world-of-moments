# World of Moments — Agent Guidelines

World of Moments is a calm, map-based reflection app built with Next.js, TypeScript,
PostgreSQL, Prisma, MapLibre, Zustand, and Framer Motion.

The experience should feel like discovering quiet messages left around the world,
not browsing a social network. Emphasize place, atmosphere, and reflection over
activity or popularity.

## Always-on product rules

- Preserve the public anonymous identity model. Public visitors use only a UUID
  stored in browser LocalStorage. CMS-only accounts and database-backed sessions
  are isolated under `/cms` and `/api/cms`; never apply them to the public map.
- Do not introduce social mechanics such as likes, comments, followers, feeds,
  rankings, popularity metrics, or intrusive notifications.
- Never expose author identities or exact timestamps in public responses. Exact
  timestamps are only for the author's private history.
- Keep the primary flow minimal: open map → click to place a pin → write a
  description → submit.
- The 2D map is the primary interface. The planned 3D globe is secondary and
  atmospheric.
- Prefer calm, fluid transitions and subtle motion that support the emotional
  experience. Avoid aggressive or distracting effects.
- Favor readable, maintainable code over clever abstractions. Keep dependencies
  minimal and avoid unnecessarily heavy libraries.
- Keep realtime behavior subtle; new markers may animate quietly without sounds or
  pop-up notifications.

## Code linting

- When writing or editing `.ts` or `.tsx` files, follow the project's ESLint rules.
  The `lint:script` script is `eslint "**/*.tsx" --fix`.
- When writing or editing `.css` or `.scss` files, follow the project's Stylelint
  rules. The `lint:style` script is `stylelint "**/*.scss" --fix`.
- Run the relevant linter with `--fix` on changed files before completing the task.
  Include `.ts` and `.css` files explicitly when needed, since the scripts above
  only target `.tsx` and `.scss` files.

## CMS API services

- CMS UI must import named functions from `services/cms/<module>` instead of
  calling `cmsRequest`, `apiRequest`, or `fetch` directly for CMS APIs.
- Keep CMS endpoint URLs, HTTP methods, ID encoding, payloads and response types
  inside service modules. Accept optional `ApiRequestOptions` for cancellation
  and existing request options. Keep service functions in `index.ts` and their
  response types in `types.ts`.
- Keep UI state, query keys/invalidation, navigation and logout broadcasting in
  the UI. Shared session-expiry helpers may still be used directly.

## CMS CRUD tables

- Each list page owns its Header, breadcrumbs, columns, row actions, selection
  and Table composition. Reuse `useCRUDPage` for list/query/mutation behavior and
  shared UI primitives; do not add a generic CRUD page wrapper.
- Every CMS CRUD list, including future lists, must define a `createdAt` column
  in its own page-level `columns` array, immediately before the Actions column
  (second last).
- Use the localized `common.createdAt` label and display the timestamp as
  `HH:mm dd/MM/yyyy` (24-hour time, zero-padded day/month) in the browser time zone,
  regardless of UI locale. CMS record APIs must provide an ISO `createdAt` timestamp.
- Use `formatDateTime` from `lib/utils.ts` for this display format.
- Keep this column explicit in each page; do not inject it into the shared
  `Table` or require `createdAt` on its generic record type.
- Center the Actions header and cells. Use icon controls with localized tooltips
  and accessible labels, retaining links for navigation and buttons for mutations.

## API pagination

- All paginated list APIs, including future endpoints, return
  `{ items: T[], metadata: { page, pageSize, total, totalPages } }`.
- Keep pagination fields inside `metadata`, with domain records in `items`.
- Reuse `PaginatedResponse<T>` and `PaginationMetadata` from
  `services/shared/pagination.ts` in Route Handlers and frontend services.
- Use 1-based pages. An empty result has `items: []`, `metadata.page: 1`,
  `metadata.total: 0`, and `metadata.totalPages: 1`.

## Code comments

- Write comments explaining important logic in Vietnamese, especially data loading,
  map rendering, clustering, and lifecycle cleanup. Explain the reason or behavior
  rather than restating obvious code.

## Detailed context

Read only the documents relevant to the task:

- Product behavior and philosophy: `contexts/project.md`
- System structure and technical boundaries: `contexts/architecture.md`
- Planned phases and feature priority: `contexts/roadmap.md`
- General repository overview and setup: `README.md`
- CMS architecture, contracts, setup, and implementation status: `contexts/cms.md`

For every future CMS change, read `contexts/cms.md` and update its affected
contracts, behavior, or status in the same task.

When documentation and implementation differ, do not silently choose one. Verify
whether the difference is an intentional product decision before changing behavior.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

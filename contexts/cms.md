# CMS — World of Moments

This is the maintained CMS specification and implementation reference. Read it
before changing CMS behavior and update the affected contracts/status in the same
task. Public map visitors retain their anonymous LocalStorage UUID identity.

## Scope and architecture

- Internal CMS only: `/cms` and `/api/cms`.
- Next.js App Router, Better Auth hosted in Next.js, Neon PostgreSQL through the
  existing Prisma client, TanStack Query, Zustand, React Hook Form and Yup.
- Initial modules: accounts and roles. Submission administration and exports are
  deferred. There are no social logins, public registration, or email recovery.
- Use a restrained, readable interface with shared spacing, controls and subtle
  transitions. No glass dashboard styling or decorative statistics panels.

## Code organization

- Page components live in `components/AccountDetail`, `components/Accounts`,
  `components/ChangePassword`, `components/Login`, `components/Overview`,
  `components/RoleDetail` and `components/Roles`, each with `index.tsx` and
  `index.scss`. `components/List` contains the shared CRUD page and its styles.
- Reusable UI lives in `components/shared/{Breadcrumbs,Forms,Header,Providers,
  Route,SearchInput,Sidebar,Table}`. Styles are colocated as `index.scss` with
  their owning components. Shared CMS tokens, controls and layout utilities live
  with `Providers`; table primitives are shared with the role permission matrix.
- Sidebar configuration is `components/shared/Sidebar/sidebar.ts` beside its
  rendering component; the public map sidebar remains `components/Sidebar`.
- Server-only auth and API handlers live in root `handlers/`: `accounts.ts`,
  `auth-actions.ts`, `auth.ts`, `http.ts` and `roles.ts`.
- `components/ProtectedPage/index.tsx` owns the server-side page/session wrapper.
  Route files under `app/cms` compose it with the shared CMS providers and shell.
- Permission constants, route mappings, query state and validation schemas live
  in `services/{permission,routes,query-state,schemas}.ts`.
- Each request module has `index.ts` for service functions and `types.ts` for its
  types: `services/cms/accounts`, `services/cms/roles`, `services/future-message`,
  `services/submissions`, and `services/locale`. Types are imported directly from
  the module's `/types` path, separately from runtime functions.
- Account/role list and batch-delete functions accept optional `ApiRequestOptions`.
  Pages adapt them to the CRUD hook's `listService`/`deleteService` shape. Shared
  list-query serialization lives in `services/query-state.ts`.
- Shared CMS transport/session refresh lives in `services/shared/cms-api.ts`,
  cross-module CMS types in `services/shared/types.ts`, and Zustand session state
  in `store/cmsStore.ts`. Account/role record DTOs belong to their module's `types.ts`.

## Authentication and identity

- Username/password login; accounts contain username, display name, active status,
  password credentials, and multiple roles. Internal email identifiers satisfy
  Better Auth's schema; real email addresses are not collected.
- Initial username **admin**, password **worldofmoment**. Seeding reads the password
  from `CMS_INITIAL_ADMIN_PASSWORD`, hashes it, and never overwrites an existing
  account. No forced first-login password change.
- Seeded admin is excluded from account lists, search, pagination totals and
  account options. Ordinary detail, update, reset and batch-delete endpoints also
  reject this account with 404. It can change its own password while signed in.
- The protected system role grants `["*"]`. It cannot be edited, deleted, assigned
  to other accounts, or removed from the seeded account.
- The database session is the authority. APIs check the live session, expiry,
  account status and current role permissions.
- Better Auth session cookie: HttpOnly, SameSite=Lax, Secure in production,
  seven-day absolute expiry, no sliding refresh or cookie session cache.
- Login returns `{ user: { id, username, name, scopes } }` and the HttpOnly session
  cookie. Client state contains no authentication credential or JWT. There is no
  JWT plugin, decoding, token-expiry timer, or refresh endpoint.
- `useCmsStore` holds plain user information and scopes in memory, never
  LocalStorage. Server-side session validation precedes protected page rendering
  and reloads. Each protected page uses its server-validated user for permission
  checks and synchronizes that user into the store/sidebar without a separate
  session-information request. API checks always use current DB permissions.
- A protected API 401 clears the session and redirects to login, without refresh
  or retry. A 403 is not retried as a mutation. Logout is propagated across tabs
  without sharing credentials.
- Expired sessions and cross-tab logout use full-document navigation to login
  so client/router state from the previous session is discarded. The two narrow
  ESLint exceptions document this deliberate behavior.
- Deactivation/deletion/password reset revoke sessions. Self-service password
  changes require the current password and revoke other sessions.
- Login limits are shared in PostgreSQL: 30/IP and 8/username per 15-minute fixed
  window. Configure them in `app/api/constant.ts` using
  `CMS_LOGIN_RATE_LIMIT_WINDOW_MS`, `CMS_LOGIN_MAX_ATTEMPTS_PER_IP` and
  `CMS_LOGIN_MAX_ATTEMPTS_PER_USERNAME`. Expired limiter rows are cleaned up.
  Configure trusted proxy headers.
- State-changing requests require the configured same-origin `Origin`; no blanket
  Better Auth HTTP handler is exposed, so registration/admin endpoints are absent.

## Permissions, routes, and sidebar

- `services/permission.ts` exports `permissions`, `permissionModules`,
  `checkPermission(scopes, permission)`, and permission-object resolution.
- Defaults: `account.show/create/update/delete` and `role.show/create/update/delete`.
  Extra: `account.resetPasswordPermission`.
- Permission keys are defined in code, not created through the CMS. Roles assign
  catalog keys; account scopes combine all assigned roles without duplicates.
- Routes and APIs import the same `permissions.ACCOUNT_SHOW`,
  `permissions.ACCOUNT_CREATE`, etc. constants. No delegation hierarchy is applied
  to ordinary accounts in this version.
- `services/routes.ts` entries contain `key`, `component`, and optional
  `roles: { show?, create?, update?, delete?, custom? }`, containing permission keys.
  `show` replaces the previously discussed `index` key.
- Every protected page is wrapped and receives a computed `permission` prop:
  `{ show, create, update, delete, custom }`.
- A configured `roles.show` may reference any catalog permission. Lack of that
  permission renders the 403 UI. Missing `show` allows authenticated viewing;
  missing action mappings are false; omitted `roles` enables standard page actions.
- Wildcard scopes enable all standard actions and all route-declared extras.
  Otherwise extras are the intersection of scopes and route-declared custom keys.
- UI permissions disable unavailable controls; APIs independently authorize each
  action from the database. Account pages require `ACCOUNT_SHOW`, with create,
  update, delete, and reset guarded by their corresponding permissions.
- Sidebar configuration lives in `components/shared/Sidebar/sidebar.ts`:
  `key`, translated `name`, optional `href`, `showRole`, `childRoutes`, and `items`.
  Missing `showRole` is visible; child routes preserve active highlighting.

| Route | Purpose |
| --- | --- |
| `/cms/login` | Username/password login; redirects signed-in users to `/cms` |
| `/cms` | Authenticated overview with permitted navigation |
| `/cms/accounts` | Account list |
| `/cms/accounts/detail` | Create without `id`; view/update with `?id=...` |
| `/cms/roles` | Role list |
| `/cms/roles/detail` | Create without `id`; view/update with `?id=...` |
| `/cms/change-password` | Self-service password change, including seeded admin |

## Layout, forms, and localization

- Persistent sidebar with logo, nested navigation, locale switch, password change
  and logout. Mobile navigation is collapsible.
- Single-value selects share a chevron positioned 12px from the right edge, with
  reserved text padding for consistent alignment across locale, bulk-action and
  page-size controls. Multiple-select lists retain their native list appearance.
- Each page owns its sticky Header: title left, action controls right. Breadcrumbs
  follow and accept `{ label, href? }[]`; then the table or detail form.
- All navigation controls are Next.js Links; submissions/mutations are buttons.
- CMS forms use React Hook Form and `yupResolver`, including search. All schemas
  live in `services/schemas.ts`; API payloads reuse relevant schemas. Errors are localized.
- Detail identity comes from the URL `id`. Forms hydrate once per identity and
  preserve dirty input during background refetches.
- Role detail matrix: Module, Show, Create, Update, Delete, Extra permissions /
  Quyền bổ sung. Default cells are checkboxes; extras are multiple selects.
- The system role is read-only. Assigned roles cannot be deleted.
- Account role options are available under `account.show`, without `role.show`.
- Separate `messages/cms-en.json` and `messages/cms-vi.json`, nested next-intl
  provider, existing locale cookie and endpoint; Vietnamese defaults. Preserve
  the existing no-trailing-newline convention for locale JSON files.

## List hook and URL state

`useCRUDPage<T>({ queryKey, services: { listService, deleteService }, filterKeys? })`:

- List service accepts `{ page, pageSize, search, filters }` and optional
  `AbortSignal`; returns shared `PaginatedResponse<T>` from
  `services/shared/pagination.ts`.
- Delete service receives `ids: string[]` for both individual and bulk deletion.
- Returns `list` (including metadata), `currentPage`, `currentPageSize`,
  `onChangePage`, `onChangePageSize`, async `onDelete(ids)`, `loading`,
  `deleteLoading`, `fetching`, `search`, `filters`, `onSearch`, `onChangeFilters`,
  `refetch`, and `error`.
- Initial loading and background fetching are separate. Query keys include
  normalized parameters and account identity; obsolete requests are cancellable.
- URL stores page, page size, committed search and supported filters. F5 and
  Back/Forward restore controls. Unrelated parameters are preserved.
- Default page 1, 20 rows; sizes 10/20/50/100. Search/filter/size changes reset page.
  Debounced search replaces history; pagination/filter controls push history.
- SearchInput owns draft/debounce (350 ms). Manual Search cancels debounce,
  immediately applies draft, and refreshes unchanged search. URL navigation cancels
  stale drafts/timers. Defaults may be omitted from the URL.
- Empty results have one empty page. Server clamps out-of-range pages; the hook
  synchronizes the URL after deletion. Pagination metadata stays inside `metadata`.

## Table contract

`Table<T>` receives `datasource: T[]`, `columns`, string `rowKey`, pagination
metadata, search, `onSearch`, `onChangePage`, `onChangePageSize`, initial/background
loading, error/retry, and a navigation key for search synchronization.

- Basic Antd-style columns: `key`, `title`, optional `dataIndex`, `render(value,
  record, index)`, `width`, and `fixed: "right"`. Action columns remain sticky.
- Optional controlled `selection: { selectedRowKeys: string[], onChange(keys,
  selectedRows), getCheckboxProp?(record): { disabled? } }`.
- Optional `bulkAction: { action, label, disabled? }[]` and
  `onBulkAction(action, selectedRecords): void | Promise<void>`.
- Optional `onBulkDelete(selectedRowKeys): Promise<void>`; only its presence adds
  the built-in Delete / Xóa option. `delete` is reserved for that action.
- Checkboxes and bulk select plus Do it / Thực thi appear only with `selection`.
  Disabled records are excluded from selection/execution. Disabled options cannot
  be selected or executed, even if their state changes after selection.
- Await bulk callbacks; prevent duplicate execution; clear selection after success,
  preserve it after failure. Pages reset controlled selection when query/page changes.
- Built-in delete calls only `onBulkDelete`; custom actions call only
  `onBulkAction`. Delete operations confirm the affected count before execution.

## API contract

- Prefix `/api/cms`, same-origin cookies, private/no-store responses.
- Auth: POST `/auth/login`, `/auth/logout`, `/auth/change-password`.
- Accounts: GET/POST `/accounts`, GET/PATCH `/accounts/:id`, GET `/accounts/options`,
  POST `/accounts/:id/reset-password`.
- Roles: GET/POST `/roles`, GET/PATCH `/roles/:id`.
- POST `/accounts/bulk-delete` and `/roles/bulk-delete`: `{ ids: string[] }`.
  The same endpoint accepts `[id]` for single deletion. Batch checks/deletion are
  atomic; assigned-role or protected-record conflicts roll back the whole batch.
- Lists return `{ items, metadata: { page, pageSize, total, totalPages } }` using
  shared pagination types, 1-based pages, and stable created-at/ID ordering.
- Errors: `{ error: string, fieldErrors?: Record<string, string[]> }`. Values use
  CMS translation keys. 400 malformed JSON, 401 invalid session, 403 permission
  denial, 404 unavailable record, 409 conflict, 422 validation, 429 login throttle.
  Field errors map into React Hook Form; unexpected failures return a generic 500.
- Existing public API shapes and authentication behavior are unchanged.

## Setup and maintenance

1. Copy relevant values from `.env.example` into `.env.development` for local work
   (the existing Prisma config selects `.env.<NODE_ENV>`). The example documents
   shared application keys and CMS keys with placeholders, not real environment
   values. Weather keys are legacy configuration; Open-Meteo does not read them.
2. Set `DATABASE_URL` to the desired development Neon database and ensure
   `NEXT_PUBLIC_APP_URL`/optional `CMS_AUTH_URL` match the application origin.
   For Neon URLs, set `sslmode=verify-full` explicitly. This preserves the current
   node-postgres certificate/hostname verification behavior without its warning
   about the future semantics of `sslmode=require`. Keep deployment environment
   values consistent with this setting and restart existing processes/pools after
   changing it. Plain local PostgreSQL URLs may omit TLS when configured locally.
3. Generate a stable random `BETTER_AUTH_SECRET` of at least 32 characters. Share
   the same secret across instances of an environment, using separate development
   and production secrets; keep it out of client bundles and logs. Production CMS
   requires this in `.env.production` or deployment environment settings.
4. Run `pnpm exec prisma migrate deploy`, then `pnpm prisma:generate`.
5. Set `CMS_INITIAL_ADMIN_PASSWORD=worldofmoment`, then run `pnpm cms:seed`.
   Remove the bootstrap password from deployment configuration when no longer needed.
6. Run `pnpm dev` and open `/cms`. Use the normal change-password page to change
   the seeded password. Deploy schema/configuration before exposing the CMS.

Production migration and seeding are explicit deployment steps, not runtime
startup behavior.

The `20261102000200_remove_cms_jwt` cleanup migration removes the obsolete signing-key
table. Deploy the session-only application before applying this migration where
older application instances could still use JWT signing keys. Existing migration
history is retained. `BETTER_AUTH_SECRET` remains required for cookie-based auth.

### Development compiler

The application uses Next.js 16.4.3 with the matching `eslint-config-next` version.
`pnpm dev` uses Turbopack by default; `pnpm dev --webpack` is the fallback command.
In the earlier Next.js 16.1.6/Turbopack development session, compilation kept the
CPU busy and repeated heap-threshold restarts occurred. The underlying cause of
that memory growth has not been isolated. Webpack completed the CMS login
compilation and returned to low CPU use before the framework upgrade.

Keep the PostCSS ES-module configuration in `postcss.config.mjs`. Without a
package-level `type: "module"`, Webpack's Next.js config loader reads `.js` as
CommonJS and cannot find the `plugins` field on an ES-module default export.

After changing Next.js versions, regenerate its route types with `pnpm exec next
typegen` or a fresh build. If old internal-type errors remain in `.next/dev/types`,
stop the development server and remove that generated types directory before
restarting it; those files belong to the previous framework version.

### Prisma types in the editor

After schema changes, run `pnpm prisma:generate`. If VS Code still reports missing
Prisma model types or delegates (for example, `UserSelect`, `UserGetPayload`,
`prisma.user`, or `prisma.cmsRole`), run **TypeScript: Restart TS Server** from the
command palette. The editor can retain old generated declarations even when a
fresh `pnpm exec tsc --noEmit --incremental false` succeeds.

## Validation status

- Implementation and development-database migrations/seed are complete. Production
  database/deployment have not been changed.
- Automated test sources, package scripts and test-only dependencies were removed
  at the user's request. `tsx` remains required by `pnpm cms:seed`.
- Changed-file ESLint/Stylelint fixes, typecheck, Prisma validation and production
  build pass. Repository-wide lint passes without errors or warnings after the
  PostCSS configuration correction.
- Completed production-mode HTTP integration verification against the development DB:
  CRUD, current DB permissions, hidden admin, 422 field errors, revocation,
  password change/reset, and atomic batch conflicts; temporary fixtures are removed.
- Browser checks cover admin login, role/account creation, read-only-user sidebar
  and 403 page, English/Vietnamese, search/page-size restoration after reload, bulk
  deletion with last-page clamping, and responsive table behavior.
- At a 390px viewport the Header remains at 48px while the main area scrolls;
  action cells remain sticky during horizontal table scroll with no page overflow.
- English/Vietnamese CMS files have equal 98-key sets; all locale files retain
  their lack of trailing newline. Final fixture cleanup leaves only the hidden
  seeded admin and its protected system role.
- Restart an already-running development server after generating the new Prisma
  client so it cannot retain an older model schema in memory.
- Next.js 16.4.3 upgrade: typecheck, repository ESLint and production build pass.
  Development browser checks cover login/logout, protected-route redirects,
  user permission scopes, account/role pagination, 422 validation, English/Vietnamese,
  the public map, thought-detail/history APIs, and CSS HMR without a reload. A
  four-minute development session returned to 0% server CPU with no observed
  heap-threshold restarts; this does not establish long-session memory stability.
  Production-mode CMS rendering, session auth, account list and public-map checks also
  passed using the development database. Temporary servers were stopped afterward.
  The existing `middleware.ts` deprecation remains. The PostgreSQL SSL-mode
  warning was subsequently addressed by setting `sslmode=verify-full` in the
  local development/production URL files; hosted deployment settings still need
  the same explicit mode when configured separately.
- Folder reorganization: all 30 moved modules retain their logic and exports;
  imports use the ownership map above and the old root `cms/` folder is removed.
  Styles are split by page/shared component, with the original compiled rules
  preserved except that account/password form widths belong to their page classes.
  Scoped ESLint/Stylelint fixes, repository ESLint, typecheck and production build
  pass. Desktop Accounts geometry/computed styles match the baseline. Browser
  checks cover the role permission matrix, detail form widths, 390px sticky header
  and action cells, select-arrow alignment, account/role lists, session refresh,
  unauthenticated redirects and the public map. Checks did not mutate CMS records.
- Session-only authentication: JWT plugin, direct `jose` dependency, token state,
  decoding, expiry timers and refresh endpoint are removed. The signing-key cleanup
  migration is applied to the development database; production is unchanged.
  Prisma validation, scoped ESLint fixes, repository ESLint, typecheck and build
  pass. Browser checks verify plain-user login, logout, unauthenticated redirects,
  reload hydration and zero refresh calls. Production-mode HTTP checks against the
  development DB verify HttpOnly cookies, plain login DTOs, missing/invalid session
  rejection, 403 permissions, 422 validation, live permission changes and revoked
  sessions. Temporary role/account fixtures and the preview server were cleaned up.

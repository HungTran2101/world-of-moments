# CMS — World of Moments

This is the maintained CMS specification and implementation reference. Read it
before changing CMS behavior and update the affected contracts/status in the same
task. Public map visitors retain their anonymous LocalStorage UUID identity.

## Scope and architecture

- Internal CMS only: `/cms` and `/api/cms`.
- Next.js App Router, Better Auth hosted in Next.js, Neon PostgreSQL through the
  existing Prisma client, TanStack Query, Zustand, React Hook Form and Yup.
- Modules: submissions, accounts and roles. Exports are deferred. There are no
  social logins, public registration, or email recovery.
- Use a restrained, readable interface with shared spacing, controls and subtle
  transitions. No glass dashboard styling or decorative statistics panels.

## Code organization

- Page components live in `components/AccountDetail`, `components/Accounts`,
  `components/ChangePassword`, `components/General`, `components/Login`,
  `components/Dashboard`, `components/Profile`, `components/RoleDetail`, `components/Roles`,
  `components/Submissions` and `components/SubmissionDetail`. Styles are colocated in
  `index.scss` where needed and loaded centrally through `styles/cms-import.scss`
  from `app/cms/layout.tsx`. CMS styles are excluded from the root public/shared
  entry, `styles/import.scss`, so public routes do not download CMS component CSS.
  Components do not import SCSS directly. Both entries list each stylesheet with
  standard Sass `@use` statements and use Next.js's built-in Sass support. Add
  new component styles to the appropriate entry file.
  Password change reuses shared Forms styles.
  Account and role lists each own their Header, breadcrumbs, columns, row actions,
  controlled selection and Table composition, with page-specific row-action styles.
  They call `useCRUDPage` directly for query state, loading and deletion. There is
  no shared CRUD page wrapper.
- Reusable UI lives in `components/shared/{Brand,Breadcrumbs,CmsPageContent,Forms,Header,Pagination,Providers,
  Route,SearchInput,RecordAudit,Table}`. Styles are colocated as `index.scss` with
  their owning components. Shared CMS tokens, controls and layout utilities live
  with `Providers`; table primitives are shared with the role permission matrix.
- `components/shared/Brand` owns the CMS logo, title, subtitle and brand styles.
  Login and sidebar reuse it; `style` accepts React `CSSProperties` for custom
  root styling, `className` extends its root classes and `imageSize` controls the
  square logo size in pixels. Login supplies its larger logo and bottom padding;
  the sidebar owns the brand link to the first permitted module and its mobile spacing override.
- Sidebar configuration is `components/CmsSidebar/sidebar.ts` beside its
  rendering component, `CmsSidebar`; the public map sidebar is
  `components/SubmissionSidebar` (`SubmissionSidebar`).
- CMS API operation logic lives directly in native `route.ts` files under
  `app/api/cms/{auth,accounts,roles,submissions,dashboard,nopermission}`. Shared account selection,
  serialization and role validation live in `app/api/cms/accounts/_shared.ts`.
- Server-only session/auth configuration and HTTP utilities remain in
  `handlers/auth.ts` and `handlers/http.ts`. The shared request wrapper checks
  trusted origins for POST/PATCH and converts application errors to JSON.
- `components/ProtectedPage/index.tsx` owns the server-only `createProtectedPage`
  factory and cached session lookup. Each protected native `page.tsx` imports its
  content component and exports `createProtectedPage(Component, ROUTE_PATHS.KEY)`.
  Content components retain their client boundaries; shared providers and the shell
  remain in layouts. The factory validates the session and resolves permissions on
  the server before including authorized content. `components/shared/Route` only
  synchronizes the validated user into the store/sidebar and renders children or
  the existing localized forbidden UI.
- Permission constants, route mappings, query state and validation schemas live
  in `services/{permission,routes,query-state,schemas}.ts`.
- Each request module has `index.ts` for service functions and `types.ts` for its
  types: `services/cms/{accounts,roles,submissions,dashboard,auth}`, `services/future-message`,
  `services/submissions`, and `services/locale`. Types are imported directly from
  the module's `/types` path, separately from runtime functions.
- CMS UI imports named service functions instead of calling `cmsRequest`,
  `apiRequest` or `fetch` directly. Services own CMS API URLs, methods, ID encoding,
  payloads and response types; UI keeps forms, query state/invalidation, navigation
  and logout broadcasting. Login uses `apiRequest` inside its auth service so
  credential failures remain local form errors; protected operations use `cmsRequest`.
- All CMS service functions accept optional `ApiRequestOptions`.
  Pages adapt them to the CRUD hook's `listService`/`deleteService` shape. Shared
  list-query serialization lives in `services/query-state.ts`.
- Shared CMS transport/session-expiry handling lives in `services/shared/cms-api.ts`,
  cross-module CMS types in `services/shared/types.ts`, and Zustand session state
  in `store/cmsStore.ts`. Account/role record DTOs belong to their module's `types.ts`.

## Authentication and identity

- Username/password login; accounts contain username, display name, active status,
  password credentials, and multiple roles. Internal email identifiers satisfy
  Better Auth's schema; real email addresses are not collected.
- The username plugin disables `displayUsername`; account creation, updates and
  seeding store only `username` and the separate display name (`name`). Migration
  `20261104000000_remove_cms_display_username` drops the redundant column.
  Other Better Auth core user/session/account/verification fields remain in the
  schema for adapter compatibility, even when the CMS UI does not expose them.
- Initial username **admin**, password **worldofmoment**. Seeding reads the password
  from `CMS_INITIAL_ADMIN_PASSWORD`, hashes it, and never overwrites an existing
  account. No forced first-login password change.
- Seeded admin is excluded from account lists, search, pagination totals and
  account options. Ordinary detail, update, reset and batch-delete endpoints also
  reject this account with 404. It can change its own password while signed in.
- The protected system role grants `["*"]`. It cannot be edited, deleted, assigned
  to other accounts, or removed from the seeded account. System roles are excluded
  from role lists, search results and pagination totals.
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
  so client/router state from the previous session is discarded. Login destinations
  are explicit same-origin absolute URLs; no ESLint suppression is required.
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
- Dashboard has only `dashboard.show`; its role-matrix row has no create/update/delete actions.
  Ordinary roles are not automatically granted it; wildcard access includes it.
  Extra: `account.resetPasswordPermission`.
- Permission keys are defined in code, not created through the CMS. Roles assign
  catalog keys; account scopes combine all assigned roles without duplicates.
- Routes and APIs import the same `permissions.ACCOUNT_SHOW`,
  `permissions.ACCOUNT_CREATE`, etc. constants. No delegation hierarchy is applied
  to ordinary accounts in this version.
- `services/routes.ts` exports `ROUTE_PATHS` for all CMS page URLs, including login,
  and `ROUTES_PERMISSIONS` keyed by every protected path. It imports no page
  components. Native page files own URL matching and component selection; CMS
  navigation, breadcrumbs and redirects use the shared path constants.
- `CmsRoutePath` is derived from the path constants; `ProtectedCmsRoutePath`
  excludes login. The factory accepts only protected paths, and the permission map
  must cover all of them. Account list/detail share one rule object, as do roles.
  Dashboard requires `dashboard.show`. Profile, password change and General map to
  `undefined` (session-only access), subject to the no-page-access rule below.
- Every protected content component receives a computed `permission` prop:
  `{ show, create, update, delete, custom }`.
- `getCmsLandingPath` centralizes landing priority: Dashboard, Submissions, Accounts,
  then Roles, using each module's show permission. Login, authenticated login-page
  visits, the sidebar brand and `/cms` without Dashboard access use that destination.
  Other unauthorized module URLs retain the forbidden view.
- If none of those four show permissions is available (including action-only roles),
  all protected pages omit their content on the server and show
  "Contact your supervisor for permissions view" (localized in Vietnamese).
  The sidebar retains branding, identity and sign-out, with no page/map links or
  empty navigation groups. This also overrides General, Profile and password change.
- A configured `show` rule may reference any catalog permission. Lack of that
  permission renders the 403 UI. Missing `show` allows authenticated viewing;
  missing action mappings are false; `undefined` rules enable standard page actions.
- Wildcard scopes enable all standard actions and all route-declared extras.
  Otherwise extras are the intersection of scopes and route-declared custom keys.
- UI permissions disable unavailable controls; APIs independently authorize each
  action from the database. Account pages require `ACCOUNT_SHOW`, with create,
  update, delete, and reset guarded by their corresponding permissions.
- Sidebar configuration lives in `components/CmsSidebar/sidebar.ts`:
  `key`, translated `name`, optional `href`, `target`, `showRole`, `childRoutes`, and `items`.
  Missing `showRole` is visible; child routes preserve active highlighting.
  Map is a centered text link above the account row in the sidebar footer and
  links to the public map at `/` in a new tab using `target="_blank"` and
  `rel="noopener noreferrer"`. Selecting it also closes the mobile sidebar.
  Its label is localized in English and Vietnamese and requires no module permission.
  Management contains Submissions. System contains Accounts, Roles, General and
  Profile; General and Profile are available to signed-in users with at least one
  module show permission. Profile
  remains highlighted on its nested password-change page.

| Route | Purpose |
| --- | --- |
| `/cms/login` | Username/password login; redirects signed-in users to `/cms` |
| `/cms` | Dashboard (`dashboard.show`); otherwise first permitted module or no-access message |
| `/cms/submissions` | Submission list and bulk moderation |
| `/cms/submissions/detail` | Create without `id`; view/moderate with `?id=...` |
| `/cms/accounts` | Account list |
| `/cms/accounts/detail` | Create without `id`; view/update with `?id=...` |
| `/cms/roles` | Role list |
| `/cms/roles/detail` | Create without `id`; view/update with `?id=...` |
| `/cms/profile` | Read-only signed-in account username and display name |
| `/cms/profile/change-password` | Self-service password change, including seeded admin |
| `/cms/general` | General preferences; language selection for now |

## Dashboard

- `/cms` uses `DashboardPage` and `ROUTE_PATHS.DASHBOARD`; its title, breadcrumbs
  and sidebar entry use Dashboard in both English and Vietnamese. Vietnamese
  Dashboard copy uses “khoảnh khắc” for submissions.
- Summary merges moderation counts into five metrics: Total, Publicly visible,
  Needs inspection, Valid and Invalid. Its 7-day/30-day/all-time filter defaults to
  30 days and selects creation dates; counts use current moderation state.
  Compact summary cards reuse `BADGE_COLOR_CLASSES`: Total is neutral,
  Publicly visible/Valid green (success), Needs inspection amber (warning),
  and Invalid red (error), including the same background/border/text colors.
  Publicly visible means published + valid and overlaps with Valid. A tooltip
  explains the condition on hover, keyboard focus and touch/click.
- Publicly visible, Needs inspection, Valid and Invalid include compact arrow links with localized
  View submissions tooltips and accessible labels identifying the metric, only
  with `submission.show`. They open `/cms/submissions?validity=need-inspect`,
  `?validity=valid` or `?validity=invalid` at page 1. They apply no date
  filter because the submission list has none. No queue or quick-actions section.
  Publicly visible applies both `status=published` and `validity=valid`; its
  explanatory tooltip remains available beside the link with separate hit areas.
- Trend independently defaults to 30 days with an All time option. Thirty days
  uses daily counts; All time uses daily counts through 90 calendar days of
  history and monthly counts beyond that. Missing buckets are zero-filled,
  including the current partial day/month. Zero totals show a localized empty state.
  The shadcn/ui ChartContainer, ChartTooltip and Recharts line chart provide
  a smooth monotone curve, responsive axes, localized date/count tooltips and
  keyboard navigation. The expandable data table retains exact values. The shared chart primitive lives in
  `components/ui/chart.tsx`, uses the existing `cn` utility and Recharts v3, with
  chart height owned by Dashboard SCSS.
- Browser IANA time zone is sent to the API. Calendar windows include today and
  the preceding 6/29 days, including daylight-saving boundaries. Future-dated
  submissions are excluded. Filters reset on a fresh visit.
- GET `/api/cms/dashboard/summary?period=7d|30d|all&timeZone=...` returns
  `{ total, publiclyVisible, needsInspection, valid, invalid }`.
  GET `/api/cms/dashboard/trend?period=30d|all&timeZone=...` returns
  `{ interval: "day" | "month", points: [{ date: "YYYY-MM-DD", count }] }`.
  Both require `dashboard.show` independently of `submission.show`, use central
  Yup validation, private/no-store responses and parameterized PostgreSQL aggregates.
  Omitted periods default to 30d; timeZone is required. No schema migration.
- Named dashboard services accept `ApiRequestOptions`; separate TanStack Query
  keys include period and time zone. Sections load/fail/retry independently.

## Layout, forms, and localization

- SCSS class names start with a lowercase word (for example, `cms-shell`,
  `cms-sidebarFooter` and `mapView-wrapper`); JSX and imperative selectors use
  the same names.

- Persistent sidebar with logo and nested navigation. Its compact footer shows
  the display name and a destructive icon-only sign-out button on the same
  row, with a localized label and tooltip. The name fills the remaining row width
  in a muted, rounded background aligned with sign-out; long names truncate with
  the full name available on hover. System → Profile displays the signed-in
  account username and display name from the server-validated CMS identity. Its
  secondary Change password button links to `/cms/profile/change-password`. The
  password page has Profile → Change password breadcrumbs and a back button to
  Profile; the former `/cms/change-password` page is removed.
  Language selection lives on System → General and uses the existing locale
  service/cookie with immediate saving and refresh; errors are displayed inline.
  Mobile navigation uses a separate icon-only menu button to the left of the
  page Header, outside its bordered surface. Both share one sticky row, with the
  title and actions inside the Header. The mobile row has a compact 48px minimum
  height; the menu button stretches to match the Header, including when content
  wraps. The button opens a modal drawer
  sliding in from the left over a dimmed backdrop, without pushing page content.
  The drawer traps focus and locks background scrolling; Escape, backdrop click,
  the localized close button, or a navigation link closes it. Dismissal returns
  focus to the menu trigger. Switching to desktop closes the drawer and restores the
  persistent sidebar. Reduced-motion preferences disable the slide animation.
  Sidebar and sticky page Header use
  solid white surfaces, full borders and 12px corners. The viewport shell has 12px
  outer spacing/gaps on desktop and 8px on mobile, with independent main scrolling.
- CMS inputs, single selects and checkboxes use shadcn primitives. Account roles
  and extra permissions use the shared controlled `Select` with `multiple`,
  composed from shadcn Combobox chips with Base UI behavior: inline label search, removable tags,
  checked options, keyboard navigation and continued selection while open. Only
  existing options can be selected; form/service values remain `string[]`.
- `components/ui/badge.tsx` provides the shared shadcn-style `Badge`, retaining
  `variant`, `asChild`, native span props and icon children. Its optional `color`
  prop accepts Ant Design Tag names: `magenta`, `red`, `volcano`, `orange`, `gold`,
  `lime`, `green`, `cyan`, `blue`, `geekblue`, `purple`, plus `success`, `processing`,
  `error`, `default` and `warning`, or a custom CSS color such as `#108ee9`.
  Named colors use a subtle tinted background/border and readable text; custom
  CSS colors use a solid background and white text. Explicit `color` takes
  precedence over variant colors; `className` and `style` remain customizable.
  Page-owned Table column renderers use Badge for displayed enum/boolean fields:
  account active/inactive uses success/error; submission published/unpublished uses
  success/default; valid/invalid/need-inspect uses success/error/warning; and
  CMS/client source uses geekblue/cyan. Badge columns center both their headers
  and body cells. Labels retain their EN/VI translations.
  The shared Table does not infer enums or add domain-specific color rules.
- `components/ui/select.tsx` exports the shared controlled `Select` for both modes:
  omitted/false `multiple` uses `value: string`; `multiple={true}` or
  `multiple={{ allowClear: boolean }}` uses `value: string[]`. The object form
  enables multiple selection even when `allowClear` is false; true adds a clear-all
  control. `allowClear` defaults to true in both modes, so filters, account roles
  and extra permissions do not pass a redundant true prop. An explicit top-level
  value overrides the legacy multiple-object setting when supplied. Required
  page-size, language and submission-state selects use `allowClear={false}`.
  Single-select clearing calls `onValueChange("")`, restores the placeholder, and
  returns keyboard focus to the trigger; the clear button is separate from the
  trigger and hidden when empty or disabled. In both modes the clear icon replaces
  the down arrow while visible; clearing restores the arrow. Multiple clearing
  returns `[]`.
  `onValueChange` matches the value type.
  Callers supply `popupClassName` and optional localized `labels`
  (`empty`, `toggle`, `clear`, `remove`) without a separate CMS component/version.
  Generic defaults work outside the CMS and do not require its translation keys.
  Single-select values and placeholders stay left-aligned at fixed widths.
  Single and multiple dropdown option lists both use a 4px inner inset.
  Enabled select inputs/triggers/options and checkboxes use a pointer cursor;
  disabled inputs retain the not-allowed cursor.
  Custom form controls use React Hook Form controllers and receive explicit
  disabled state for read-only permissions, protected roles and submissions.
  Portaled options carry the CMS light theme, remain above the sticky header and
  escape table clipping. Public-map dark styles do not apply inside CMS surfaces.
- Selected-option chips use an inline, borderless remove button with balanced
  spacing and a visible keyboard-focus ring. Chip removal composes shared Button
  through `asChild`, preserving the primitive's styling slot and behavior.
- `components/ui/password-input.tsx` composes Input and Button with a local
  show/hide toggle. All CMS password fields (login, account creation/reset and
  self-service change) use it with localized EN/VI action labels. Inputs start
  masked; toggling preserves values, form registration, errors and autocomplete.
  The visibility control uses `tabIndex={-1}` so Tab moves between form fields
  without stopping on the icon. It remains clickable, never submits the form and
  follows explicit and inherited fieldset disabled state.
- Shared primitives live in `components/ui`; the Combobox also uses shadcn
  InputGroup/Textarea and the existing Button. Base UI is required for its behavior.
  CMS Create links, Save buttons (including password reset/change), Search and
  bulk-action Execute use the shared `Button` with `variant="primary"` (Execute
  switches to `variant="destructive"` when Delete is selected); Create
  composes its Next.js Link through `asChild` and preserves permission guards.
  Global/CMS link styles exclude Button links so their variant controls appearance.
  Public `GlassButton` explicitly uses the default variant so the shared Button's
  outline default does not add a solid border to its gradient glass edge.
  Other actions use outline/link/destructive variants and explicit form submit types/IDs.
  Menu, retry, bulk/pagination and logout controls
  also use `Button`; `.cms-button` styling is retained only for navigation links.
  Native button markup is confined to the shared primitive implementations.
- Each page owns its sticky Header: title left, action controls supplied through
  the optional `actions?: ReactNode` prop on the right (not JSX children). Its optional
  `onBack?: () => void` renders a localized, icon-only chevron button before the
  title; without `onBack`, no back control is rendered. Account/role detail pages
  supply callbacks to their list URLs, preserving current filters and pagination.
  A shared
  `CmsPageContent` follows and wraps breadcrumbs plus the table, detail form or
  overview; the permission-denied page uses it too. It is a normal block wrapper
  that owns outer padding and shares Header's responsive inline-padding token.
  Children own their vertical margins; the wrapper imposes no flex layout, gap
  or child-margin resets. Breadcrumbs own the margin before the page body.
  Page bodies do not add outer padding; form/table surfaces retain their internal
  control inset. Account/role detail and password-change forms fill the available
  content width through shared `.cms-form` styling, without page-specific width caps.
  Breadcrumbs accept `{ label, href? }[]`. Root pages begin with their own label,
  without an Overview prefix; detail pages begin with their parent list.
- Navigation uses Next.js Links, except the Header back callback button, which
  uses client routing. Submissions/mutations are buttons.
- CMS forms use React Hook Form and `yupResolver`, including search. All schemas
  live in `services/schemas.ts`; API payloads reuse relevant schemas. Errors are localized.
- Detail identity comes from the URL `id`. Forms hydrate once per identity and
  preserve dirty input during background refetches.
- Role detail matrix: Module, Show, Create, Update, Delete, Extra permissions /
  Quyền bổ sung. Default cells are checkboxes; extras are multiple selects.
  Extra-permission selects isolate intrinsic inline sizing so selecting/removing
  tags keeps column/control widths stable; tags wrap within the available width.
- The system role is read-only. Assigned roles cannot be deleted.
- Role options require only a valid CMS session, without `account.show` or
  `role.show`. The account form loads them through `getCmsRoleOptions` from the
  roles service; the option DTO is `{ id: string, name: string }`.
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

CMS loading states use the shared `LoadingDots` component for session hydration,
list/detail data, role options, sign-in, saving (including password reset) and bulk
actions. Standalone progress text is replaced with dots; localized accessible labels,
busy states and disabled controls remain available. CMS buttons pass
`loading={isSubmitting}` or `loading={executing}` to the shared `Button`; it owns
the dots, inherited text color, busy state and loading-time disabling. The original
button content stays visible with dots appended on its right, and callers may supply a
localized progress `aria-label`. The optional boolean `loading` prop defaults to
false and preserves `asChild` composition. Row-delete buttons track the initiating
record until deletion and list invalidation finish; other row controls retain their
disabled guards. Search and list-retry buttons track the
initiating action against the list query fetching state and clear that action when
the request settles or a URL change uses fresh cached data. Search debounce stays
active while results load. Detail-retry buttons use the detail/options query
fetching states. Sign-out loading is separate from locale changes, and failed
requests release their loading state.

## Table contract

`Table<T>` receives `datasource: T[]`, `columns`, string `rowKey`, pagination
metadata, search, `onSearch`, `onChangePage`, `onChangePageSize`, initial/background
loading, error/retry, and a navigation key for search synchronization. Optional
`extraTools?: ReactNode` is forwarded into SearchInput between its search input and
Search button. A bulk handler returning `false` preserves selection and action
after cancellation.

Optional `scroll?: TableScroll` follows Antd-style dimensions: `x` accepts a pixel
number, CSS width string (including `"max-content"`), or `true` for intrinsic width;
`y` accepts a pixel number or CSS max-height string. Horizontal scrolling keeps
the table at least as wide as its container. Vertical scrolling constrains only
the table viewport and keeps its header visible. Toolbar and pagination remain
outside the scrolling region. Omitting `scroll` preserves the existing layout.
Submissions opts into `scroll={{ x: "max-content" }}` so headers and values keep
their natural widths instead of wrapping into narrow columns.
Fixed columns use CSS `box-shadow` toward the scrolling content only while they cover
that content: leftward for fixed-right Actions, rightward for fixed-left selection.
Shadows disappear at their respective scroll edges and when there is no horizontal
overflow. Scroll and resize tracking also accounts for table/data width changes.
The scrolling table uses separate borders with zero spacing so cell shadows render.
Inset box shadows sit inside decorative, non-interactive wrappers bounded to each
cell's height. The wrappers clip the extended shadow corners so edges remain
straight without adding vertical scroll overflow. Only explicit `scroll.y`
constrains the table's height and enables intentional vertical scrolling.
The inner shadow is explicitly anchored at `left: 0` so column text alignment
cannot shift it outside its clipping wrapper, including centered Actions cells.

`components/shared/Pagination` exports the controlled `Pagination` component and
`PaginationProps`. It receives `pagination: PaginationMetadata`,
`onChangePage(page)` and `onChangePageSize(pageSize)`, plus optional `disabled`,
`pageSizes` (default 10/20/50/100) and `className`. It owns the total, previous/next
controls, current/total page display, page-size selector and colocated styles.
It uses the existing CMS translation provider and can render without `Table`.
Pagination has no loading indicators or request state; `disabled` blocks its
controls. `Table` delegates to it with `disabled={fetching}` and keeps its public
pagination props unchanged. Callers own fetching, URL updates and resetting to
page 1 after a page-size change.

- Basic Antd-style columns: `key`, `title`, optional `dataIndex`, `render(value,
  record, index)`, `width`, `align: "left" | "center" | "right"`, and
  `fixed: "right"`. Alignment applies to headers and body cells.
  CRUD Actions columns remain sticky and centered, with Eye (Details link) and
  Trash (Delete button) icons, localized tooltips and accessible labels. Delete
  retains its permission visibility, disabled states and confirmation behavior.
- Account and role pages each define their own localized Created at / Ngày tạo
  column immediately before Actions, displaying `HH:mm dd/MM/yyyy` (24-hour time,
  zero-padded day/month) in the browser time zone for every UI locale.
  Both pages use `formatDateTime` from `lib/utils.ts` for timestamp formatting.
  The shared Table does not add a creation-date column
  or require `createdAt` on its generic record type.
  Future CMS CRUD lists follow the same page-level column convention, as recorded
  in `AGENTS.md`.
- Optional controlled `selection: { selectedRowKeys: string[], onChange(keys,
  selectedRows), getCheckboxProp?(record): { disabled? } }`.
  When enabled, its header and row checkbox cells stay fixed to the left edge
  during horizontal scrolling, including when the table has a fixed header.
  Selected rows use the CMS secondary background across all cells, including
  fixed selection and Actions cells; deselecting restores the normal background.
- Optional `bulkAction: { action, label, disabled? }[]` and
  `onBulkAction(action, selectedRecords): void | Promise<void>`.
- Optional `onBulkDelete(selectedRowKeys): Promise<void>`; only its presence adds
  the built-in Delete / Xóa option. `delete` is reserved for that action.
  Delete uses red destructive text in the dropdown and selected value, and its
  Execute button uses the shared destructive variant. Select options support an
  optional `variant: "default" | "destructive"`, including keyboard focus states.
- Checkboxes and bulk select plus Do it / Thực thi appear only with `selection`.
  Disabled records are excluded from selection/execution. Disabled options cannot
  be selected or executed, even if their state changes after selection.
- Await bulk callbacks; prevent duplicate execution; clear selection after success,
  preserve it after failure. Pages reset controlled selection when query/page changes.
- Built-in delete calls only `onBulkDelete`; custom actions call only
  `onBulkAction`. Delete operations confirm the affected count before execution.

## API contract

- Prefix `/api/cms`, same-origin cookies, private/no-store application responses.
- Each endpoint exports only its supported methods with Node.js runtime and
  force-dynamic execution. Native Next.js routing returns 404 for unmatched URLs
  (including extra path suffixes) and 405 for unsupported endpoint methods.
  Static action endpoints take precedence over dynamic IDs. Next.js supplies
  HEAD from GET, retaining session/permission checks without requiring Origin,
  and OPTIONS with the endpoint's allowed methods.
- Each exported CMS HTTP method has an access comment immediately above it:
  `Login required - Permission: role.create`, using its actual permission key.
  Session-only methods use `Permission: none`; login uses
  `Login not required - Permission: none`. Automatic HEAD inherits GET's access
  requirements; framework-generated OPTIONS requires no session or permission.
- Auth: POST `/auth/login`, `/auth/logout`, `/auth/change-password`.
- Accounts: GET/POST `/accounts`, GET/PATCH `/accounts/:id`,
  POST `/accounts/:id/reset-password`.
- Roles: GET/POST `/roles`, GET/PATCH `/roles/:id`.
- Options: GET `/nopermission/options/:module`, supporting only `roles` initially.
  Requires a live CMS session without module permissions; returns non-system
  roles as `{ id, name }[]`, sorted by name. Unsupported modules return native
  404 after session validation. Responses are private/no-store. The old
  `/accounts/options` endpoint is removed without an alias and follows normal
  account-ID routing.
- POST `/accounts/bulk-delete` and `/roles/bulk-delete`: `{ ids: string[] }`.
  The same endpoint accepts `[id]` for single deletion. Batch checks/deletion are
  atomic; assigned-role or protected-record conflicts roll back the whole batch.
- Lists return `{ items, metadata: { page, pageSize, total, totalPages } }` using
  shared pagination types, 1-based pages, and stable created-at/ID ordering.
- Account and role record DTOs include `createdAt` as an ISO timestamp, including
  list, detail and create/update responses.
- Errors: `{ error: string, fieldErrors?: Record<string, string[]> }`. Values use
  CMS translation keys. 400 malformed JSON, 401 invalid session, 403 permission
  denial, 404 unavailable record, 409 conflict, 422 validation, 429 login throttle.
  Field errors map into React Hook Form; unexpected failures return a generic 500.
- Missing or hidden database records retain the JSON 404 envelope above.
  Framework-generated routing responses are exempt from the application JSON
  envelope and private/no-store header contract; their bodies may be non-JSON.
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

Deploy the application with `displayUsername` disabled and regenerate Prisma
before applying `20261104000000_remove_cms_display_username`. Older application
instances still write/read that column and must be restarted with the updated
code and generated client before the column is dropped.

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

- Compact summary cards: shared badge palette reuse, tighter spacing/type and an
  icon-only inspection link pass scoped ESLint/Stylelint fixes, TypeScript,
  repository lint and diff checks. Development-browser checks verify about 83px
  desktop cards, responsive 390px layout without overflow, matching preset colors,
  localized link label/filter URL and visible keyboard focus. Console warnings/
  errors are absent; temporary test records and the automation/blank window are removed.
- Dashboard chart/localization refinement: the official radix-nova shadcn chart
  primitive uses Recharts 3.8.0 and the existing `cn` helper. Vietnamese labels
  retain Dashboard and use Khoảnh khắc throughout Dashboard copy. Scoped
  ESLint/Stylelint auto-fixes, TypeScript, repository lint, locale-key/newline
  checks and the Webpack production build pass. Development-browser checks verify
  daily/monthly charts, independent filters, localized date/count tooltips,
  keyboard arrow navigation with a visible focus outline and desktop/390px layout
  without overflow or console warnings/errors. Temporary account/role/session
  records, credentials and the dedicated browser/blank window are removed.
- Dashboard and permission-aware landing: scoped ESLint/Stylelint auto-fixes,
  TypeScript, repository lint, route type generation, locale-key/newline checks,
  diff checks and the Webpack production build pass. PostgreSQL checks using
  rolled-back temporary tables cover all status/validity combinations, empty
  periods, local-midnight inclusion, future-date exclusion, DST transitions,
  missing buckets and the 90/91-day aggregation switch. Live development-browser
  checks cover 401/403 API guards, invalid-filter 422 responses, Dashboard-only,
  Submissions-only, Accounts-only, Roles-only, wildcard, action-only and zero-view
  access, landing redirects, empty navigation, no-access General/Profile/password views,
  EN/VI Dashboard labels, independent filters, the prefiltered inspection link,
  keyboard/touch tooltip access and desktop/390px layout without overflow.
  Simulated browser responses verify zero/empty presentation and independent
  trend failure/retry; a fresh Dashboard has no console warnings/errors. Temporary
  account/role/session/credential artifacts and the dedicated automation browser,
  including its blank window, are removed. Production is unchanged.
- Selected chips/password visibility: scoped ESLint fixes, TypeScript,
  repository lint, translation-key/newline and diff checks pass. Desktop/390px
  browser checks verify borderless chip removal without overlap, keyboard
  selection/removal/clear-all and focus return. Password visibility preserves
  values, input focus, registration/autocomplete, independent field state and
  localized validation/error association. The toggle is excluded from Tab order;
  fieldset disabling covers the input and its toggle. EN/VI labels and mobile
  overflow checks pass. No account or password changes were submitted.
- System → Profile: read-only username/display-name details reuse the validated
  CMS identity. Password change now lives at `/cms/profile/change-password` with
  Profile breadcrumbs/back navigation; the sidebar footer retains only identity
  and sign-out. Scoped ESLint/Stylelint fixes, route type generation, TypeScript,
  repository lint, translation-key/newline checks and diff checks pass. Stale
  generated types for the deleted password route were removed. Browser checks
  cover desktop/390px layout without horizontal overflow, EN/VI labels, button
  navigation, active Profile highlighting, back navigation and password-form
  validation. Both routes redirect anonymous visitors to login; the old route is
  404. Checked pages have no console warnings/errors. No passwords were changed.
- `displayUsername` cleanup: the username plugin disables the field, account
  creation/update and seeding no longer write it, and the Prisma column is
  removed. The migration is applied to the development database; a direct
  metadata query confirms the column is absent and `username`/`name` remain.
  Scoped ESLint fixes, repository lint, Prisma formatting/validation/client
  generation, TypeScript and diff checks pass. The development server was
  restarted with the regenerated client. Live HTTP checks cover account creation,
  username update, detail retrieval, login with the updated username and the
  existing administrator session. Temporary account/role records were removed;
  checked browser pages have no console warnings/errors. Production is unchanged.
- Native CMS page factory: scoped ESLint fixes, repository lint, TypeScript and
  the Webpack production build pass. The default Turbopack build is blocked here
  by font-download and worker-port restrictions. Temporary checks cover 30
  route/scope combinations, 401 redirects, unexpected-error propagation and
  compile-time rejection of login/unknown protected paths. Live development-browser
  checks cover all six screens, read-only/wildcard/empty scopes, forbidden content
  exclusion from server responses, store/sidebar updates during client navigation,
  detail/back search and page-size preservation, login/logout redirects and unknown
  route 404s. Temporary account, role, credentials and sessions are removed.
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
- Native CMS endpoint routing: operation logic is colocated in 11 route files;
  the catch-all router and three domain dispatcher modules are removed. Scoped
  ESLint fixes, repository lint, route type generation, typecheck and the Webpack
  production build pass. Stale generated development route types referencing the
  removed catch-all were cleared. Turbopack's build was blocked by an internal
  compiler port-binding restriction in the validation environment.
  All 168 production-mode HTTP/DB checks pass against the development database,
  covering native 404/405, HEAD/OPTIONS, static-route precedence, auth/cookies,
  permissions/origin checks, CRUD, validation, record JSON 404s, pagination,
  password changes/resets, session revocation, login throttling and atomic batch
  conflicts. Browser checks pass for login/logout, account and role lists/details,
  account role options and protected-route redirects, with no console errors or
  warnings. Temporary records, sessions, limiter rows and the server are removed;
  production data/deployment are unchanged.
- CMS services/options: the five CMS UI callers use named account, role and auth
  services instead of direct transport calls. Module options moved to
  `/api/cms/nopermission/options/roles` with session-only access; every CMS endpoint
  documents access immediately above each HTTP method. `AGENTS.md` records
  the service boundary. Account-detail route permissions now match the documented
  account permissions and include the password-reset action.
  Scoped ESLint fixes, repository lint, route type generation, typecheck and the
  Webpack production build pass. All 94 temporary service/HTTP/DB checks pass,
  covering request encoding, payloads, cancellation, cookies, login-error/session
  handling, options access without module scopes, minimal DTOs, native routing
  errors and HEAD/OPTIONS. Production-mode browser checks cover account/role
  create/edit, role options, password change/reset and login with the new passwords,
  local credential errors, logout, revoked-session redirects, and read-only
  account details without role permissions. The checked successful flows have
  no console errors or warnings. Temporary fixtures and the server are removed;
  production data/deployment are unchanged.

- Modern CMS controls and inset shell: shadcn Input, Select and Checkbox replace
  native CMS controls; the shared Base UI Combobox adapter provides searchable
  multiple selection with wrapping/removable tags and continued selection after
  search. Sidebar/Header have 12px corners and 12px desktop / 8px mobile shell gaps.
  Scoped ESLint/Stylelint fixes (including CSS), typecheck, repository lint and the
  Webpack production build pass. CMS locales have matching 102-key sets and no
  trailing newline. Development-browser checks cover account creation and role
  persistence, extra-permission add/remove without changing other permissions,
  inline search/empty results, keyboard selection/Backspace/Escape, validation
  focus/error association, read-only accounts, the protected system role, locale
  switching with dirty input preserved, search, bulk deletion and page-size reload
  restoration. Geometry/screenshots cover 1440px, 820px and 390px views: tags wrap,
  tables scroll horizontally without page overflow, and the inset Header remains
  sticky with mobile navigation expanded. Popups remain light under an inherited
  dark class, appear above the Header and respect reduced motion. Checked CMS flows
  have no console errors or warnings. The public-map render smoke check passes;
  Chrome reports a WebGL buffer performance warning. Temporary account/role records
  and isolated browser tabs are removed. Production data/deployment are unchanged.

- Shared page content: `CmsPageContent` wraps breadcrumbs and page bodies across
  overview, CRUD lists, account/role details, password change and the 403 view.
  Outer padding/gaps/bottom spacing belong to this component; Header reads the
  same responsive inline-padding token. Old `.cms-content`, breadcrumb padding,
  overview top padding and main bottom padding are removed. Scoped ESLint/Stylelint
  fixes, typecheck, repository lint and the Webpack production build pass.
  Browser geometry verifies matching Header/content padding (32px desktop, 16px
  mobile), aligned breadcrumb/form edges and no page overflow. At 390px, overview,
  account list, role detail and password change each render one shared wrapper.

- Unified Select: single and multiple selection share `components/ui/select.tsx`;
  the old CMS controls module is removed and every CMS caller imports `Select`
  directly. Multiple mode supports boolean and `{ allowClear }` configuration;
  clear-all is keyboard reachable and updates the controlled array/form value.
  CMS theme classes and localized labels are supplied at usage, with generic
  English defaults for other consumers. CMS locales have matching 103-key sets
  and retain no trailing newline. Scoped ESLint/Stylelint fixes, typecheck,
  repository lint and the Webpack production build pass. Browser checks cover
  single selection, boolean/object multiple modes (including allowClear false),
  search/empty results, continued selection, tag removal, keyboard clear-all,
  disabled controls, and operation outside the CMS without CMS translation keys.
  Account-form clear-all triggers the existing required-role error and focuses
  the field; 390px controls have no page overflow. CMS page-size selection and
  protected-role rendering pass. The temporary validation route and role are
  removed; no account records were created.

- Shared Button adoption: all native button JSX in CMS pages/shared controls,
  map attribution/guidelines/retry and the global fallback now uses `Button`.
  Existing GlassButton consumers already compose this primitive. CMS actions use
  outline/link variants; obsolete native-button styling is removed. Public custom
  styles preserve attribution/guideline geometry, transparency and icon sizes.
  Scoped ESLint/Stylelint fixes, typecheck, repository lint and the Webpack
  production build pass. Browser checks cover external-form header submit and
  validation, account creation, reset-dialog validation/cancel, search/deletion,
  disabled pagination/bulk controls, mobile overflow and attribution/guideline
  open/close with focus restoration. A temporary client-mounted global-fallback
  harness verifies keyboard retry even with stylesheets disabled. Temporary
  account/role records, the harness route and extra browser tabs are removed.

- API-button loading audit: scoped ESLint fixes, typecheck and diff checks pass.
  Temporary component checks with mocked HTTP responses cover account/role row
  deletion failures, successful deletion through list invalidation, search, stale
  and fresh-cache pagination, retry recovery, and sign-out failure recovery. No CMS
  data or sessions were changed by these checks. Live search HTTP requests succeed;
  transient loading visuals and real mutation flows were not fully browser-verified.

- Reusable pagination: the shared controlled component owns its styles and
  exposes page/page-size callbacks. Table uses it without pagination loading dots.
  Scoped ESLint/Stylelint fixes, typecheck, Sass compilation and diff checks pass.
  Temporary component checks cover standalone callbacks, page-size changes, empty
  and boundary pages, disabled controls, custom sizes/classes, EN/VI labels and
  Table composition while fetching. Desktop Accounts rendering is checked.

- Compact sidebar and General preferences: scoped ESLint/Stylelint fixes,
  repository lint, route type generation and TypeScript checks pass. Browser
  verification covers the same-row secondary password link/destructive sign-out
  icon, localized tooltip, display-name-only identity, and System → General
  navigation. English/Vietnamese language changes persist across reloads.
  At 1440px and 390px, the footer stays on one row without horizontal overflow;
  mobile password navigation closes the sidebar. Account/role list and detail
  breadcrumbs and password-change breadcrumbs omit the Overview prefix.
  Sign-out returns to login, and the checked pages have no console warnings/errors.

## Submission administration and record audit fields

- The Coordinates column uses a centered map-pin icon link with a localized
  tooltip and accessible label. It opens `/?thought=<id>&lat=<lat>&lng=<lng>` in
  a new tab. Once map layers and the loading screen are ready, the map reuses
  history's Take me there action to move to the coordinates and open the thought.
  Opening a thought from any entry point writes its ID and loaded coordinates to
  `thought`, `lat` and `lng` in the current history entry, so its URL can be shared
  or refreshed. Other query parameters and the hash are preserved.
  Closing the thought modal removes `thought`, `lat` and `lng` from the current
  history entry, preserving other query parameters and the hash so refreshing
  does not reopen the dismissed thought.
  Invalid or missing link coordinates are ignored. Public visibility checks still
  apply: a CMS session does not grant public access to hidden thoughts.
- Management → Submissions uses `/cms/submissions` and `/cms/submissions/detail`.
  Accounts and Roles retain their URLs under System. Lists own their Table, columns,
  actions and selection and reuse `useCRUDPage`. Submission status/validity filters
  have visible localized labels associated with their selects, apply immediately,
  persist in the URL, and reset the page. Labeled filters align their controls with
  Search and wrap on mobile. Search keeps its existing
  debounce/manual-submit behavior. Empty filter values mean all states and show
  the localized “All” placeholder. Dropdown options contain only real states;
  each filter inherits default clearing to remove its URL parameter and reset page 1.
- Submission permissions are `submission.show`, `submission.create`,
  `submission.delete`, `submission.updateSubmissionStatus` and
  `submission.updateSubmissionValidity`. There is no `submission.update`; its
  permission-matrix Update cell is unavailable. The two moderation permissions are
  independent extras, enforced by UI and APIs. Existing submission description,
  coordinates, UUID, weather and provenance are read-only in the CMS.
- Existing submissions migrate to `published` + `valid`. New public and CMS records
  default to `published` + `need-inspect`. Other states are `unpublished` and
  `invalid`; wire values use the hyphenated `need-inspect` spelling. Public create
  and author-edit payloads cannot set moderation or provenance. Public author edits
  preserve the current moderation state.
- CMS creation accepts description, coordinates and initial state. Choosing a
  non-default status or validity requires the matching moderation permission.
  The server generates a normal random UUID; the UI shows “Auto generated” before
  creation and the actual read-only UUID afterward. Creation fetches weather.
  Creation and detail forms show UUID first, latitude/longitude side by side on
  the second row, and description third. Creator/source, weather and audit metadata
  live in a subtle bordered inner card with plain labels/values, without input or
  textarea controls. Weather shows its numeric code and a translated
  description from the same `weather` message namespace as the public map,
  including code 0; unknown/missing codes fall back to the stored summary or “—”.
  The CMS layout merges only that public weather namespace into its own catalog.
  Weather descriptions wrap naturally as text on narrow screens, and audit
  separators use the shared border color.
- CMS submission services own list/create/detail/moderation and bulk endpoints.
  GET/POST `/api/cms/submissions`, GET/PATCH `/api/cms/submissions/[id]`, POST
  `/api/cms/submissions/bulk-moderate` and POST `/api/cms/submissions/bulk-delete`
  use existing session, trusted-origin and pagination contracts. List filters are
  `search`, `status`, `validity`, `page`, and `pageSize`.
- Bulk moderation accepts deduplicated `ids` and exactly one `status` or `validity`.
  Bulk moderation/deletion are atomic and reject missing IDs. Single moderation
  accepts either or both state fields and rejects content/audit fields.
- Any CMS create/moderation resulting in published non-valid content requires
  `confirmPublish: true`. Otherwise the API returns 409 `errors.confirmPublish`
  with `details.nonValidCount`. The UI confirms the current affected count and
  retries the same mutation; cancellation preserves input/selection. Current rows
  are checked in a serializable transaction for moderation. Publishing preserves
  validity and does not make non-valid content visible to other visitors.
- Submission `createdBy` is `client` or a snapshot of the authenticated CMS account's
  display name; `createdFrom` is `client` or `cms`. These fields are immutable and
  derived server-side. Existing submissions backfill `client` for both.
- Submissions, roles and CMS user accounts expose ISO `updatedAt` and nullable
  `updatedBy` in CMS DTOs. Existing timestamps are preserved; old updater names are
  unknown (`null`). New authenticated records initialize `updatedBy` to their
  creator; new public submissions use `client`. Bootstrap records without an
  authenticated actor retain null. Account-name snapshots survive later renames
  and deletions and never serve as authorization identity.
- Successful public author edits and CMS submission moderation stamp their actor;
  bulk moderation stamps every affected row. Role/account updates, account role
  assignments, password resets and self-service password changes stamp the same
  transaction. Login/session activity does not stamp record edits. Failed/cancelled
  mutations do not change audit fields. The existing submission `updated_at` column
  is serialized as `updatedAt` for CMS consumers; public field names are retained.
- Lists and details show update time/updater. Created at stays second last before
  centered Actions; both timestamps use `formatDateTime` in browser time zone.
  On mobile, search inputs with extra tools fill a row so filters cannot squeeze
  the text field.
- Migration `20261104000100_submission_moderation_audit` adds the enum/provenance/audit
  fields, backfills old submission validity before setting the new default, and
  preserves timestamps. Apply the additive migration before deploying this code,
  regenerate Prisma, and restart existing application processes. Production
  migration/deployment is an explicit operation.

### Public visibility and private history

- Viewport pins and direct thought-detail reads use the same server-side predicate:
  published + valid for everyone; published + any validity for the matching local
  author UUID. Unpublished records are excluded for everyone and return 404 on
  direct detail access. CMS session identity never changes public ownership.
- Public browsing sends an existing UUID through `x-author-uuid` without creating
  one. Missing/malformed headers act as anonymous visitors. Personalized GETs use
  private/no-store caching and vary on Accept-Encoding and x-author-uuid while
  retaining Brotli/gzip compression, viewport bounds and date-line handling.
- Public DTOs omit creator/updater names, author UUID and exact timestamps.
  Owner history retains all states and exact creation time, includes status, and
  disables Take me there for unpublished records with a localized explanation.
- UUID changes cancel obsolete viewport/detail requests and reload positions without
  recreating the map. There is no new realtime polling; normal viewport/submission
  refresh behavior remains in effect.


### Submission and audit validation

- The additive moderation/audit migration is applied to the development database;
  all 215 pre-existing submissions were verified as published + valid. Production
  has not been migrated or deployed. Prisma validation/generation, changed-file
  ESLint/Stylelint fixes, route type generation, TypeScript, repository lint and the
  Webpack production build pass.
- All 130 temporary production-mode HTTP/database checks pass: public visibility
  for six state combinations and four viewer identities, private caching, safe
  DTOs, owner history, defaults/provenance, generated UUIDs, independent moderation
  permissions, create overrides, immutable CMS content, publication acknowledgment,
  atomic bulk failures, and role/account/password audit updates.
- Browser checks cover desktop and 390px EN/VI pages, filter placement and URL
  restoration, read-only details, generated-UUID labeling, correct select hydration,
  status-only/validity-only/create-only permissions, bulk warning counts,
  cancellation preserving selection, confirmed publication and list invalidation.
  The submission row in role permissions has no Update checkbox and exposes its
  two custom permissions. CMS pages have no observed console warnings/errors.
- Public-browser checks verify UUID-triggered viewport refresh with the author
  header and private compressed responses, unpublished history navigation being
  disabled, and an owner's published invalid thought opening from history. The
  map retains its existing Chrome WebGL buffer performance warning.
- Temporary records/scripts, test-server processes and automation browser surfaces
  are removed after validation. The development server is restarted on port 3000
  with the regenerated Prisma client.

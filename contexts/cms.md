# CMS — World of Moments

This is the maintained CMS specification and implementation reference. Read it
before changing CMS behavior and update the affected contracts/status in the same
task. Client accounts use a separate cookie-session configuration; see `contexts/client-auth.md`.

## Scope and architecture

- Internal CMS only: `/cms` and `/api/cms`.
- Next.js App Router, Better Auth hosted in Next.js, Neon PostgreSQL through the
  existing Prisma client, TanStack Query, Zustand, React Hook Form and Yup.
- Modules: submissions, client users, CMS accounts and roles. Exports are deferred.
  Public registration belongs to separate client auth; CMS has no public signup or email recovery.
- Use a restrained, readable interface with shared spacing, controls and subtle
  transitions. No glass dashboard styling or decorative statistics panels.
- CMS uses compact default sizing at all desktop widths: 13px base text,
  a 60px header, 34px form controls, 18px form padding and 10px by 12px
  table-cell padding. Desktop navigation is 14rem wide; shell panels sit 8px from the screen edges; mobile
  navigation keeps its existing accessible toggle sizing.

## Code organization

- Page components live in `components/AccountDetail`, `components/Accounts`,
  `components/ChangePassword`, `components/General`, `components/Login`,
  `components/Dashboard`, `components/Profile`, `components/RoleDetail`, `components/Roles`,
  `components/Submissions`, `components/ClientUsers`, `components/ClientUserDetail` and `components/SubmissionDetail`. Styles are colocated in
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
- `components/ui/modal` is the CMS-only controlled convenience wrapper around
  the shared `Dialog`. Its portaled content always carries `cms-popup`, applying
  the CMS system font, light-theme tokens and reduced-motion rules outside the
  CMS layout container. Callers do not need to add the theme class themselves.
  Modal styles are loaded only through `styles/cms-import.scss`. Public client
  surfaces compose `components/ui/dialog` directly.
  `Modal.useModal()` (also exported as `useModal`) returns `[modal, contextHolder]`.
  Render the holder inside the providers whose context the content needs.
  `modal.confirm`, `info`, `success`, `error` and `warning` accept Modal options
  with `content` instead of `children`; confirmation has Cancel/OK, other types
  have OK only. Each result supports `update(partialOrUpdater)`, `destroy()` and
  `await`: OK resolves true; Cancel, dismissal, destruction or hook-owner unmount
  resolves false. `destroyAll()` affects only that hook's dialogs. Async `onOk`
  and `onCancel` receive a close function; while a returned Promise is pending,
  default actions and user dismissal are blocked. Resolution closes; rejection
  keeps the dialog open and calls optional `onError`, which owns error
  presentation. A callback that accepts `close` and returns no Promise owns
  closing explicitly; a callback without arguments closes automatically.
  Imperative dialogs default to no close icon or backdrop dismissal, with Escape
  enabled and OK focused. Titles/icons and button labels are customizable;
  callers supply localized text (generic defaults are English). Closed entries
  remain through Dialog's exit animation and are then removed.
  Shared dialog positioning/zoom excludes Sheets through a zero-specificity
  `:where()` condition, so custom panels such as public HistoryPanel retain their
  own positioning and slide/reduced-motion rules regardless of stylesheet order.
  Animation origin detection is entirely internal to Modal/Dialog. Openings during
  mouse activation use that click's viewport coordinates; keyboard and independent
  programmatic openings use the center. Deferred timer/API openings use the center
  without inheriting a recent unrelated click. `useModal` snapshots its detected
  origin at the method call, so delayed rendering does not change it. That origin
  remains fixed through updates and closing. Consumers pass no origin helpers,
  coordinates, form metadata or extra bulk-action arguments.
  Isolated Chrome checks verify ordinary Modal/useModal calls, slow click handlers
  and rendering, mouse/keyboard/programmatic activation, deferred API openings,
  origin retention through updates/closing and reduced motion.
  CMS row deletes, built-in Table bulk deletion and non-valid publication warnings
  use `useModal` confirmations with localized action titles and OK/Cancel labels;
  delete confirmations use the destructive OK variant. No native `window.confirm`
  prompts remain. Page/query navigation cancels outstanding confirmations.
  Row-delete prompts suppress duplicate openings. Table captures the selected
  IDs/rows and action before awaiting a confirmation, blocks duplicate execution,
  and preserves selection/action on cancellation or failure. Publication warnings
  use the loaded rows and pending state changes to confirm before the first
  mutation, sending `confirmPublish: true` only after explicit confirmation.
  The server's 409/count contract remains a fallback for stale client data;
  cancellation preserves form values/selection.
  The migration passes scoped ESLint, TypeScript and isolated Chrome checks with
  mocked CMS services: row/bulk cancel and success, failure recovery, permission
  guards, EN/VI labels, navigation cancellation, publication retry and detail-form
  preservation. These checks do not mutate real records or verify live backend writes.

  ```tsx
  const [modal, contextHolder] = Modal.useModal();

  const confirmDelete = async () => {
    const confirmed = await modal.confirm({
      title: t("common.delete"),
      content: t("common.confirmDelete", { count: 1 }),
      okText: t("common.delete"),
      cancelText: t("common.cancel"),
      okButtonProps: { variant: "destructive" },
    });
    if (confirmed) deleteRecord();
  };

  return (
    <>
      <Button onClick={confirmDelete}>{t("common.delete")}</Button>
      {contextHolder}
    </>
  );
  ```
- `components/shared/Brand` owns the CMS logo, title, subtitle and brand styles.
  Login and sidebar reuse it; `style` accepts React `CSSProperties` for custom
  root styling, `className` extends its root classes and `imageSize` controls the
  square logo size in pixels. Login supplies its larger logo and bottom padding;
  the sidebar owns the brand link to the first permitted module. When collapsed,
  its logo stays centered above a divider while the brand title hides; the expand
  control remains available in the footer.
- Sidebar configuration is `components/CmsSidebar/sidebar.ts` beside its
  rendering component, `CmsSidebar`. The shell composes shadcn's Radix Nova
  `components/ui/sidebar.tsx` (provider, responsive panel, groups and menu buttons),
  `components/ui/sheet.tsx` and `hooks/use-mobile.ts`. Only used primitives are kept.
  Sheet composes the shared Dialog for focus/scroll management; Dialog's centered
  zoom geometry excludes Sheet content so its own slide animation can run.
  The public map sidebar is
  `components/SubmissionSidebar` (`SubmissionSidebar`).
- CMS API operation logic lives directly in native `route.ts` files under
  `app/api/cms/{auth,accounts,roles,submissions,client-users,dashboard,nopermission}`. Shared account
  selection/serialization/role validation, submission serialization/moderation helpers
  and dashboard calendar SQL live in the server-only `app/api/_shared.ts`.
- Server-only session/auth configuration and HTTP utilities live in the private, non-routable
  `app/api/_handlers/` folder (`auth.ts`, `http.ts`, and client-auth equivalents).
  Every handler keeps its `server-only` import. The shared request wrapper checks
  trusted origins for POST/PATCH and converts application errors to JSON.
- `components/ProtectedPage/index.tsx` owns the server-only `createProtectedPage`
  factory and cached session lookup. Each protected native `page.tsx` imports its
  content component and exports `createProtectedPage(Component, ROUTE_PATHS.KEY)`.
  Content components retain their client boundaries; shared providers and the shell
  remain in layouts. The factory validates the session and resolves permissions on
  the server before including authorized content. `components/shared/Route` only
  synchronizes the validated user into the store/sidebar and renders children or
  the existing localized forbidden UI.
- Fixed service values live in `services/constant.ts`: submission states/defaults,
  dashboard periods, pagination sizes, route paths, error codes/events and the
  submission-history query key. Consumers import these
  directly. Permission catalogs, module definitions and route permission/landing
  policies live with permission helpers/types in `services/permission.ts`.
  Landing-route helpers/types, query state and validation schemas remain in
  `services/{routes,query-state,schemas}.ts`.
  The constants module is dependency-free and stays safe for client consumers;
  server-only API helpers stay in `app/api/_shared.ts`.
- Shared API constants live in `app/api/constant.ts`. Client statuses, limits, query
  keys and session events live in `app/api/client/constant.ts`. Both plain data modules
  are imported by frontend and backend code; they must not import server-only handlers
  or contain secrets.
- Each request module has `index.ts` for service functions and `types.ts` for its
  types: `services/cms/{accounts,roles,submissions,client-users,dashboard,auth}`,
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
- All CMS identity, account CRUD and role-assignment paths enforce `kind: cms`.
  Public client registration creates no roles and cannot enter the CMS.
- The database session is the authority. APIs check the live session, expiry,
  account status and current role permissions.
- Better Auth session cookie: HttpOnly, SameSite=Lax, Secure in production,
  seven-day absolute expiry, no sliding refresh or cookie session cache.
- Login returns `{ user: { id, username, name, scopes } }` and the HttpOnly session
  cookie. Client state contains no authentication credential or JWT. There is no
  JWT plugin, decoding, token-expiry timer, or refresh endpoint.
- `CmsSession` creates a provider-scoped vanilla Zustand store from the
  server-validated user. `useCmsStore` selects from that context; no module-level
  user store is shared between SSR requests. Identity and permitted navigation are
  available on the first server/client render, without a ready/loading gate or
  mount-time identity copy. State remains in memory, never LocalStorage.
  Server-side session validation precedes protected page rendering and reloads.
  Each protected page uses its server-validated user for permission checks and
  synchronizes later navigation/refresh identity updates through the scoped store.
  API checks always use current DB permissions.
- Session events live inside `CmsSession`: session-expiry events clear its store
  and the query cache, and cross-tab logout clears both before full-document
  navigation to login. Transport helpers dispatch the event without accessing a
  global user store. Login clears the query cache; protected navigation initializes
  a fresh store from the server identity rather than the login response.
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

- Unmatched public and `/cms` URLs share the root `app/not-found.tsx` view,
  outside the authenticated CMS shell. The localized 404 uses
  `components/shared/MapLoading` as its cloud background and offers only a return
  to the public map at `/`. No session is required to view the 404. The shared
  background owns its styles and has no map-store dependency: only MapView passes
  `isExiting` to fade it before unmounting; 404 and error views stay visible.
  Clouds are clipped by the background; only its content layer can scroll on
  short screens, so cloud scaling does not create scrollbars.
- `services/permission.ts` exports `permissions`, `permissionModules`,
  `checkPermission(scopes, permission)`, permission-object resolution and permission
  types. It also owns `ROUTES_PERMISSIONS` and `CMS_LANDING_ROUTES`.
- Defaults: `account.show/create/update/delete` and `role.show/create/update/delete`.
- Dashboard has only `dashboard.show`; its role-matrix row has no create/update/delete actions.
  Ordinary roles are not automatically granted it; wildcard access includes it.
  Extra: `account.resetPasswordPermission`.
- Permission keys are defined in code, not created through the CMS. Roles assign
  catalog keys; account scopes combine all assigned roles without duplicates.
- Routes and APIs import the same `permissions.ACCOUNT_SHOW`,
  `permissions.ACCOUNT_CREATE`, etc. constants. No delegation hierarchy is applied
  to ordinary accounts in this version.
- `services/constant.ts` exports `ROUTE_PATHS` for all CMS page URLs, including login,
  while `services/permission.ts` exports `ROUTES_PERMISSIONS` keyed by every protected
  path. Neither module imports page components. Native page files own URL
  matching and component selection; CMS
  navigation, breadcrumbs and redirects use the shared path constants.
- `CmsRoutePath` is derived from the path constants; `ProtectedCmsRoutePath`
  excludes login. The factory accepts only protected paths, and the permission map
  must cover all of them. Account list/detail share one rule object, as do roles.
  Dashboard requires `dashboard.show`. Profile, password change and General map to
  `undefined` (session-only access), subject to the no-page-access rule below.
- Every protected content component receives a computed `permission` prop:
  `{ show, create, update, delete, custom }`.
- `getCmsLandingPath` centralizes landing priority: Dashboard, Submissions, Client users,
  Accounts, then Roles, using each module's show permission. Login, authenticated login-page
  visits, the sidebar brand and `/cms` without Dashboard access use that destination.
  Other unauthorized module URLs retain the forbidden view.
- If none of those five show permissions is available (including action-only roles),
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
  `key`, translated `name`, optional Lucide `icon`, `href`, `target`, `showRole`,
  `childRoutes`, and `items`.
  Missing `showRole` is visible; child routes preserve active highlighting.
  Map is a left-aligned icon/text link beside the desktop collapse control, above
  the account row in the sidebar footer. It links to the public map at `/` in a
  new tab using `target="_blank"` and
  `rel="noopener noreferrer"`. Selecting it also closes the mobile sidebar.
  Its label is localized in English and Vietnamese and requires no module permission.
  Management contains Submissions and Client users. System contains Accounts, Roles, General and
  Profile; General and Profile are available to signed-in users with at least one
  module show permission. Profile
  remains highlighted on its nested password-change page.

| Route | Purpose |
| --- | --- |
| `/cms/login` | Username/password login; redirects signed-in users to `/cms` |
| `/cms` | Dashboard (`dashboard.show`); otherwise first permitted module or no-access message |
| `/cms/submissions` | Submission list and bulk moderation |
| `/cms/submissions/detail` | Create without `id`; view/moderate with `?id=...` |
| `/cms/client-users` | Client account list, status filter and email search |
| `/cms/client-users/detail` | Create without id; information/status with id |
| `/cms/accounts` | CMS account list |
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
  Omitted periods default to 30d; timeZone is required.
- `Submission.created_at` has a B-tree index declared in Prisma for creation-date ranges and earliest-date lookup.
- Named dashboard services accept `ApiRequestOptions`; separate TanStack Query
  keys include period and time zone. Sections load/fail/retry independently.

## Layout, forms, and localization

- SCSS class names start with a lowercase word (for example, `cms-shell`,
  `cms-sidebarAccount` and `mapView-wrapper`); JSX and imperative selectors use
  the same names.

- Responsive shadcn Sidebar with logo and grouped navigation. Its compact footer shows
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
  The desktop SidebarTrigger sits in the footer, to the right of the left-aligned
  Map link. Its shared Tooltip shows the localized collapse/expand label on hover
  and keyboard focus in both states. When collapsed, the footer stacks Map, expand
  and sign-out vertically in that order. The brand logo stays centered at the top,
  separated from navigation by a divider. Every rail button and its icon share the
  horizontal center of the sidebar panel, including navigation and footer controls.
  Page Header back arrows retain their original navigation behavior.
  A separate Header trigger appears only on mobile to open the Sheet.
  Desktop navigation collapses to an icon rail with localized link tooltips;
  brand title and display-name text hide while the logo, map and sign-out remain
  available.
  Group labels hide in the rail and ignore pointer events so their negative-margin
  layout cannot cover preceding navigation buttons. Empty and unauthorized groups
  are omitted.
  Collapse state stays in the mounted shell's memory, independently of mobile state.
  Cmd/Ctrl+B toggles the sidebar. Labels reflect open/closed state in EN/VI.
  At widths up to 760px the Header trigger opens a left Sheet over a dimmed backdrop.
  The Sheet traps focus and locks background scrolling; Escape, backdrop click,
  the localized close button, or a navigation link closes it and restores focus
  to the Header trigger. Switching to desktop closes the Sheet, clears scroll
  locking and retains the desktop collapse state. Reduced motion disables animations.
  Sidebar and sticky page Header retain solid white surfaces, borders and 12px
  corners. The shell uses 10px outer spacing/gaps on desktop and 8px on mobile,
  with independent main scrolling and a scrollable sidebar navigation region.
  Local Chrome checks with temporary fixture users verify expanded/icon layouts,
  active nested routes, permission filtering, EN/VI controls, the 760/761px boundary,
  390px drawer width, focus trapping/restoration, navigation dismissal, desktop
  scroll-lock cleanup, reduced motion and ordinary Modal centering. These checks
  cover the rendered shell, not authenticated backend operations; the temporary
  preview route is removed after verification. Follow-up checks verify the footer
  Map/toggle row, stacked rail actions and centered button/icon geometry, restored
  back callback and the separate mobile opener with focus restoration. Regression
  hit-tests cover the center and all four corners of every collapsed navigation
  link; native hover verifies Dashboard highlighting and its tooltip.
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
- Each page owns its sticky Header: title and optional back arrow left, action
  controls supplied through `actions?: ReactNode` on the right (not JSX children).
  `onBack?: () => void` renders the localized back arrow. Account/role/submission
  details preserve list filters and pagination in their back callbacks; password
  change returns to Profile. Breadcrumbs retain the same parent destinations.
  A separate mobile-only menu trigger opens the sidebar without replacing back.
  Header uses shallow memoization, with independently memoized toggle and title/back
  sections. Fresh action JSX can rerender the outer Header while unchanged static
  sections are skipped; action nodes, styles and back callbacks remain identity-sensitive.
  Locale and sidebar state changes refresh the toggle through context subscriptions.
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
  Breadcrumbs compares the navigation label and ordered item labels/hrefs, so a
  fresh inline array with equal values skips rendering. Labels, links, order,
  length and current-page semantics still update when values change. Inputs are
  treated as immutable. Isolated Chrome checks with mocked services verify these
  render skips, latest Header action callbacks, loading/disabled states,
  localization and menu-dialog interaction without consumer changes.
- Navigation uses Next.js Links, including parent breadcrumbs; the Header back
  callback uses client routing. Submissions, mutations and sidebar toggles are buttons.
- CMS forms use React Hook Form and `yupResolver`, including search. All schemas
  live in `services/schemas.ts`; API payloads reuse relevant schemas. Errors are localized.
  Field markup uses shadcn's current `components/ui/field.tsx` primitives
  (`Field`, `FieldLabel`, `FieldError`) directly, with native `<form>` elements,
  registered native inputs and controllers for selects/checkboxes. The older
  custom `components/shared/Forms` Field renderer is removed; that module only
  contains CMS error translation, server-error mapping and request notices.
  `getCmsFieldErrors` collects root and nested array errors for the shadcn
  `FieldError` errors prop, which removes repeated messages before rendering.
  Labels target control IDs; rendered localized field errors have stable IDs
  referenced by `aria-describedby`, and invalid state is set on both the field
  and control. The active-account checkbox also renders server validation errors.
  Required text, coordinate and selection fields use `FieldLabel required` to
  show a red asterisk hidden from assistive technology; their controls expose
  `aria-required`. Boolean toggles and permission groups allow false/empty values
  and have no required marker. Existing Yup validation behavior is preserved.
  Permission controls share the group error description, register blur events
  and expose the first available module checkbox as the React Hook Form focus target.
  Reset-password inputs are disabled while their mutation is pending.
  Chrome checks verify live login validation in EN/VI; isolated forms with mocked
  CMS responses verify account/submission/password validation, nested role and
  permission errors, message deduplication, permission-error focus and password-reset
  pending/recovery behavior. No real CMS records are written by these checks.
  Scoped ESLint/Stylelint fixes, TypeScript and a Webpack production build pass.
  The default Turbopack build is blocked by worker port-binding restrictions in
  the verification environment.
- Client API mutations use TanStack Query `useMutation`. Success callbacks own
  invalidation, navigation, form resets and session broadcasts; error callbacks
  own notices and server field errors. Forms combine mutation pending state with
  React Hook Form submission state so controls remain busy through awaited
  success work. Table bulk execution clears selection only after success and
  preserves it on failure or publication-confirmation cancellation. Publication
  confirmation remains part of the mutation operation and retries only the
  expected confirmation conflict. Row deletion reuses `useCRUDPage`'s mutation
  and clears its initiating-row indicator in `onSettled`, after invalidation.
  Shared mutation defaults disable retries/offline queuing and immediately remove
  inactive mutations so credential payloads do not remain cached after unmount.
- Detail identity comes from the URL `id`. Forms hydrate once per identity and
  preserve dirty input during background refetches.
- Role detail matrix: Module, Show, Create, Update, Delete, Extra permissions /
  Quyền bổ sung. Default cells are checkboxes; extras are multiple selects.
  Module `defaults` is a typed object with optional `show`, `create`, `update`
  and `delete` permission keys. Definitions omit unavailable actions without
  positional entries or null placeholders. Matrix columns read these named keys
  in a fixed display order; module toggles include all defined values and extras.
  Modules without permissions have an unchecked, disabled module toggle.
  Each Module cell has a labeled checkbox that selects or clears all available
  default and custom permissions for that module, preserving other modules.
  Partial selection shows an indeterminate state; toggling it selects the whole
  module. These checkboxes follow the same read-only/submitting guards as the
  individual permissions, and protected system roles display them checked.
  Each module renders in a memoized `PermissionModuleRow` with a React Hook Form
  subscription computed from only its own permissions. Changing one module does
  not rerender unchanged rows; locale, disabled/submitting state, system-role state
  and form resets still update affected rows. Changes read the latest full form
  value before merging so edits in other modules are preserved.
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
- CMS search trims surrounding whitespace without an application-level character
  limit. The input, URL parsing, CRUD hook and form/API schemas preserve the full
  trimmed search value.
- Empty results have one empty page. Server clamps out-of-range pages; the hook
  synchronizes the URL after deletion. Pagination metadata stays inside `metadata`.

CMS loading states use the shared `LoadingDots` component for session hydration,
list/detail data, role options, sign-in, saving (including password reset) and bulk
actions. Standalone progress text is replaced with dots; localized accessible labels,
busy states and disabled controls remain available. CMS buttons pass
`loading={isSubmitting}` or `loading={executing}` to the shared `Button`; it owns
the dots, inherited text color, busy state and loading-time disabling. Loading dots
replace the original button content while loading; callers retain localized
accessible names through `aria-label`. The optional boolean `loading` prop defaults to
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

`hiddenToolbar` defaults to `false`. Setting it to `true` omits the complete
search/extra-tools/bulk-action toolbar and makes `search`/`onSearch` optional.
The table, loading/empty/error states, retry control and pagination remain visible.
Normal list pages continue requiring search props when the toolbar is shown.

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
- Each row's data cells are memoized separately from its controlled checkbox and
  selected-row background. Selection changes reuse cell content; selection lookups
  use Sets instead of repeated array scans. Accounts, Roles and Submissions keep
  columns and their action callbacks stable across selection changes, while locale,
  URL, permission and loading changes still refresh the affected content. Callers
  must replace changed records/columns rather than mutate them in place; row-index
  changes also invalidate cached cells.
  An isolated Chrome fixture using production React profiling and 100 mocked
  records verified zero cell-renderer calls per selection toggle, down from
  900/600/500 for Submissions/Accounts/Roles. Select-all, disabled rows, row
  highlighting, fetching/deletion guards, URL resets, locale, record replacement
  and reordering were checked without live CMS writes.
- Selection remains controlled by each page. Table memoizes eligible records/keys,
  the selected-key Set, selected records/keys and available bulk actions. Memoized
  row checkboxes receive stable handlers that read the latest committed controlled
  selection; an unchanged checkbox skips rendering. Select All renders when its
  checked, indeterminate, disabled or localized label changes.
  SearchInput and Pagination are memoized; `useCRUDPage` keeps search, filter and
  pagination callbacks stable. Submissions memoizes its filter elements and bulk
  actions; Roles supplies a stable checkbox-eligibility callback. The bulk-action
  dropdown is memoized separately from the selected count and Execute button,
  which still reflect selection immediately. Locale, URL, permissions, action
  options and pending states remain dependencies rather than being ignored by
  custom memo comparators.
  Isolated headless Chrome checks with the real CRUD hook and mocked services
  verify that a second row selection renders only that row's checkbox, while
  unchanged Select All, row content, search/filters, pagination and bulk dropdown
  are skipped. Bulk cancellation/failure preserves selection/action; success
  clears selection. Navigation resets, current-value handlers, locale/permission
  changes and filter/search/pagination interactions were also verified.
- Optional `bulkAction: { action, label, disabled? }[]` and
  `onBulkAction(action, selectedRecords): void | boolean | Promise<void | boolean>`.
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
4. Run `pnpm db:push`, then `pnpm prisma:generate`. Schema files are the development
   source of truth; there are no migration files or database-reset steps.
5. Set `CMS_INITIAL_ADMIN_PASSWORD=worldofmoment`, then run `pnpm cms:seed`.
   Remove the bootstrap password from deployment configuration when no longer needed.
6. Run `pnpm dev` and open `/cms`. Use the normal change-password page to change
   the seeded password. Deploy schema/configuration before exposing the CMS.

Schema synchronization and seeding are explicit setup steps, not runtime startup behavior.
See `contexts/client-auth.md` for provider keys, hosting timezone and hourly cleanup.

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
  coordinates, weather and provenance are read-only in the CMS.
- New public and CMS records
  default to `published` + `need-inspect`. Other states are `unpublished` and
  `invalid`; wire values use the hyphenated `need-inspect` spelling. Public create
  payloads cannot set moderation or provenance. Public content editing is unavailable.
- CMS creation accepts description, coordinates and initial state. Choosing a
  non-default status or validity requires the matching moderation permission.
  Creation fetches weather and leaves `clientUserId` null; a CMS session never
  grants client ownership. The retired `author_uuid` field is absent from storage,
  CMS DTOs and forms. Creation and detail forms show latitude/longitude side by
  side first, followed by description. Creator/source, weather and audit metadata
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
  with `details.nonValidCount`. The UI first counts affected records using loaded
  status/validity plus pending changes, including creation, detail and bulk actions,
  and confirms before sending the mutation. Cancelling this initial confirmation
  sends no mutation and preserves input/selection. If unconfirmed stale client data receives a 409,
  the UI confirms the server's affected count and retries the same mutation. Current rows
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
- CMS submission moderation stamps its actor;
  bulk moderation stamps every affected row. Role/account updates, account role
  assignments, password resets and self-service password changes stamp the same
  transaction. Login/session activity does not stamp record edits. Failed/cancelled
  mutations do not change audit fields. The existing submission `updated_at` column
  is serialized as `updatedAt` for CMS consumers; public field names are retained.
- Lists and details show update time/updater. Created at stays second last before
  centered Actions; both timestamps use `formatDateTime` in browser time zone.
  On mobile, search inputs with extra tools fill a row so filters cannot squeeze
  the text field.
### Public visibility and private history

- Viewport pins and direct thought-detail reads use the same server-side predicate:
  published + valid for everyone; published + any validity for the matching signed-in
  client account. Unpublished records are excluded for everyone and return 404 on
  direct detail access. CMS session identity never changes public ownership.
- Public browsing is open. Client sessions add author visibility; CMS cookies and UUID
  headers confer no public ownership. Personalized GETs use
  private/no-store caching and vary on Accept-Encoding and Cookie while
  retaining Brotli/gzip compression, viewport bounds and date-line handling.
- Public DTOs omit creator/updater names, client ownership IDs and exact timestamps.
  Owner history retains all states and exact creation time, includes status, and
  disables Take me there for unpublished records with a localized explanation.
- Client-account changes cancel obsolete viewport/detail requests and reload positions without
  recreating the map. There is no new realtime polling; normal viewport/submission
  refresh behavior remains in effect.



## Client user management

- `/cms/client-users` owns its Header, columns, selection, filters and shared Table,
  calling `useCRUDPage`. An empty status selection shows all statuses, using the
  localized All statuses placeholder and a clear control, matching Submissions;
  the options contain only actual client statuses. Email search and pagination
  use URL state. `createdAt` is explicitly second last using `formatDateTime`.
- `/cms/client-users/detail` creates without id and displays operational account
  details with `?id=...`. Existing email/password are read-only; status is the only
  editable field. Passwords, credential hashes and session/verification tokens are
  never exposed. The detail includes verification sends/deadline, daily usage,
  suspension state and status audit data.
- Permissions: `clientUser.show/create/delete`, `clientUser.changeStatus`, and
  `clientUser.revokeBan`. Create defaults to unverified; choosing another initial
  state also requires changeStatus. Non-unverified initial states are an explicit
  CMS verification. Initial suspended status counts as one suspension.
- Verification is permanent. A banned account can only be restored through the
  separately guarded revoke-ban action. Manual suspensions count toward banning
  on the third trigger; reapplying an active suspension does not add a strike.
- `updatedAt`/`updatedBy` in client DTOs are the status audit timestamp/CMS user ID;
  null actor means system. DTOs also resolve a current CMS actor display name when
  available. Limiter writes do not change this audit. No event-history table exists.
- APIs: GET/POST `/api/cms/client-users`, GET/PATCH `/api/cms/client-users/[id]`, POST
  `/api/cms/client-users/[id]/revoke-ban` and POST `/api/cms/client-users/bulk-delete`.
  All enforce CMS sessions, exact permissions, client account kind, same-origin
  mutations and the shared pagination envelope. Services live under
  `services/cms/client-users`; UI owns invalidation and confirmations.
- Account deletion preserves thoughts and future messages through nullable
  `clientUserId` relations with `onDelete: SetNull`, and cascades only
  client credentials, sessions and quota state. The retired browser/network blacklist
  module, its permissions and tables are removed. See `contexts/client-auth.md` for
  public authentication, email delivery, limits and hourly expired-account cleanup.
- Address-level verification-email suppression also survives account deletion. It is
  maintained by signed Resend webhooks, does not change CMS status/verification actions,
  and has no CMS editor. The existing verification-send counters retain their semantics;
  DNS/suppression preflight failures consume no send slot.
